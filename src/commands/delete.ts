import { style } from '@crustjs/style'
import { multiselect, confirm } from '@crustjs/prompts'
import { detectGh } from '../lib/github'
import { readConfig, exitNoReposJoined, exitRepoNotFound } from '../lib/config'
import { storeRoot, listLinkedDetailed, unlinkSkill, hasBackup, restoreBackup, type LinkedItem } from '../lib/placer'

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
  await detectGh()

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  if (flags.repo && !config.repos[flags.repo]) exitRepoNotFound(flags.repo)

  let candidates = await listLinkedDetailed()

  if (flags.repo) {
    const storePath = config.repos[flags.repo]!.storePath + '/'
    candidates = candidates.filter((item) => item.resolvedStorePath.startsWith(storePath))
  }

  if (name) {
    candidates = candidates.filter((item) => item.name === name || item.name === `${name}.md`)
  }

  if (candidates.length === 0) {
    process.stderr.write(style.dim('Nothing to delete.\n'))
    process.exit(0)
  }

  // Sort by repo, type, name for visual grouping
  candidates.sort((a, b) => {
    const ra = repoSlugFrom(a)
    const rb = repoSlugFrom(b)
    return ra.localeCompare(rb) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
  })

  let selected: LinkedItem[]

  if (!name && !flags.all) {
    const choices = candidates.map((item) => ({
      label: `${item.name}  ${style.dim(`${item.type} · ${repoSlugFrom(item)}`)}`,
      value: item.targetPath,
    }))
    const picked = await multiselect({ message: 'Select items to remove', choices, default: [] })
    if (!picked || (picked as string[]).length === 0) {
      process.stderr.write(style.dim('Nothing selected.\n'))
      process.exit(0)
    }
    selected = candidates.filter((item) => (picked as string[]).includes(item.targetPath))
  } else {
    selected = candidates
  }

  const ok = await confirm({
    message: `Remove ${selected.length} item${selected.length > 1 ? 's' : ''}?`,
    default: false,
  })
  if (!ok) {
    process.stderr.write(style.dim('Aborted.\n'))
    process.exit(0)
  }

  process.stderr.write('\n')
  let restored = 0

  for (const item of selected) {
    await unlinkSkill(item.targetPath)
    if (await hasBackup(item.targetPath)) {
      await restoreBackup(item.targetPath)
      restored++
      process.stderr.write(style.green('✓') + ` ${item.name}  ${style.dim('backup restored')}\n`)
    } else {
      process.stderr.write(style.green('✓') + ` ${item.name}\n`)
    }
  }

  const summary = restored > 0 ? `, ${restored} backup${restored > 1 ? 's' : ''} restored` : ''
  process.stderr.write('\n' + style.dim(`${selected.length} removed${summary}\n`))
}
