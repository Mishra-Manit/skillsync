import { style } from '@crustjs/style'
import { confirm } from '@crustjs/prompts'
import { rm } from 'fs/promises'
import { detectGh } from '../lib/github'
import { readConfig, removeRepo, exitNoReposJoined, resolveRepo } from '../lib/config'
import { assertSafeStorePath, getOwnedItems, unlinkSkill, hasBackup, restoreBackup } from '../lib/placer'
import { fatal } from '../lib/errors'
import { ui } from '../lib/ui'

export async function runDestroy(arg?: string): Promise<void> {
  detectGh()

  ui.header('destroy')

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  const target = await resolveRepo(config, arg, 'Which repo do you want to destroy?')

  const ok = await confirm({
    message: `Destroy ${target.repo}? Symlinks removed, backups restored, local store deleted.`,
    default: false,
  })
  if (!ok) {
    ui.hint('Aborted.')
    return
  }

  const owned = await getOwnedItems(target.storePath)

  let restored = 0
  try {
    for (const item of owned) {
      await unlinkSkill(item.targetPath)
      if (await hasBackup(item.targetPath)) {
        await restoreBackup(item.targetPath)
        restored++
        ui.success(`${item.name}  ${style.dim('backup restored')}`)
      } else {
        ui.success(`${item.name}  ${style.dim('unlinked')}`)
      }
    }
  } catch {
    fatal('Failed while unlinking symlinks.', 'Some items may already be unlinked. Run `skillsync status` to check.')
  }

  assertSafeStorePath(target.storePath)

  try {
    await rm(target.storePath, { recursive: true, force: true })
  } catch {
    fatal('Failed to delete store directory.', `Remove it manually: rm -rf ${target.storePath}`)
  }

  try {
    await removeRepo(target.repo)
  } catch {
    ui.warn('Failed to update config -- run `skillsync status` to verify.')
  }

  // Offer to delete the GitHub repo
  ui.blank()
  const deleteRemote = await confirm({
    message: `Also delete ${target.repo} on GitHub?`,
    default: false,
  })

  if (deleteRemote) {
    const result = Bun.spawnSync(['gh', 'repo', 'delete', target.repo, '--yes'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (result.success) {
      ui.success(`${target.repo}  ${style.dim('deleted from GitHub')}`)
    } else {
      const detail = result.stderr.toString().trim().split('\n')[0]?.slice(0, 120) ?? ''
      ui.warn(`GitHub deletion failed  ${style.dim(detail)}`)
    }
  }

  ui.blank()

  const parts: string[] = [`${owned.length} item${owned.length === 1 ? '' : 's'} removed`]
  if (restored > 0) parts.push(`${restored} backup${restored === 1 ? '' : 's'} restored`)
  parts.push('store deleted')

  ui.hint(parts.join(', '))
  ui.blank()
}
