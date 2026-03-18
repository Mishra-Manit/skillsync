import { style } from '@crustjs/style'
import { select, confirm } from '@crustjs/prompts'
import { rm } from 'fs/promises'
import { detectGh } from '../lib/github'
import { readConfig, removeRepo, type RepoConfig } from '../lib/config'
import { listLinkedDetailed, unlinkSkill } from '../lib/placer'

async function resolveTarget(repos: Record<string, RepoConfig>, arg?: string): Promise<RepoConfig> {
  if (arg) {
    const entry = repos[arg]
    if (!entry) {
      process.stderr.write(style.red(`✗ Repo "${arg}" is not in your joined repos.\n`))
      process.stderr.write(style.dim('  Run `skillsync status` to see joined repos.\n'))
      process.exit(1)
    }
    return entry
  }

  const entries = Object.values(repos)

  if (entries.length === 1) return entries[0]!

  const choices = entries.map((r) => ({ label: r.repo, value: r.repo }))
  const picked = await select({ message: 'Which repo do you want to leave?', choices })
  return repos[picked as string]!
}

export async function runLeave(arg?: string): Promise<void> {
  await detectGh()

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) {
    process.stderr.write(style.red('✗ No repos joined.\n'))
    process.stderr.write(style.dim('  Run `skillsync join <owner/repo>` first.\n'))
    process.exit(1)
  }

  const target = await resolveTarget(config.repos, arg)

  const ok = await confirm({
    message: `Leave ${target.repo}? Removes all linked items and deletes the local store.`,
    default: false,
  })
  if (!ok) {
    process.stderr.write(style.dim('Aborted.\n'))
    process.exit(0)
  }

  const allLinked = await listLinkedDetailed()
  const storePath = target.storePath.endsWith('/') ? target.storePath : target.storePath + '/'
  const owned = allLinked.filter((item) => item.resolvedStorePath.startsWith(storePath))

  for (const item of owned) {
    await unlinkSkill(item.targetPath)
  }

  await rm(target.storePath, { recursive: true, force: true })
  await removeRepo(target.repo)

  process.stderr.write(
    style.green('✓') +
      ` Left ${style.bold(target.repo)} — ${owned.length} item${owned.length === 1 ? '' : 's'} unlinked, store deleted\n`,
  )
}
