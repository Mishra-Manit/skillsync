import { style } from '@crustjs/style'
import { stat } from 'fs/promises'
import { homedir } from 'os'
import { detectGh } from '../lib/github'
import { readConfig, type RepoConfig } from '../lib/config'
import { listLinkedDetailed, type LinkedItem } from '../lib/placer'
import { ui } from '../lib/ui'

// --- Helpers ---

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return 'unknown'

  const ms = Date.now() - ts
  if (ms < 0) return 'just now'

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function tildePath(fullPath: string): string {
  const home = homedir().replace(/\/$/, '')
  return fullPath.startsWith(home + '/') ? '~' + fullPath.slice(home.length) : fullPath
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const info = await stat(dirPath)
    return info.isDirectory()
  } catch {
    return false
  }
}

function groupLinkedByRepo(
  items: readonly LinkedItem[],
  repos: Record<string, RepoConfig>,
): { grouped: Record<string, LinkedItem[]>; orphaned: LinkedItem[] } {
  const matched = new Set<string>()
  const grouped: Record<string, LinkedItem[]> = {}

  for (const [slug, repo] of Object.entries(repos)) {
    const prefix = repo.storePath.endsWith('/') ? repo.storePath : repo.storePath + '/'
    grouped[slug] = items.filter((item) => {
      const hit = item.resolvedStorePath.startsWith(prefix)
      if (hit) matched.add(item.targetPath)
      return hit
    })
  }

  const orphaned = items.filter((item) => !matched.has(item.targetPath))
  return { grouped, orphaned }
}

function formatItemNames(items: readonly LinkedItem[]): string {
  if (items.length === 0) return style.dim('none')
  return items.map((i) => i.name).join(', ')
}

// --- Repo block ---

async function printRepoBlock(slug: string, repo: RepoConfig, items: readonly LinkedItem[]): Promise<void> {
  const skills = items.filter((i) => i.type === 'skill')
  const agents = items.filter((i) => i.type === 'agent')
  const lastSync = repo.lastSync ? formatRelativeTime(repo.lastSync) : 'never'
  const exists = await directoryExists(repo.storePath)

  ui.blank()
  ui.line(style.bold(slug))
  ui.label('Team', repo.team)
  ui.label('Store', tildePath(repo.storePath))
  ui.label('Last sync', lastSync)
  ui.label(`Skills (${skills.length})`, formatItemNames(skills))
  ui.label(`Agents (${agents.length})`, formatItemNames(agents))

  if (!exists) {
    ui.warn(`Store directory missing -- run \`skillsync join ${slug}\` to re-clone`)
  }
}

// --- Main ---

export async function runStatus(): Promise<void> {
  const { username } = detectGh()

  ui.header('status')

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) {
    ui.blank()
    ui.hint('Not initialized.')
    ui.hint('Run `skillsync join <owner/repo>` or `skillsync create` to get started.')
    ui.blank()
    return
  }

  const allLinked = await listLinkedDetailed()
  const { grouped, orphaned } = groupLinkedByRepo(allLinked, config.repos)
  const repoEntries = Object.entries(config.repos)

  ui.line(`GitHub user: ${style.green('@' + username)}`)
  ui.line(`${repoEntries.length} repo${repoEntries.length === 1 ? '' : 's'} joined:`)

  for (const [slug, repo] of repoEntries) {
    await printRepoBlock(slug, repo, grouped[slug] ?? [])
  }

  if (orphaned.length > 0) {
    ui.blank()
    ui.warn(
      `${orphaned.length} orphaned link${orphaned.length === 1 ? '' : 's'} not matching any joined repo:`,
    )
    for (const item of orphaned) {
      ui.info(`${item.name} ${style.dim(`(${item.type})`)}`)
    }
  }

  ui.blank()
}
