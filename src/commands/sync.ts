import { style } from '@crustjs/style'
import { spinner } from '@crustjs/prompts'
import { detectGh } from '../lib/github'
import { readConfig, exitNoReposJoined, exitRepoNotFound } from '../lib/config'
import { syncRepo, updateLastSync } from '../lib/syncer'
import { ui } from '../lib/ui'

export async function runSync(flags: { repo?: string }): Promise<void> {
  const { username } = detectGh()

  ui.header('sync')
  ui.subheader(`Authenticated as @${username}`)

  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) exitNoReposJoined()

  const slugs = flags.repo ? [flags.repo] : Object.keys(config.repos)

  if (flags.repo && !config.repos[flags.repo]) {
    exitRepoNotFound(flags.repo)
  }

  for (const slug of slugs) {
    const repo = config.repos[slug]!

    const result = await spinner({
      message: `Syncing ${slug}...`,
      task: async () => syncRepo(repo, username),
    })

    if (result.status === 'synced') {
      ui.success(`${slug} ${style.dim('synced')}`)
      await updateLastSync(repo)
    } else if (result.status === 'up-to-date') {
      ui.info(`${slug} ${style.dim('up to date')}`)
    } else if (result.status === 'conflict') {
      ui.error(`${slug} ${style.dim('conflict')}`)
      ui.blank()
      ui.hint('A merge conflict occurred during rebase. The rebase has been aborted.')
      ui.hint(`To resolve manually:`)
      ui.hint(`  cd ${repo.storePath}`)
      ui.hint(`  git pull --rebase origin main`)
      ui.hint(`  # fix conflicts, then: git rebase --continue`)
      ui.hint(`  git push`)
    } else {
      ui.error(`${slug} ${style.dim(result.detail)}`)
    }
  }

  ui.blank()
}
