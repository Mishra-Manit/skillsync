import { style } from '@crustjs/style'
import { confirm, spinner } from '@crustjs/prompts'
import { readdir, readFile, rm } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { z } from 'zod'
import { fatal } from '../lib/errors'
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
    fatal(`Invalid repo format: "${repo}"`, 'Expected <owner>/<repo>, e.g. acme/acme-skills')
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
    if (err instanceof CloneError) fatal(err.message)
    throw err
  }

  let rawJson: string
  try {
    rawJson = await readFile(join(storePath, 'skillsync.json'), 'utf8')
  } catch {
    fatal('No skillsync.json found in the cloned repo.', 'Is this a valid skillsync team repo?')
  }

  let rawParsed: unknown
  try {
    rawParsed = JSON.parse(rawJson)
  } catch {
    fatal('skillsync.json is not valid JSON.')
  }

  const parsed = skillsyncJsonSchema.safeParse(rawParsed)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ')
    fatal('skillsync.json is invalid:', issues)
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
