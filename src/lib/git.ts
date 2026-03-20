export class CloneError extends Error {
  constructor(repoSlug: string, detail: string) {
    super(`Failed to clone ${repoSlug}: ${detail}`)
    this.name = 'CloneError'
  }
}

export class GitError extends Error {
  constructor(operation: string, detail: string) {
    super(`git ${operation} failed: ${detail}`)
    this.name = 'GitError'
  }
}

export function cloneRepo(repoSlug: string, destPath: string): void {
  const result = Bun.spawnSync(['gh', 'repo', 'clone', repoSlug, destPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new CloneError(repoSlug, result.stderr.toString().trim())
  }
}

export function initRepo(repoPath: string): void {
  const result = Bun.spawnSync(['git', 'init', repoPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new GitError('init', result.stderr.toString().trim())
  }
}

export function addRemote(repoPath: string, url: string): void {
  const result = Bun.spawnSync(['git', 'remote', 'add', 'origin', url], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new GitError('remote add', result.stderr.toString().trim())
  }
}

export function commitAll(repoPath: string, message: string): void {
  const add = Bun.spawnSync(['git', 'add', '-A'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!add.success) {
    throw new GitError('add', add.stderr.toString().trim())
  }

  const commit = Bun.spawnSync(['git', 'commit', '-m', message], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!commit.success) {
    const stderr = commit.stderr.toString().trim()
    if (stderr.includes('nothing to commit')) return
    throw new GitError('commit', stderr)
  }
}

export function push(repoPath: string): void {
  const result = Bun.spawnSync(['git', 'push', '-u', 'origin', 'HEAD'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new GitError('push', result.stderr.toString().trim())
  }
}

export class SyncConflictError extends GitError {
  constructor(detail: string) {
    super('pull --rebase', detail)
    this.name = 'SyncConflictError'
  }
}

export function hasChanges(repoPath: string): boolean {
  const result = Bun.spawnSync(['git', 'status', '--porcelain'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new GitError('status', result.stderr.toString().trim())
  }

  return result.stdout.toString().trim().length > 0
}

export function getDefaultBranch(repoPath: string): string {
  const result = Bun.spawnSync(['git', 'symbolic-ref', 'refs/remotes/origin/HEAD'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) return 'main'

  const ref = result.stdout.toString().trim()
  return ref.replace('refs/remotes/origin/', '')
}

export function pullRebase(repoPath: string): void {
  const branch = getDefaultBranch(repoPath)
  const result = Bun.spawnSync(['git', 'pull', '--rebase', 'origin', branch], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.success) return

  const stderr = result.stderr.toString().trim()

  // Abort the rebase if it's in progress, then throw conflict error
  if (stderr.includes('CONFLICT') || stderr.includes('could not apply')) {
    Bun.spawnSync(['git', 'rebase', '--abort'], {
      cwd: repoPath,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    throw new SyncConflictError(stderr)
  }

  throw new GitError('pull --rebase', stderr)
}

export function getChangedFiles(repoPath: string): string[] {
  // Diff working tree + staged against HEAD (used before committing)
  const result = Bun.spawnSync(['git', 'diff', '--name-only', 'HEAD'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) return []

  return result.stdout
    .toString()
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
}

export function hasRemoteChanges(repoPath: string): boolean {
  const fetchResult = Bun.spawnSync(['git', 'fetch', 'origin'], {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!fetchResult.success) return false

  const branch = getDefaultBranch(repoPath)
  const countResult = Bun.spawnSync(
    ['git', 'rev-list', '--count', `HEAD..origin/${branch}`],
    {
      cwd: repoPath,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )

  if (!countResult.success) return false

  return parseInt(countResult.stdout.toString().trim(), 10) > 0
}
