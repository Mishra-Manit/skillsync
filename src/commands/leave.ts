import { style } from '@crustjs/style'
import { select, confirm } from '@crustjs/prompts'
import { rm } from 'fs/promises'
import { detectGh } from '../lib/github'
import { readConfig, removeRepo, exitNoReposJoined, exitRepoNotFound, type RepoConfig } from '../lib/config'
import { listLinkedDetailed, unlinkSkill } from '../lib/placer'
import { ui } from '../lib/ui'

export async function runLeave(arg?: string): Promise<void> {
  detectGh()

  ui.header('leave')

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  let target: RepoConfig

  if (arg) {
    if (!config.repos[arg]) exitRepoNotFound(arg)
    target = config.repos[arg]
  } else {
    const entries = Object.values(config.repos)
    if (entries.length === 1) {
      target = entries[0]!
    } else {
      const choices = entries.map((r) => ({ label: r.repo, value: r.repo }))
      const picked = await select({ message: 'Which repo do you want to leave?', choices })
      target = config.repos[picked as string]!
    }
  }

  const ok = await confirm({
    message: `Leave ${target.repo}? Removes all linked items and deletes the local store.`,
    default: false,
  })
  if (!ok) {
    ui.hint('Aborted.')
    return
  }

  // Unlink all items owned by this repo
  const allLinked = await listLinkedDetailed()
  const storePath = target.storePath.endsWith('/') ? target.storePath : target.storePath + '/'
  const owned = allLinked.filter((item) => item.resolvedStorePath.startsWith(storePath))

  for (const item of owned) {
    await unlinkSkill(item.targetPath)
  }

  await rm(target.storePath, { recursive: true, force: true })
  await removeRepo(target.repo)

  ui.blank()
  ui.success(
    `Left ${style.bold(target.repo)} -- ${owned.length} item${owned.length === 1 ? '' : 's'} unlinked, store deleted`,
  )
  ui.blank()
}
