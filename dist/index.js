#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const create_1 = require("./commands/create");
const join_1 = require("./commands/join");
const sync_1 = require("./commands/sync");
const status_1 = require("./commands/status");
const import_1 = require("./commands/import");
const program = new commander_1.Command();
program
    .name('skillsync')
    .description('Share and sync Claude Code agents and skills with your team')
    .version('0.1.0');
program
    .command('create')
    .description('Create a shared team skills repo')
    .action(create_1.runCreate);
program
    .command('join')
    .argument('<owner/repo>', 'GitHub repo to join (e.g. acme/acme-skills)')
    .description('Join a team skills repo')
    .action(join_1.runJoin);
program
    .command('sync')
    .description('Pull and push skill updates')
    .action(sync_1.runSync);
program
    .command('status')
    .description('Show current sync state')
    .action(status_1.runStatus);
program
    .command('import')
    .argument('<path>', 'Path to a local skill or agent directory')
    .description('Import a local skill into the team repo')
    .action(import_1.runImport);
program.parse();
