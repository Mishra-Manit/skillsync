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
