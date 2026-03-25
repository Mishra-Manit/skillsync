import { style } from '@crustjs/style'
import { confirm, spinner } from '@crustjs/prompts'
import { mkdtemp, rename, rm } from 'fs/promises'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import { fatal } from '../lib/errors'
import { detectGh } from '../lib/github'
import { readConfig, addRepo } from '../lib/config'
import { cloneRepo, CloneError } from '../lib/git'
import { linkAllFromStore } from '../lib/placer'
import { ui } from '../lib/ui'
import { ensureDaemonRunning } from './daemon'

const slugPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

export async function runJoin(repo: string): Promise<void> {
  const { username } = detectGh()

  ui.header('join')
  ui.subheader(`Authenticated as @${username}`)

  if (!slugPattern.test(repo)) {
    fatal(`Invalid repo format: "${repo}"`, 'Expected <owner>/<repo>, e.g. acme/acme-skills')
  }

  const [owner, repoName] = repo.split('/') as [string, string]
  const storePath = join(homedir(), '.skillsync', 'store', owner, repoName)

  // Handle re-join
  const config = await readConfig()
  if (config?.repos[repo]) {
    const reclone = await confirm({
      message: `Already joined ${repo}. Re-clone from scratch?`,
      default: false,
    })
    if (!reclone) {
      ui.hint('Skipped. Already joined.')
      return
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'skillsync-rejoin-'))
    const tempStorePath = join(tempDir, repoName)
    try {
      await spinner({
        message: `Cloning ${repo}...`,
        task: async () => cloneRepo(repo, tempStorePath),
      })
      await rm(storePath, { recursive: true, force: true })
      await rename(tempStorePath, storePath)
    } catch (err) {
      await rm(tempDir, { recursive: true, force: true })
      if (err instanceof CloneError) fatal(err.message)
      throw err
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  } else {
    // Fresh join
    try {
      await spinner({
        message: `Cloning ${repo}...`,
        task: async () => cloneRepo(repo, storePath),
      })
    } catch (err) {
      if (err instanceof CloneError) fatal(err.message)
      throw err
    }
  }

  await addRepo(
    {
      repo,
      team: repoName,
      storePath,
      linkedAt: new Date().toISOString(),
      lastSync: null,
    },
    username,
  )

  // Link all items
  const results = await linkAllFromStore(storePath)

  ui.blank()
  for (const { name, result } of results) {
    if (result.type === 'linked') {
      ui.success(name)
    } else if (result.type === 'backed-up') {
      ui.warn(`${name} ${style.dim('backed up to .backup/')}`)
    } else if (result.type === 'skipped' && result.reason === 'already-linked') {
      ui.info(`${name} ${style.dim('already linked')}`)
    } else {
      ui.warn(`${name} ${style.dim('skipped (name collision from another repo)')}`)
    }
  }

  // Summary
  const linked = results.filter((r) => r.result.type === 'linked').length
  const backedUp = results.filter((r) => r.result.type === 'backed-up').length
  const skipped = results.filter((r) => r.result.type === 'skipped').length

  ui.blank()
  ui.line(
    style.bold(`Joined ${repo}`) +
      style.dim(` -- ${linked} linked, ${backedUp} backed up, ${skipped} skipped`),
  )
  ui.blank()

  await ensureDaemonRunning()
  ui.blank()
}
