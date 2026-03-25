#!/usr/bin/env bun
import { Crust } from '@crustjs/core'
import { helpPlugin, versionPlugin, autoCompletePlugin } from '@crustjs/plugins'
import pkg from '../package.json'
import { runCreate } from './commands/create'
import { runJoin } from './commands/join'
import { runSync } from './commands/sync'
import { runDaemonStart, runDaemonStop, reviveDaemonIfNeeded } from './commands/daemon'
import { runStatus } from './commands/status'
import { runImport } from './commands/import'
import { runCheckGit } from './commands/check-git'
import { runUnlink } from './commands/unlink'
import { runLeave } from './commands/leave'

// Silently revive a dead daemon before any command runs (except `daemon stop`)
const isDaemonStop = process.argv[2] === 'daemon' && process.argv[3] === 'stop'
if (!isDaemonStop) {
  await reviveDaemonIfNeeded()
}

const cli = new Crust('skillsync')
  .meta({ description: 'Share and sync Claude Code agents and skills with your team' })
  .use(versionPlugin(pkg.version))
  .use(autoCompletePlugin({ mode: 'help' }))
  .use(helpPlugin())
  .command('create', (cmd) =>
    cmd.meta({ description: 'Create a shared team skills repo' }).run(runCreate)
  )
  .command('join', (cmd) =>
    cmd
      .meta({ description: 'Join a team skills repo' })
      .args([{ name: 'repo', type: 'string', required: true }] as const)
      .run((ctx) => runJoin(ctx.args.repo))
  )
  .command('sync', (cmd) =>
    cmd
      .meta({ description: 'Pull and push skill updates' })
      .flags({
        repo: { type: 'string', short: 'r', description: 'Target repo (owner/repo)' },
      })
      .run((ctx) => runSync(ctx.flags))
  )
  .command('status', (cmd) =>
    cmd.meta({ description: 'Show current sync state' }).run(runStatus)
  )
  .command('import', (cmd) =>
    cmd
      .meta({ description: 'Interactively import local skills/agents into a joined repo' })
      .run(() => runImport())
  )
  .command('check-git', (cmd) =>
    cmd.meta({ description: 'Check gh CLI version and authentication status' }).run(runCheckGit)
  )
  .command('unlink', (cmd) =>
    cmd
      .meta({ description: 'Remove linked skills or agents from local tool directories' })
      .args([{ name: 'name', type: 'string' }] as const)
      .run((ctx) => runUnlink(ctx.args.name))
  )
  .command('leave', (cmd) =>
    cmd
      .meta({ description: 'Leave a joined team repo and remove all its linked items' })
      .args([{ name: 'repo', type: 'string' }] as const)
      .run((ctx) => runLeave(ctx.args.repo))
  )
  .command('daemon', (cmd) =>
    cmd
      .meta({ description: 'Manage background sync daemon' })
      .command('start', (sub) =>
        sub.meta({ description: 'Start background sync daemon' }).run(runDaemonStart),
      )
      .command('stop', (sub) =>
        sub.meta({ description: 'Stop background sync daemon' }).run(runDaemonStop),
      ),
  )

await cli.execute()
