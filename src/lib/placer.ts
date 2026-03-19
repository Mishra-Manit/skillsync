import { lstat, readlink, symlink, mkdir, rename, unlink, readdir } from 'fs/promises'
import type { Dirent } from 'fs'
import { homedir } from 'os'
import { join, dirname, basename, isAbsolute } from 'path'

export type LinkedItem = {
  name: string
  type: 'skill' | 'agent'
  targetPath: string
  resolvedStorePath: string
}

export type LinkResult =
  | { type: 'linked' }
  | { type: 'backed-up'; backupPath: string }
  | { type: 'skipped'; reason: 'already-linked' | 'collision' }

export type LinkResultEntry = {
  name: string
  result: LinkResult
}

export const storeRoot = join(homedir(), '.skillsync', 'store') + '/'

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

async function scanDir(dir: string, type: 'skill' | 'agent'): Promise<LinkedItem[]> {
  const items: LinkedItem[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isSymbolicLink()) continue
      const targetPath = join(dir, entry.name)
      try {
        const abs = resolveLink(await readlink(targetPath), targetPath)
        if (!abs.startsWith(storeRoot)) continue
        items.push({ name: entry.name, type, targetPath, resolvedStorePath: abs })
      } catch {
        // skip unreadable entries
      }
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  return items
}

export async function listLinkedDetailed(): Promise<LinkedItem[]> {
  const [skills, agents] = await Promise.all([
    scanDir(join(homedir(), '.claude', 'skills'), 'skill'),
    scanDir(join(homedir(), '.claude', 'agents'), 'agent'),
  ])
  return [...skills, ...agents]
}

export async function hasBackup(targetPath: string): Promise<boolean> {
  try {
    await lstat(join(dirname(targetPath), '.backup', basename(targetPath)))
    return true
  } catch {
    return false
  }
}

export async function restoreBackup(targetPath: string): Promise<'restored' | 'missing'> {
  const backupPath = join(dirname(targetPath), '.backup', basename(targetPath))
  try {
    await rename(backupPath, targetPath)
    return 'restored'
  } catch {
    return 'missing'
  }
}

type ScanEntry = { name: string; srcPath: string }

async function scanStoreDir(
  dir: string,
  filter: (entry: Dirent) => boolean,
): Promise<ScanEntry[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter(filter)
      .map((e) => ({ name: e.name, srcPath: join(dir, e.name) }))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    return []
  }
}

export async function linkAllFromStore(storePath: string): Promise<LinkResultEntry[]> {
  const claudeDir = join(homedir(), '.claude')

  const skills = await scanStoreDir(
    join(storePath, 'skills'),
    (e) => e.isDirectory() && !e.name.startsWith('.'),
  )
  const agents = await scanStoreDir(
    join(storePath, 'agents'),
    (e) => e.isFile() && e.name.endsWith('.md'),
  )

  const link = async (name: string, src: string, dest: string): Promise<LinkResultEntry> => ({
    name,
    result: await linkSkill(src, dest),
  })

  return Promise.all([
    ...skills.map((s) => link(s.name, s.srcPath, join(claudeDir, 'skills', s.name))),
    ...agents.map((a) => link(a.name, a.srcPath, join(claudeDir, 'agents', a.name))),
  ])
}
