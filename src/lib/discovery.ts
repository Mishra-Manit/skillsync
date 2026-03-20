import { readdir, readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { isOwnedSymlink } from './placer'

export type DiscoveredSkill = {
  name: string
  description: string
  sourcePath: string
  type: 'skill' | 'agent'
}

export type Frontmatter = {
  name?: string
  description?: string
}

export function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const result: Frontmatter = {}
  for (const line of match[1]!.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')

    if (key === 'name') result.name = value
    if (key === 'description') result.description = value
  }

  return result
}

async function discoverSkills(): Promise<DiscoveredSkill[]> {
  const skillsDir = join(homedir(), '.claude', 'skills')
  const results: DiscoveredSkill[] = []

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      if (entry.name.startsWith('.')) continue

      const dirPath = join(skillsDir, entry.name)

      // Skip items already managed by skillsync
      if (await isOwnedSymlink(dirPath)) continue

      const skillMdPath = join(dirPath, 'SKILL.md')
      let name = entry.name
      let description = ''

      try {
        const content = await readFile(skillMdPath, 'utf8')
        const fm = parseFrontmatter(content)
        if (fm.name) name = fm.name
        if (fm.description) description = fm.description
      } catch {
        // No SKILL.md or unreadable — use directory name
      }

      results.push({ name, description, sourcePath: dirPath, type: 'skill' })
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  return results
}

async function discoverAgents(): Promise<DiscoveredSkill[]> {
  const agentsDir = join(homedir(), '.claude', 'agents')
  const results: DiscoveredSkill[] = []

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.name.endsWith('.md')) continue
      if (entry.name.startsWith('.')) continue

      const filePath = join(agentsDir, entry.name)

      // Skip items already managed by skillsync
      if (await isOwnedSymlink(filePath)) continue

      const name = entry.name.replace(/\.md$/, '')
      let description = ''

      try {
        const content = await readFile(filePath, 'utf8')
        const fm = parseFrontmatter(content)
        if (fm.description) description = fm.description
      } catch {
        // Unreadable — use filename
      }

      results.push({ name, description, sourcePath: filePath, type: 'agent' })
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  return results
}

export async function discoverLocalSkills(): Promise<DiscoveredSkill[]> {
  const [skills, agents] = await Promise.all([discoverSkills(), discoverAgents()])
  const all = [...skills, ...agents]

  // Deduplicate by (type, name) — first found wins
  const seen = new Set<string>()
  return all.filter((item) => {
    const key = `${item.type}:${item.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
