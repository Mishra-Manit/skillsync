import { style } from '@crustjs/style'
import { multiselect, spinner } from '@crustjs/prompts'
import { access, cp, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { fatal } from '../lib/errors'
import { detectGh, ensureRepoWriteAccess } from '../lib/github'
import { readConfig, exitNoReposJoined, resolveRepo } from '../lib/config'
import { commitAll, push, GitError } from '../lib/git'
import { linkSkill } from '../lib/placer'
import { discoverLocalSkills } from '../lib/discovery'
import { ui } from '../lib/ui'

type ImportPlan = {
  name: string
  sourcePath: string
  type: 'skill' | 'agent'
  destDir: string
  dest: string
  linkTarget: string
}

function sanitizeName(raw: string): string {
  const result = raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[/\\\0<>:|?*]/g, '')
    .replace(/^\.+/, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!result) {
    fatal(
      `Cannot derive a safe name from "${raw}".`,
      'Rename the local skill/agent directory so it contains at least one alphanumeric character.',
    )
  }

  return result
}

function buildChoiceLabel(name: string, type: 'skill' | 'agent'): string {
  const suffix = type === 'agent' ? style.dim(' (agent)') : ''
  return `${name}${suffix}`
}

async function guardNoDuplicate(dest: string, name: string, repoSlug: string, destDir: string): Promise<void> {
  try {
    await access(dest)
    fatal(
      `"${name}" already exists in ${repoSlug}/${destDir}/.`,
      'Rename the local item or remove the existing one from the repo first.',
    )
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

// --- Main ---

export async function runImport(): Promise<void> {
  const { username } = detectGh()

  ui.header('import')
  ui.subheader(`Authenticated as @${username}`)

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  const target = await resolveRepo(config, undefined, 'Which repo should this be imported into?')

  ensureRepoWriteAccess(target.repo)

  const discovered = await discoverLocalSkills()
  if (discovered.length === 0) {
    fatal('No local skills or agents found to import.')
  }

  const items = discovered.map((item) => ({
    ...item,
    name: sanitizeName(item.name),
  }))

  const selectedIndices = await multiselect({
    message: 'Select skills and agents to import',
    choices: items.map((item, i) => ({
      label: buildChoiceLabel(item.name, item.type),
      value: i,
    })),
    default: [],
  }) as number[]

  if (selectedIndices.length === 0) {
    ui.hint('No items selected.')
    ui.blank()
    return
  }

  const home = homedir()
  const plan: ImportPlan[] = selectedIndices.map((i) => {
    const item = items[i]!
    const destDir = item.type === 'skill' ? 'skills' : 'agents'
    const fileName = item.type === 'skill' ? item.name : `${item.name}.md`
    return {
      name: item.name,
      sourcePath: item.sourcePath,
      type: item.type,
      destDir,
      dest: join(target.storePath, destDir, fileName),
      linkTarget: join(home, '.claude', destDir, fileName),
    }
  })

  const seenDests = new Set<string>()
  for (const entry of plan) {
    if (seenDests.has(entry.dest)) {
      fatal(
        `Multiple selected items resolve to the same name: "${entry.name}".`,
        'Rename one of the local items and retry import.',
      )
    }
    seenDests.add(entry.dest)
    await guardNoDuplicate(entry.dest, entry.name, target.repo, entry.destDir)
  }

  ui.blank()

  for (const entry of plan) {
    await mkdir(join(target.storePath, entry.destDir), { recursive: true })
    await cp(entry.sourcePath, entry.dest, { recursive: entry.type === 'skill' })

    const linkResult = await linkSkill(entry.dest, entry.linkTarget)

    ui.success(`${entry.name} ${style.dim(`copied into ${target.repo}/${entry.destDir}/`)}`)

    if (linkResult.type === 'linked') {
      ui.success(`${entry.name} ${style.dim('symlink created')}`)
    } else if (linkResult.type === 'backed-up') {
      ui.warn(`${entry.name} ${style.dim('backed up existing item to .backup/')}`)
    } else if (linkResult.type === 'skipped' && linkResult.reason === 'collision') {
      ui.info(`${entry.name} ${style.dim('symlink skipped (collision with another repo)')}`)
    } else if (linkResult.type === 'skipped' && linkResult.reason === 'already-linked') {
      ui.info(`${entry.name} ${style.dim('already linked')}`)
    }
  }

  const names = plan.map((e) => e.name).join(', ')

  try {
    await spinner({
      message: 'Committing and pushing to GitHub...',
      task: async () => {
        commitAll(target.storePath, `[skillsync] @${username} added ${names}`)
        push(target.storePath)
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    const hint = err instanceof GitError
      ? 'Items were copied to the store but sync to GitHub failed. Run `skillsync sync` to retry.'
      : undefined
    fatal(detail, hint)
  }

  ui.blank()
  ui.hint(`Committed and pushed ${plan.length} item${plan.length === 1 ? '' : 's'}.`)
  ui.blank()
}
