import { style } from '@crustjs/style'
import { input, select, multiselect, spinner } from '@crustjs/prompts'
import { access, mkdir, writeFile, cp } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { fatal } from '../lib/errors'
import { detectGh, createRepo, inviteCollaborator } from '../lib/github'
import { initRepo, addRemote, GitError, commitAll, push } from '../lib/git'
import { addRepo } from '../lib/config'
import { discoverLocalSkills } from '../lib/discovery'
import { linkAllFromStore } from '../lib/placer'
import { ui } from '../lib/ui'
import { ensureDaemonRunning } from './daemon'

const teamNamePattern = /^[a-z0-9-]+$/

// --- Template builders ---

function buildReadme(teamName: string, repoSlug: string): string {
  return [
    `# ${teamName}`,
    '',
    'Shared Claude Code skills and agents managed by [skillsync](https://github.com/manitmishra/skillsync).',
    '',
    '## Join this team',
    '',
    '```bash',
    `npx @manitmishra/skillsync join ${repoSlug}`,
    '```',
    '',
    '## Sync updates',
    '',
    '```bash',
    'npx @manitmishra/skillsync sync',
    '```',
    '',
  ].join('\n')
}

// --- Seed the cloned repo with initial structure ---

async function seedRepo(storePath: string, teamName: string, repoSlug: string): Promise<void> {
  await mkdir(join(storePath, 'skills'), { recursive: true })
  await mkdir(join(storePath, 'agents'), { recursive: true })

  await writeFile(join(storePath, 'README.md'), buildReadme(teamName, repoSlug))
}

// --- Prompts ---

async function promptTeamName(): Promise<string> {
  const name = await input({
    message: 'Team name',
    placeholder: 'my-team-skills',
    validate: (v) => {
      if (!v.trim()) return 'Team name is required'
      if (!teamNamePattern.test(v.trim())) return 'Use lowercase letters, numbers, and hyphens only'
      return true
    },
  })
  return name.trim()
}

async function promptOrg(): Promise<string> {
  const org = await input({
    message: 'GitHub org (blank for personal account)',
    placeholder: '',
  })
  return org.trim()
}

async function promptVisibility(): Promise<'private' | 'public'> {
  ui.hint('Only people with access to the repo can join your team.')
  ui.hint('Public repos let anyone use these skills.')
  ui.blank()

  return await select({
    message: 'Visibility',
    choices: [
      { label: 'Private', value: 'private' as const, hint: 'recommended -- team members only' },
      { label: 'Public', value: 'public' as const, hint: 'anyone can clone and use these skills' },
    ],
    default: 'private' as const,
  })
}

async function promptInvites(repoSlug: string): Promise<void> {
  const raw = await input({
    message: 'Invite teammates (GitHub usernames, comma-separated, blank to skip)',
    placeholder: '',
  })

  const usernames = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  if (usernames.length === 0) return

  ui.blank()
  for (const target of usernames) {
    const { result, detail } = inviteCollaborator(repoSlug, target)

    if (result === 'invited') {
      ui.success(target)
    } else if (result === 'already-member') {
      ui.info(`${target} ${style.dim('already a member')}`)
    } else {
      const summary = (detail ?? 'invite failed').split('\n')[0]!.slice(0, 120)
      ui.error(`${target} ${style.dim(summary)}`)
    }
  }
}

async function promptAndCopySkills(storePath: string): Promise<number> {
  const discovered = await discoverLocalSkills()
  if (discovered.length === 0) return 0

  const skillCount = discovered.filter((d) => d.type === 'skill').length
  const agentCount = discovered.filter((d) => d.type === 'agent').length

  const parts: string[] = []
  if (skillCount > 0) parts.push(`${skillCount} skill${skillCount !== 1 ? 's' : ''}`)
  if (agentCount > 0) parts.push(`${agentCount} agent${agentCount !== 1 ? 's' : ''}`)

  ui.blank()
  ui.hint(`Found ${parts.join(' and ')} on your machine.`)

  const choices = discovered.map((item) => {
    const suffix = item.type === 'agent' ? style.dim(' (agent)') : ''
    const desc = item.description ? style.dim(`  ${item.description}`) : ''
    return { label: `${item.name}${suffix}${desc}`, value: item.name }
  })

  const selected = (await multiselect({
    message: 'Select items to share with the team',
    choices,
    default: [],
  })) as string[]

  if (selected.length === 0) return 0

  const selectedItems = discovered.filter((d) => selected.includes(d.name))

  for (const item of selectedItems) {
    const destDir = item.type === 'skill' ? 'skills' : 'agents'
    const dest =
      item.type === 'skill'
        ? join(storePath, destDir, item.name)
        : join(storePath, destDir, `${item.name}.md`)

    await cp(item.sourcePath, dest, { recursive: item.type === 'skill' })
  }

  return selectedItems.length
}

// --- Main ---

export async function runCreate(): Promise<void> {
  const { username } = detectGh()

  ui.header('create')
  ui.subheader(`Authenticated as @${username}`)

  const teamName = await promptTeamName()
  const org = await promptOrg()
  const visibility = await promptVisibility()

  const owner = org || username
  const slug = `${owner}/${teamName}`
  const storePath = join(homedir(), '.skillsync', 'store', owner, teamName)

  // Guard against existing store path
  try {
    await access(storePath)
    fatal(
      `Store path already exists: ${storePath}`,
      'A repo with this name may already be joined. Run `skillsync status` to check.',
    )
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  // Create repo on GitHub, then initialize locally and set remote
  let repoSlug: string
  try {
    repoSlug = (await spinner({
      message: `Creating ${slug}...`,
      task: async () => {
        const { slug: created, url } = createRepo(teamName, org || undefined, visibility)
        initRepo(storePath)
        addRemote(storePath, url)
        return created
      },
    })) as string
  } catch (err) {
    if (err instanceof GitError) {
      fatal(
        err.message,
        `The repo may have been created on GitHub. Delete it with \`gh repo delete ${slug}\` if needed.`,
      )
    }
    throw err
  }

  await seedRepo(storePath, teamName, repoSlug)
  await promptInvites(repoSlug)
  const copied = await promptAndCopySkills(storePath)

  // Commit and push
  try {
    await spinner({
      message: 'Pushing to GitHub...',
      task: async () => {
        commitAll(storePath, `[skillsync] @${username} initialized ${teamName}`)
        push(storePath)
      },
    })
  } catch (err) {
    fatal('Failed to push to GitHub.', err instanceof Error ? err.message : String(err))
  }

  await addRepo(
    {
      repo: repoSlug,
      team: teamName,
      storePath,
      linkedAt: new Date().toISOString(),
      lastSync: null,
    },
    username,
  )

  // Link shared items locally so they appear in delete/status
  if (copied > 0) {
    const results = await linkAllFromStore(storePath)
    ui.blank()
    for (const { name, result } of results) {
      if (result.type === 'linked') {
        ui.success(name)
      } else if (result.type === 'backed-up') {
        ui.warn(`${name}  ${style.dim('backed up to .backup/')}`)
      }
    }
  }

  // Share the join command
  const joinCmd = `npx @manitmishra/skillsync join ${repoSlug}`
  ui.blank()
  ui.line(style.bold('Share this command with your team:'))
  ui.blank()
  ui.line(style.green(`  ${joinCmd}`))
  ui.blank()

  const summary =
    copied > 0
      ? `Created ${repoSlug} with ${copied} shared item${copied !== 1 ? 's' : ''}.`
      : `Created ${repoSlug}.`
  ui.hint(summary)
  ui.blank()

  await ensureDaemonRunning()
  ui.blank()
}
