import { style } from '@crustjs/style'
import { multiselect, confirm } from '@crustjs/prompts'
import { detectGh } from '../lib/github'
import { readConfig, exitNoReposJoined, exitRepoNotFound } from '../lib/config'
import { storeRoot, listLinkedDetailed, unlinkSkill, hasBackup, restoreBackup, type LinkedItem } from '../lib/placer'
import { ui } from '../lib/ui'

type DeleteFlags = {
  repo?: string
  all: boolean
}

function repoSlugFrom(item: LinkedItem): string {
  const rel = item.resolvedStorePath.slice(storeRoot.length)
  const parts = rel.split('/')
  return `${parts[0]}/${parts[1]}`
}

export async function runDelete(name: string | undefined, flags: DeleteFlags): Promise<void> {
  detectGh()

  ui.header('delete')

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()
  if (flags.repo && !config.repos[flags.repo]) exitRepoNotFound(flags.repo)

  // Build candidate list
  let candidates = await listLinkedDetailed()

  if (flags.repo) {
    const storePath = config.repos[flags.repo]!.storePath + '/'
    candidates = candidates.filter((item) => item.resolvedStorePath.startsWith(storePath))
  }

  if (name) {
    candidates = candidates.filter((item) => item.name === name || item.name === `${name}.md`)
  }

  if (candidates.length === 0) {
    ui.hint('Nothing to delete.')
    return
  }

  // Sort by repo, type, name
  candidates.sort((a, b) => {
    const ra = repoSlugFrom(a)
    const rb = repoSlugFrom(b)
    return ra.localeCompare(rb) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
  })

  // Select items
  let selected: LinkedItem[]

  if (!name && !flags.all) {
    const choices = candidates.map((item) => ({
      label: `${item.name}  ${style.dim(`${item.type} | ${repoSlugFrom(item)}`)}`,
      value: item.targetPath,
    }))
    const picked = (await multiselect({ message: 'Select items to remove', choices, default: [] })) as string[]
    if (picked.length === 0) {
      ui.hint('Nothing selected.')
      return
    }
    selected = candidates.filter((item) => picked.includes(item.targetPath))
  } else {
    selected = candidates
  }

  // Confirm
  const ok = await confirm({
    message: `Remove ${selected.length} item${selected.length > 1 ? 's' : ''}?`,
    default: false,
  })
  if (!ok) {
    ui.hint('Aborted.')
    return
  }

  // Delete and restore backups
  ui.blank()
  let restored = 0

  for (const item of selected) {
    await unlinkSkill(item.targetPath)
    if (await hasBackup(item.targetPath)) {
      await restoreBackup(item.targetPath)
      restored++
      ui.success(`${item.name}  ${style.dim('backup restored')}`)
    } else {
      ui.success(item.name)
    }
  }

  const summary = restored > 0 ? `, ${restored} backup${restored > 1 ? 's' : ''} restored` : ''
  ui.blank()
  ui.hint(`${selected.length} removed${summary}`)
  ui.blank()
}
