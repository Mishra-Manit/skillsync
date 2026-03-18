#!/usr/bin/env node
import { Command } from 'commander'
import { runCreate } from './commands/create'
import { runJoin } from './commands/join'
import { runSync } from './commands/sync'
import { runStatus } from './commands/status'
import { runImport } from './commands/import'

const program = new Command()

program
  .name('skillsync')
  .description('Share and sync Claude Code agents and skills with your team')
  .version('0.1.0')

program
  .command('create')
  .description('Create a shared team skills repo')
  .action(runCreate)

program
  .command('join')
  .argument('<owner/repo>', 'GitHub repo to join (e.g. acme/acme-skills)')
  .description('Join a team skills repo')
  .action(runJoin)

program
  .command('sync')
  .description('Pull and push skill updates')
  .action(runSync)

program
  .command('status')
  .description('Show current sync state')
  .action(runStatus)

program
  .command('import')
  .argument('<path>', 'Path to a local skill or agent directory')
  .description('Import a local skill into the team repo')
  .action(runImport)

program.parse()
