import { style } from '@crustjs/style'
import { confirm } from '@crustjs/prompts'
import { rm } from 'fs/promises'
import { detectGh } from '../lib/github'
import { readConfig, removeRepo, exitNoReposJoined, resolveRepo } from '../lib/config'
import { assertSafeStorePath, getOwnedItems, unlinkSkill } from '../lib/placer'
import { ui } from '../lib/ui'

export async function runLeave(arg?: string): Promise<void> {
  detectGh()

  ui.header('leave')

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  const target = await resolveRepo(config, arg, 'Which repo do you want to leave?')

  const ok = await confirm({
    message: `Leave ${target.repo}? Removes all linked items and deletes the local store.`,
    default: false,
  })
  if (!ok) {
    ui.hint('Aborted.')
    return
  }

  const owned = await getOwnedItems(target.storePath)

  for (const item of owned) {
    await unlinkSkill(item.targetPath)
  }

  assertSafeStorePath(target.storePath)
  await rm(target.storePath, { recursive: true, force: true })
  await removeRepo(target.repo)

  ui.blank()
  ui.success(
    `Left ${style.bold(target.repo)} -- ${owned.length} item${owned.length === 1 ? '' : 's'} unlinked, store deleted`,
  )
  ui.blank()
}
