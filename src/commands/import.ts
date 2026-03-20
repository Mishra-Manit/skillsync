import { style } from '@crustjs/style'
import { spinner } from '@crustjs/prompts'
import { stat, readFile, access, cp, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join, basename, resolve } from 'path'
import { fatal } from '../lib/errors'
import { detectGh } from '../lib/github'
import { readConfig, exitNoReposJoined, resolveRepo } from '../lib/config'
import { commitAll, push, GitError } from '../lib/git'
import { linkSkill } from '../lib/placer'
import { parseFrontmatter } from '../lib/discovery'
import { ui } from '../lib/ui'

// --- Helpers ---

async function detectItemType(path: string): Promise<'skill' | 'agent'> {
  let info
  try {
    info = await stat(path) // stat follows symlinks; lstat would misdetect symlink-to-dir
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') fatal(`Path not found: ${path}`)
    throw err
  }

  if (info.isDirectory()) return 'skill'
  if (info.isFile() && path.endsWith('.md')) return 'agent'

  fatal(
    `"${path}" is not a skill directory or agent .md file.`,
    'Skills are directories (optionally containing SKILL.md). Agents are .md files.',
  )
}

function sanitizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/[/\\\0<>:|?*]/g, '')  // strip path/shell-unsafe chars
    .replace(/^\.+/, '')            // no leading dots (hidden files)
    .replace(/-{2,}/g, '-')         // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')        // trim leading/trailing hyphens
}

async function parseName(path: string, itemType: 'skill' | 'agent'): Promise<string> {
  const fallbackName = itemType === 'skill' ? basename(path) : basename(path, '.md')
  const mdPath = itemType === 'skill' ? join(path, 'SKILL.md') : path

  try {
    const content = await readFile(mdPath, 'utf8')
    const fm = parseFrontmatter(content)
    const raw = fm.name || fallbackName
    return sanitizeName(raw) || fallbackName
  } catch {
    return fallbackName
  }
}

async function guardNoDuplicate(dest: string, name: string, repoSlug: string, destDir: string): Promise<void> {
  try {
    await access(dest)
    fatal(
      `"${name}" already exists in ${repoSlug}/${destDir}/.`,
      'Rename the local item or remove the existing one from the repo first.',
    )
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

// --- Main ---

export async function runImport(skillPath: string, flags: { repo?: string }): Promise<void> {
  const { username } = detectGh()

  ui.header('import')
  ui.subheader(`Authenticated as @${username}`)

  const sourcePath = resolve(skillPath)
  const itemType = await detectItemType(sourcePath)
  const name = await parseName(sourcePath, itemType)

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  const target = await resolveRepo(config, flags.repo, 'Which repo should this be added to?')

  const destDir = itemType === 'skill' ? 'skills' : 'agents'
  const dest =
    itemType === 'skill'
      ? join(target.storePath, destDir, name)
      : join(target.storePath, destDir, `${name}.md`)

  await guardNoDuplicate(dest, name, target.repo, destDir)

  await mkdir(join(target.storePath, destDir), { recursive: true })
  await cp(sourcePath, dest, { recursive: itemType === 'skill' })

  const linkTarget =
    itemType === 'skill'
      ? join(homedir(), '.claude', 'skills', name)
      : join(homedir(), '.claude', 'agents', `${name}.md`)

  const linkResult = await linkSkill(dest, linkTarget)

  // Print link result before push so the user sees backup info even on push failure
  ui.blank()
  ui.success(`${name} ${style.dim(`copied into ${target.repo}/${destDir}/`)}`)

  if (linkResult.type === 'linked') {
    ui.success(`Symlink created`)
  } else if (linkResult.type === 'backed-up') {
    ui.warn(`Backed up existing item to .backup/`)
  } else if (linkResult.type === 'skipped' && linkResult.reason === 'collision') {
    ui.info(`Symlink skipped ${style.dim('(collision with another repo)')}`)
  } else if (linkResult.type === 'skipped' && linkResult.reason === 'already-linked') {
    ui.info(`Already linked`)
  }

  try {
    await spinner({
      message: 'Pushing to GitHub...',
      task: async () => {
        commitAll(target.storePath, `[skillsync] @${username} added ${name}`)
        push(target.storePath)
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    const hint = err instanceof GitError
      ? 'The item was copied to the store but the push failed. Run `skillsync sync` to retry.'
      : undefined
    fatal(detail, hint)
  }

  ui.blank()
  ui.hint('Committed and pushed.')
  ui.blank()
}
