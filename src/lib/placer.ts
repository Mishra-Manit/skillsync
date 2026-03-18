import { lstat, readlink, symlink, mkdir, rename, unlink, readdir } from 'fs/promises'
import { homedir } from 'os'
import { join, dirname, basename, isAbsolute } from 'path'

type LinkResult =
  | { type: 'linked' }
  | { type: 'backed-up'; backupPath: string }
  | { type: 'skipped'; reason: 'already-linked' | 'collision' }

const storeRoot = join(homedir(), '.skillsync', 'store') + '/'

function resolveLink(raw: string, context: string): string {
  return isAbsolute(raw) ? raw : join(dirname(context), raw)
}

export async function isOwnedSymlink(targetPath: string): Promise<boolean> {
  try {
    const stat = await lstat(targetPath)
    if (!stat.isSymbolicLink()) return false
    const abs = resolveLink(await readlink(targetPath), targetPath)
    return abs.startsWith(storeRoot)
  } catch {
    return false
  }
}

export async function linkSkill(storePath: string, targetPath: string): Promise<LinkResult> {
  try {
    const stat = await lstat(targetPath)

    if (stat.isSymbolicLink()) {
      const abs = resolveLink(await readlink(targetPath), targetPath)
      if (abs === storePath) {
        return { type: 'skipped', reason: 'already-linked' }
      }
      // Any symlink not pointing to exactly our storePath is a collision — never clobber
      return { type: 'skipped', reason: 'collision' }
    }

    // Real file or directory — back it up then link
    const backupPath = join(dirname(targetPath), '.backup', basename(targetPath))
    await mkdir(dirname(backupPath), { recursive: true })
    await rename(targetPath, backupPath)
    await symlink(storePath, targetPath)
    return { type: 'backed-up', backupPath }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await mkdir(dirname(targetPath), { recursive: true })
      await symlink(storePath, targetPath)
      return { type: 'linked' }
    }
    throw err
  }
}

export async function unlinkSkill(targetPath: string): Promise<void> {
  if (await isOwnedSymlink(targetPath)) {
    await unlink(targetPath)
  }
}

export async function listLinked(): Promise<string[]> {
  const dirs = [
    join(homedir(), '.claude', 'skills'),
    join(homedir(), '.claude', 'agents'),
  ]
  const linked: string[] = []
  for (const dir of dirs) {
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        if (await isOwnedSymlink(fullPath)) {
          linked.push(fullPath)
        }
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }
  return linked
}
