import { createStore } from '@crustjs/store'
import { homedir } from 'os'
import { join } from 'path'
import { fatal } from './errors'

export type RepoConfig = {
  repo: string
  team: string
  storePath: string
  linkedAt: string
  lastSync: string | null
}

export type Config = {
  username: string
  repos: Record<string, RepoConfig>
}

export class NeedsRepoSelectError extends Error {
  readonly entries: RepoConfig[]

  constructor(entries: RepoConfig[]) {
    super('Multiple repos joined — selection required')
    this.name = 'NeedsRepoSelectError'
    this.entries = entries
  }
}

const store = createStore({
  dirPath: join(homedir(), '.skillsync'),
  fields: {
    username: { type: 'string', default: '' },
    repos: { type: 'string', default: '{}' },
  },
})

export async function readConfig(): Promise<Config | null> {
  try {
    const raw = await store.read()
    return {
      username: raw.username,
      repos: JSON.parse(raw.repos) as Record<string, RepoConfig>,
    }
  } catch {
    return null
  }
}

export async function writeConfig(config: Config): Promise<void> {
  await store.write({
    username: config.username,
    repos: JSON.stringify(config.repos),
  })
}

export async function addRepo(entry: RepoConfig, username?: string): Promise<void> {
  const config = (await readConfig()) ?? { username: '', repos: {} }
  await writeConfig({
    username: username ?? config.username,
    repos: { ...config.repos, [entry.repo]: entry },
  })
}

export async function removeRepo(slug: string): Promise<void> {
  const config = await readConfig()
  if (!config) return
  const rest = Object.fromEntries(
    Object.entries(config.repos).filter(([repo]) => repo !== slug)
  )
  await writeConfig({ ...config, repos: rest })
}

export function exitNoReposJoined(): never {
  fatal('No repos joined.', 'Run `skillsync join <owner/repo>` or `skillsync create` first.')
}

export function exitRepoNotFound(slug: string): never {
  fatal(`Repo "${slug}" is not in your joined repos.`, 'Run `skillsync status` to see joined repos.')
}

export function resolveRepo(config: Config, flag?: string): RepoConfig {
  if (flag) {
    const entry = config.repos[flag]
    if (!entry) exitRepoNotFound(flag)
    return entry
  }

  const entries = Object.values(config.repos)

  if (entries.length === 0) exitNoReposJoined()

  if (entries.length === 1) return entries[0]!

  throw new NeedsRepoSelectError(entries)
}

export function resolveSyncRepos(config: Config, flag?: string): RepoConfig[] {
  if (flag) {
    const entry = config.repos[flag]
    if (!entry) exitRepoNotFound(flag)
    return [entry]
  }

  const entries = Object.values(config.repos)
  if (entries.length === 0) exitNoReposJoined()
  return entries
}
