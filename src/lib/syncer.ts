import type { RepoConfig } from './config'
import { readConfig, writeConfig } from './config'
import {
  hasChanges,
  commitAll,
  pullRebase,
  push,
  getChangedFiles,
  hasRemoteChanges,
  SyncConflictError,
  GitError,
} from './git'

export type SyncResult =
  | { status: 'up-to-date' }
  | { status: 'synced' }
  | { status: 'conflict'; detail: string }
  | { status: 'error'; detail: string }

export function buildCommitMessage(username: string, repoPath: string): string {
  // getChangedFiles diffs working tree against HEAD -- called before commitAll
  const files = getChangedFiles(repoPath)

  const names = files
    .map((f) => {
      const parts = f.split('/')
      if (parts[0] === 'skills' && parts[1]) return parts[1]
      if (parts[0] === 'agents' && parts[1]) return parts[1].replace(/\.md$/, '')
      return null
    })
    .filter((n): n is string => n !== null)

  const unique = [...new Set(names)]

  if (unique.length === 0) return `[skillsync] @${username} updated skills`
  if (unique.length === 1) return `[skillsync] @${username} updated ${unique[0]}`
  return `[skillsync] @${username} updated ${unique.join(', ')}`
}

export function syncRepo(repo: RepoConfig, username: string): SyncResult {
  try {
    const hadLocal = hasChanges(repo.storePath)

    if (hadLocal) {
      commitAll(repo.storePath, buildCommitMessage(username, repo.storePath))
    }

    const hadRemote = hasRemoteChanges(repo.storePath)

    pullRebase(repo.storePath)

    // Only push when there were local changes to share
    if (hadLocal) {
      push(repo.storePath)
    }

    if (hadLocal || hadRemote) return { status: 'synced' }
    return { status: 'up-to-date' }
  } catch (err) {
    if (err instanceof SyncConflictError) {
      return { status: 'conflict', detail: err.message }
    }
    if (err instanceof GitError) {
      return { status: 'error', detail: err.message }
    }
    return { status: 'error', detail: err instanceof Error ? err.message : String(err) }
  }
}

export async function updateLastSync(repo: RepoConfig): Promise<void> {
  const config = await readConfig()
  if (!config) return

  // Guard: repo may have been removed by a concurrent `leave` command
  if (!config.repos[repo.repo]) return

  await writeConfig({
    ...config,
    repos: {
      ...config.repos,
      [repo.repo]: { ...config.repos[repo.repo], lastSync: new Date().toISOString() },
    },
  })
}
