import { watch } from 'chokidar'
import { homedir } from 'os'
import { join } from 'path'
import { readConfig } from './config'
import { hasChanges, hasRemoteChanges } from './git'
import { syncRepo, updateLastSync } from './syncer'
import { linkAllFromStore, cleanDanglingLinks } from './placer'

export type WatcherHandle = {
  stop: () => void
}

const DEBOUNCE_MS = 10000
const POLL_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const STORE_ROOT = join(homedir(), '.skillsync', 'store')

function extractRepoSlug(filePath: string): string | null {
  if (!filePath.startsWith(STORE_ROOT)) return null

  const relative = filePath.slice(STORE_ROOT.length + 1)
  const parts = relative.split('/')

  if (parts.length < 2) return null
  return `${parts[0]}/${parts[1]}`
}

export function startWatcher(
  username: string,
  log: (msg: string) => void,
): WatcherHandle {
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const syncing = new Set<string>()

  async function syncSlug(slug: string, trigger: string): Promise<void> {
    if (syncing.has(slug)) return
    syncing.add(slug)

    try {
      const config = await readConfig()
      if (!config) return

      const repo = config.repos[slug]
      if (!repo) return

      log(`[${trigger}] syncing ${slug}`)
      const result = syncRepo(repo, username)

      if (result.status === 'synced') {
        await updateLastSync(repo)
        await linkAllFromStore(repo.storePath)
        await cleanDanglingLinks()
        log(`[${trigger}] ${slug} synced`)
      } else if (result.status === 'up-to-date') {
        log(`[${trigger}] ${slug} up to date`)
      } else if (result.status === 'conflict') {
        log(`[${trigger}] ${slug} CONFLICT -- resolve manually`)
      } else {
        log(`[${trigger}] ${slug} error: ${result.detail}`)
      }
    } catch (err) {
      log(`[${trigger}] ${slug} error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      syncing.delete(slug)
    }
  }

  // File watcher for local changes
  const watcher = watch(STORE_ROOT, {
    ignored: /(^|[/\\])\.git([/\\]|$)/,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  })

  watcher.on('all', (_event, filePath) => {
    const slug = extractRepoSlug(filePath)
    if (!slug) return

    // Debounce per repo
    const existing = debounceTimers.get(slug)
    if (existing) clearTimeout(existing)

    debounceTimers.set(
      slug,
      setTimeout(async () => {
        debounceTimers.delete(slug)
        const config = await readConfig()
        if (!config) return
        const repo = config.repos[slug]
        if (!repo) return
        if (!hasChanges(repo.storePath)) return
        syncSlug(slug, 'watch')
      }, DEBOUNCE_MS),
    )
  })

  // Poll loop for remote changes
  const pollInterval = setInterval(async () => {
    try {
      const config = await readConfig()
      if (!config) return

      for (const [slug, repo] of Object.entries(config.repos)) {
        try {
          if (hasRemoteChanges(repo.storePath)) {
            await syncSlug(slug, 'poll')
          }
        } catch {
          // skip this repo this cycle
        }
      }
    } catch {
      // skip this cycle
    }
  }, POLL_INTERVAL_MS)

  function stop(): void {
    watcher.close()
    clearInterval(pollInterval)
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer)
    }
    debounceTimers.clear()
  }

  return { stop }
}
