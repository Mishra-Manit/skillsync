import { style } from '@crustjs/style'
import { confirm, spinner } from '@crustjs/prompts'
import { readdir, readFile, rm } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { z } from 'zod'
import { detectGh } from '../lib/github'
import { readConfig, addRepo } from '../lib/config'
import { cloneRepo, CloneError } from '../lib/git'
import { linkSkill } from '../lib/placer'

const slugPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

const skillsyncJsonSchema = z.object({
  team: z.object({ name: z.string(), repo: z.string() }),
  sync: z
    .object({ interval: z.number().optional(), strategy: z.string().optional() })
    .optional(),
  targets: z.object({ claude: z.boolean().optional() }).optional(),
})

export async function runJoin(repo: string): Promise<void> {
  const { username } = await detectGh()

  if (!slugPattern.test(repo)) {
    process.stderr.write(
      style.red(`✗ Invalid repo format: "${repo}"\n`) +
        style.dim('  Expected <owner>/<repo>, e.g. acme/acme-skills\n'),
    )
    process.exit(1)
  }

  const [owner, repoName] = repo.split('/') as [string, string]
  const storePath = join(homedir(), '.skillsync', 'store', owner, repoName)

  const config = await readConfig()
  if (config?.repos[repo]) {
    const reclone = await confirm({
      message: `Already joined ${repo}. Re-clone from scratch?`,
      default: false,
    })
    if (!reclone) {
      process.stderr.write(style.dim('Skipped. Already joined.\n'))
      process.exit(0)
    }
    // Remove existing store directory so gh repo clone has a clean target
    await rm(storePath, { recursive: true, force: true })
  }

  try {
    await spinner({
      message: `Cloning ${repo}...`,
      task: async () => {
        await cloneRepo(repo, storePath)
      },
    })
  } catch (err) {
    if (err instanceof CloneError) {
      process.stderr.write(style.red(`✗ ${err.message}\n`))
      process.exit(1)
    }
    throw err
  }

  let rawJson: string
  try {
    rawJson = await readFile(join(storePath, 'skillsync.json'), 'utf8')
  } catch {
    process.stderr.write(
      style.red('✗ No skillsync.json found in the cloned repo.\n') +
        style.dim('  Is this a valid skillsync team repo?\n'),
    )
    process.exit(1)
  }

  let rawParsed: unknown
  try {
    rawParsed = JSON.parse(rawJson)
  } catch {
    process.stderr.write(style.red('✗ skillsync.json is not valid JSON.\n'))
    process.exit(1)
  }

  const parsed = skillsyncJsonSchema.safeParse(rawParsed)
  if (!parsed.success) {
    process.stderr.write(
      style.red('✗ skillsync.json is invalid:\n') +
        parsed.error.issues
          .map((i) => style.dim(`  ${i.path.join('.')}: ${i.message}`))
          .join('\n') +
        '\n',
    )
    process.exit(1)
  }

  await addRepo(
    {
      repo,
      team: parsed.data.team.name,
      storePath,
      linkedAt: new Date().toISOString(),
      lastSync: null,
    },
    username,
  )

  const results: Array<{ name: string; result: Awaited<ReturnType<typeof linkSkill>> }> = []

  // Link skills (subdirectories of <storePath>/skills/)
  const skillsDir = join(storePath, 'skills')
  try {
    const skillEntries = await readdir(skillsDir, { withFileTypes: true })
    for (const entry of skillEntries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const src = join(skillsDir, entry.name)
      const dest = join(homedir(), '.claude', 'skills', entry.name)
      results.push({ name: entry.name, result: await linkSkill(src, dest) })
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  // Link agents (.md files in <storePath>/agents/)
  const agentsDir = join(storePath, 'agents')
  try {
    const agentEntries = await readdir(agentsDir, { withFileTypes: true })
    for (const entry of agentEntries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const src = join(agentsDir, entry.name)
      const dest = join(homedir(), '.claude', 'agents', entry.name)
      results.push({ name: entry.name, result: await linkSkill(src, dest) })
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  // Print per-item results
  process.stderr.write('\n')
  for (const { name, result } of results) {
    if (result.type === 'linked') {
      process.stderr.write(style.green('✓') + ` ${name}\n`)
    } else if (result.type === 'backed-up') {
      process.stderr.write(style.yellow('! backed up → .backup/') + ` ${name}\n`)
    } else if (result.type === 'skipped' && result.reason === 'already-linked') {
      process.stderr.write(style.dim(`– already linked: ${name}\n`))
    } else {
      process.stderr.write(style.yellow(`! skipped (name collision from another repo): ${name}\n`))
    }
  }

  const linked = results.filter((r) => r.result.type === 'linked').length
  const backedUp = results.filter((r) => r.result.type === 'backed-up').length
  const skipped = results.filter((r) => r.result.type === 'skipped').length

  process.stderr.write(
    '\n' +
      style.bold(`Joined ${repo}`) +
      style.dim(` — ${linked} linked, ${backedUp} backed up, ${skipped} skipped\n`),
  )
}
