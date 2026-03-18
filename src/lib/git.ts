import simpleGit, { type SimpleGit } from 'simple-git'

export class CloneError extends Error {
  constructor(repoSlug: string, detail: string) {
    super(`Failed to clone ${repoSlug}: ${detail}`)
    this.name = 'CloneError'
  }
}

export async function cloneRepo(repoSlug: string, destPath: string): Promise<SimpleGit> {
  const result = Bun.spawnSync(['gh', 'repo', 'clone', repoSlug, destPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!result.success) {
    throw new CloneError(repoSlug, result.stderr.toString().trim())
  }

  return simpleGit(destPath)
}
