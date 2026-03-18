#!/usr/bin/env bun
import { Crust } from '@crustjs/core'
import { runCreate } from './commands/create'
import { runJoin } from './commands/join'
import { runSync } from './commands/sync'
import { runStatus } from './commands/status'
import { runImport } from './commands/import'

const cli = new Crust('skillsync')
  .meta({ description: 'Share and sync Claude Code agents and skills with your team' })
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
    cmd.meta({ description: 'Pull and push skill updates' }).run(runSync)
  )
  .command('status', (cmd) =>
    cmd.meta({ description: 'Show current sync state' }).run(runStatus)
  )
  .command('import', (cmd) =>
    cmd
      .meta({ description: 'Import a local skill into the team repo' })
      .args([{ name: 'path', type: 'string', required: true }] as const)
      .run((ctx) => runImport(ctx.args.path))
  )

await cli.execute()
