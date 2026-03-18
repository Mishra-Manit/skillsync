# skillsync

> Share and keep Claude Code agents and skills in sync with your team.

---

## Problem

When you work with Claude Code, you build skills (`.claude/skills/`) and subagents (`.claude/agents/`) that encode your workflows, conventions, and automation. Right now there is no way to share those markdown files with teammates and keep everyone on the same version. People either copy-paste files manually, forget to update, or just keep their best agents to themselves.

skillsync solves this with a single install-once CLI. Team leads create a shared skills repo, invite teammates, optionally seed it with existing skills — and everyone stays synced automatically via git.

---

## Prerequisites

- **Bun 1+** — required to run the CLI
- **gh CLI** — **hard requirement**. Must be installed and authenticated (`gh auth login`) before any skillsync command will run. Used for repo creation, collaborator invites, and cloning private repos. Install at https://cli.github.com. skillsync performs this check at startup and exits immediately with a clear error and install instructions if the requirement is not met — there is no fallback mode.

## What It Does

- **Creates** a private GitHub repo to hold shared team skills and agents
- **Invites** teammates by email/username (via GitHub collaborator API or org membership)
- **Imports** existing local skills the lead wants to share, letting them pick from a list
- **Links** the shared skills into each developer's tool directories via symlinks
- **Syncs** on demand (and optionally in the background) via git pull/push

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | TypeScript | Team already knows JS/TS; target users have Bun |
| Runtime | Bun 1+ | Fast, modern JS runtime; bunx provides zero-install distribution |
| CLI framework | @crustjs/core | Command routing with chainable, type-safe builder API |
| Interactive UI | @crustjs/prompts | Input, confirm, select, multiselect, spinner — zero deps |
| Terminal style | @crustjs/style | Color and text formatting |
| Config persistence | @crustjs/store | JSON-backed, typed config with atomic writes |
| Validation | @crustjs/validate | Schema-first validation wrapping Zod 4 |
| Git operations | simple-git | Bun-compatible git wrapper; no shell-out needed |
| Frontmatter parsing | gray-matter | YAML frontmatter from SKILL.md files |
| Merge algorithm | diff-match-patch | Google's text merging for skill body conflicts |
| Filesystem watching | chokidar | Cross-platform file watcher for auto-sync |
| Distribution | npm / bunx | Zero-install: `bunx skillsync join org/repo` just works |

---

## Core Commands

### Pre-flight Check

Runs automatically before **every** command (including `--help`-adjacent commands). This is the very first thing the CLI does.

Flow:
1. Check that `gh` is available in `PATH` by running `gh --version`. If not found, print a styled error:
   ```
   ✗ gh CLI is not installed.
     Install it from https://cli.github.com, then run `gh auth login`.
   ```
   Exit with code 1.
2. Check that `gh` is authenticated by running `gh auth status`. If unauthenticated, print:
   ```
   ✗ gh CLI is installed but you are not logged in.
     Run `gh auth login` to authenticate, then retry.
   ```
   Exit with code 1.
3. On success, capture the authenticated GitHub username from `gh auth status` output and make it available to all commands for the rest of the session.

This check is implemented once in `src/lib/github.ts` (`detectGh()`) and called as the first statement in every command handler.

---

### `skillsync create`

Used by the **team lead** to initialize a shared skills repo.

Flow:
1. Run pre-flight check (gh installed + authenticated) — exit immediately if it fails
2. Prompt: team name (becomes the GitHub repo name)
3. Prompt: GitHub org (optional — uses personal account if blank)
4. Create the private GitHub repo automatically via `gh repo create`
5. Seed the repo with a starter `skills/` and `agents/` directory structure, plus an example SKILL.md
6. Prompt: invite teammates (comma-separated emails or GitHub usernames)
   - Uses `gh` CLI to send collaborator invites
   - Org repos support email invites; personal repos require GitHub usernames
7. Prompt: import existing skills (see Import Flow below)
8. Commit + push everything
9. Print the `join` command for the lead to share with teammates

```
$ bunx skillsync create

  skillsync create

  Team name: acme-skills
  GitHub org (blank for personal): acme
  Visibility: private

  Created github.com/acme/acme-skills

  Invite teammates (emails or usernames, comma-separated):
  > alice@company.com, bob, charlie@company.com

  Invited alice@company.com
  Invited bob
  Invited charlie@company.com

  Found 7 skills and 2 agents on your machine.
  Which skills should the team have access to?
  > [x] code-review      Review PRs for style and bugs
    [x] deploy-prod      Production deployment checklist
    [ ] my-voice         Personal writing style guide
    [x] api-conventions  Internal API response shape

  Importing 3 skills into acme/acme-skills...
  Committed and pushed.

  Share this with your team:

    bunx skillsync join acme/acme-skills
```

---

### `skillsync join <owner/repo>`

Used by **each teammate** after accepting the GitHub invite.

Flow:
1. Clone the team repo to `~/.skillsync/store/`
2. Read `skillsync.json` from the repo for target preferences
3. For each skill/agent in the store, create a symlink in the appropriate local tool directories
4. Handle conflicts: if the user already has a local skill with the same name, back it up to `~/.claude/skills/.backup/` before creating the symlink
5. Report what was linked and what was backed up

```
$ bunx skillsync join acme/acme-skills

  Joining acme-skills...

  Cloned acme/acme-skills (3 skills, 1 agent)

  Linking to Claude Code...
    code-review       linked
    deploy-prod       linked
    api-conventions   linked
    planner           backed up your local version to .backup/

  Done. Skills are active in Claude Code.
  Run `skillsync sync` to pull updates.
```

---

### `skillsync sync`

One-shot manual sync. Commits any local edits to team skills, pulls remote changes, and resolves conflicts.

```
$ skillsync sync

  Syncing acme-skills...

  Committed local changes to code-review
  Pulled 1 update (deploy-prod updated by @alice)
  All up to date.
```

---

### `skillsync daemon start|stop|status`

Runs `skillsync sync` automatically in the background.

- Triggers on filesystem change to any linked skill file (via chokidar), debounced 2 seconds
- Also polls every 60 seconds for remote changes
- Logs sync events to `~/.skillsync/daemon.log`
- Runs as a detached Bun process, PID stored at `~/.skillsync/daemon.pid`

**v0 note**: daemon is optional. The core value works with manual `sync`. Auto-sync is a v1 feature.

---

### `skillsync status`

Shows current state: repo, linked skills, daemon, last sync.

```
$ skillsync status

  Team:      acme-skills
  Repo:      github.com/acme/acme-skills
  Daemon:    running (PID 48291)
  Last sync: 4 minutes ago

  3 skills linked to Claude Code:
    code-review
    deploy-prod
    api-conventions

  1 agent linked to Claude Code:
    planner
```

---

### `skillsync import <path>`

Adds a skill from the local machine into the shared team repo after initial setup.

```
$ skillsync import ~/.claude/skills/sql-migrations

  Copied sql-migrations into acme/acme-skills/skills/
  Committed and pushed.
  Symlink updated locally.
```

---

## Import Flow (Detail)

When the lead runs `create`, after the repo is seeded, the CLI scans these directories:

```
~/.claude/skills/
~/.claude/agents/
~/.codex/skills/
~/.cursor/skills/
```

For each skill directory found, it reads the SKILL.md frontmatter (`name`, `description`) to display a meaningful label. Duplicate names across tool directories are deduplicated (Claude's copy wins).

The multiselect prompt lists all discovered skills with name and description. **Nothing is selected by default** — the user opts in explicitly to avoid accidentally sharing personal skills.

Selected skills are copied (not moved) into the team repo. Originals stay untouched. On the next `sync`, the local copies are replaced with symlinks pointing to the store.

---

## Placement Layer

The store lives at `~/.skillsync/store/`. Skills are symlinked from there into tool directories:

```
~/.skillsync/store/
  skills/
    code-review/
      SKILL.md
    deploy-prod/
      SKILL.md
      scripts/
        deploy.sh
  agents/
    planner.md

Symlinked to:
~/.claude/skills/code-review   -> ~/.skillsync/store/skills/code-review
~/.claude/agents/planner.md    -> ~/.skillsync/store/agents/planner.md
```

If the user has `codex` or `cursor` enabled in their config, those get symlinked too. The placer only manages its own symlinks — it will not clobber real directories.

**Conflict on join**: if a real (non-symlink) directory exists at the target, it is backed up to `~/.claude/skills/.backup/<name>/` before the symlink is created. The user is notified.

On non-symlink-friendly platforms, falls back to copy mode (`--copy` flag or config setting).

---

## Sync Engine (v1)

For teams that edit skills frequently:

1. **Local change detected** (chokidar event, debounced 2s)
2. Parse changed SKILL.md files
3. Auto-commit: `[skillsync] @username updated code-review`
4. `git pull --rebase`
5. On conflict:
   - **Frontmatter**: merge field-by-field (each key is independent). Last-write-wins on same-field conflicts with a logged warning.
   - **Markdown body**: diff-match-patch three-way merge. Auto-merges additive changes. Creates `.sync-conflict` file on genuine conflicts.
   - **Scripts/binaries**: last-modified-wins.
6. Push to remote

---

## Repo Structure (Team Repo)

```
acme-skills/
  skills/
    code-review/
      SKILL.md
    deploy-prod/
      SKILL.md
      scripts/
        deploy.sh
  agents/
    planner.md
  skillsync.json
  README.md
```

### skillsync.json

```json
{
  "team": {
    "name": "acme-skills",
    "repo": "github.com/acme/acme-skills"
  },
  "sync": {
    "interval": 60,
    "strategy": "auto"
  },
  "targets": {
    "claude": true,
    "codex": false,
    "cursor": false
  }
}
```

---

## Project Structure (CLI Codebase)

```
skillsync/
  src/
    commands/
      create.ts      # create team repo, invite, import
      join.ts        # clone, link, handle conflicts
      sync.ts        # one-shot manual sync
      daemon.ts      # start/stop/status background watcher
      status.ts      # show current state
      import.ts      # add a skill post-setup
    lib/
      git.ts         # simple-git wrapper (clone, commit, pull, push)
      watcher.ts     # chokidar watcher + poll loop
      merger.ts      # gray-matter + diff-match-patch merge logic
      placer.ts      # symlink/copy to target tool directories
      discovery.ts   # scan local skill dirs, parse frontmatter
      config.ts      # read/write ~/.skillsync/config.json via @crustjs/store
      github.ts      # gh CLI detection, repo create, invite
    index.ts         # @crustjs/core entrypoint — register subcommands
  package.json
  tsconfig.json
  SPEC.md
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "@crustjs/core": "^0.0.15",
    "@crustjs/prompts": "^0.0.9",
    "@crustjs/style": "^0.0.5",
    "@crustjs/store": "^0.0.4",
    "@crustjs/validate": "^0.0.13",
    "simple-git": "^3.27.0",
    "gray-matter": "^4.0.3",
    "diff-match-patch": "^1.0.5",
    "chokidar": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/bun": "latest",
    "@types/diff-match-patch": "^1.0.0"
  },
  "bin": {
    "skillsync": "./dist/index.js"
  }
}
```

---

## v0 Scope (Ship This First)

| Command | Included |
|---------|----------|
| `create` | Yes — repo creation, invites, import flow |
| `join` | Yes — clone, symlink, conflict backup |
| `sync` | Yes — manual one-shot |
| `status` | Yes — current state display |
| `import` | Yes — add a skill post-setup |
| `daemon` | No — v1 |
| Multi-target (codex, cursor) | No — v1 |
| Merge conflict resolution | No — v1 (v0 fails loudly and tells you to resolve manually) |

v0 success metric: a team lead can go from `bunx skillsync create` to a teammate successfully running `bunx skillsync join` and having skills in Claude Code in under 60 seconds (excluding GitHub invite accept time).

---

## v1 Features

- Daemon with auto-sync (chokidar + poll)
- Frontmatter-aware conflict merging (diff-match-patch)
- Multi-target placement (codex, cursor)
- `skillsync diff <skill>` — compare local backup to team version
- Desktop notifications on sync failure
- Project-level mode: `skillsync init --local` — skills live in the project repo, no separate repo needed

## v2 Ideas

- `skillsync add <url>` — pull a community skill from skills.sh or a GitHub URL into the team repo
- Web dashboard for team skill activity
- Claude Code plugin integration for auto-discovery
- Skill visibility tags (`@private`, `@team`, `@public`) in frontmatter

---

## Design Decisions

**Why git as the backend?** Zero infrastructure. Teams already have GitHub. Version history, blame, and PR review come free. No new auth to manage.

**Why `gh` CLI instead of Octokit?** The `gh` CLI handles auth, token management, and repo creation. Building OAuth from scratch is scope creep. `gh` is already installed on most developer machines.

**Why symlinks instead of copies?** Update the source once, all agents see the change instantly. Fall back to copies on platforms where symlinks are unreliable.

**Why CrustJS instead of Commander + Clack?** CrustJS provides an integrated, type-safe suite (@crustjs/core, @crustjs/prompts, @crustjs/store, @crustjs/validate) in a single framework. Fewer integration points, full TypeScript inference across commands and prompts, and the CrustJS team is actively supporting the project.

**Why no custom sync server?** It would require accounts, hosting, auth, and ongoing ops. Git repos are free, familiar, and already trusted for code. The sync problem is just a git pull/push loop.

**Why `bunx` distribution?** Zero install friction for Bun users. The target user (`bunx skillsync join org/repo`) never needs to install skillsync globally. Works immediately after receiving the join command from their team lead.

**Why JSON for config?** `@crustjs/store` uses JSON natively with atomic writes and full type inference. No additional parser dependency needed, and JSON is universally readable by any tool in the ecosystem.

---

## Implementation Plan

### Phase 1 — Project Scaffold

Get a working CLI binary with no real logic yet. Goal: `bunx skillsync --help` works end-to-end.

- [ ] Initialize package (`package.json`, `tsconfig.json`, `.gitignore`)
- [ ] Install all v0 dependencies (`@crustjs/core`, `@crustjs/prompts`, `@crustjs/style`, `@crustjs/store`, `@crustjs/validate`, `simple-git`, `gray-matter`)
- [ ] Set up TypeScript build (`outDir: dist/`, `strict: true`)
- [ ] Create `src/index.ts` with `@crustjs/core` — register `create`, `join`, `sync`, `status`, `import` as stub subcommands
- [ ] Wire `detectGh()` as the very first call in each command handler stub — verify it exits with a styled error when `gh` is absent or unauthenticated
- [ ] Add `bin` field to `package.json`, verify `bun dist/index.js --help` prints the command list
- [ ] Add `bun run build`, `bun run dev`, `bun run typecheck` scripts

---

### Phase 2 — Core Library Layer

Build all the shared logic in `src/lib/` before wiring up any commands. Each module is independently testable.

**`src/lib/config.ts`**
- [ ] Define `Config` type and `@crustjs/store` schema for `~/.skillsync/config.json`
- [ ] `readConfig()` — load config via store, return typed object or `null` if not found
- [ ] `writeConfig(config)` — write config via store, create `~/.skillsync/` directory if needed

**`src/lib/github.ts`**
- [ ] `detectGh()` — first run `gh --version` to confirm `gh` is in PATH (exit code 0), then run `gh auth status` to confirm authentication; return `{ username: string }` on success; on any failure print a styled error with install/login instructions and exit with code 1. This is the single canonical pre-flight gate used by every command.
- [ ] `createRepo(name, org?)` — run `gh repo create` with `--private --clone` flags
- [ ] `inviteCollaborator(repo, emailOrUsername)` — run `gh api` to add collaborator, handle org vs personal repo difference

**`src/lib/discovery.ts`**
- [ ] `discoverLocalSkills()` — scan `~/.claude/skills/`, `~/.claude/agents/`, `~/.codex/skills/`, `~/.cursor/skills/`
- [ ] For each directory found, parse `SKILL.md` frontmatter with `gray-matter` to extract `name` and `description`
- [ ] Deduplicate by name (Claude's copy wins)
- [ ] Return `DiscoveredSkill[]` with `{ name, description, sourcePath, type: 'skill' | 'agent' }`

**`src/lib/placer.ts`**
- [ ] `linkSkill(storePath, targetPath)` — create symlink; if a real directory already exists at target, back it up to `.backup/` and notify
- [ ] `unlinkSkill(targetPath)` — remove only symlinks managed by skillsync, never real directories
- [ ] `listLinked()` — return all symlinks currently managed by skillsync
- [ ] `isOwnedSymlink(path)` — check if a path is a symlink pointing into `~/.skillsync/store/`

**`src/lib/git.ts`**
- [ ] `cloneRepo(repoSlug, destPath)` — `gh repo clone` or `git clone`, return `SimpleGit` instance
- [ ] `commitAll(repoPath, message)` — stage all changes and commit
- [ ] `pullRebase(repoPath)` — `git pull --rebase`, throw with clear error on conflict (v0: no auto-merge)
- [ ] `push(repoPath)` — push to origin main
- [ ] `sync(repoPath, username, changedSkillName?)` — full cycle: commit → pull → push

---

### Phase 3 — `skillsync create`

The team lead's onboarding flow. Implement in `src/commands/create.ts`.

- [ ] Call `detectGh()` — this is always the first statement; exit with styled error if gh is absent or unauthenticated
- [ ] Prompt: team name (validate non-empty, URL-safe)
- [ ] Prompt: GitHub org (optional, blank = personal account)
- [ ] Call `createRepo(name, org)` — create private GitHub repo and clone it locally to `~/.skillsync/store/`
- [ ] Seed the cloned repo: create `skills/`, `agents/` directories, write a starter `SKILL.md` example, write `skillsync.json`, write `README.md` with the join command
- [ ] Prompt: invite teammates (comma-separated input, split and trim)
- [ ] For each invitee, call `inviteCollaborator()` — report success or failure per invitee, don't abort on one failure
- [ ] Call `discoverLocalSkills()` — if results found, show multiselect with all unchecked by default
- [ ] Copy selected skills into `~/.skillsync/store/skills/` or `~/.skillsync/store/agents/`
- [ ] Commit everything and push
- [ ] Write `~/.skillsync/config.json` with repo slug and team name
- [ ] Print the join command in a highlighted box

---

### Phase 4 — `skillsync join`

The teammate's onboarding flow. Implement in `src/commands/join.ts`.

- [ ] Call `detectGh()` — first statement; exit with styled error if gh is absent or unauthenticated
- [ ] Accept `<owner/repo>` as a required argument
- [ ] Clone repo to `~/.skillsync/store/` using `cloneRepo()`
- [ ] Read `skillsync.json` from the cloned repo to get target preferences
- [ ] Write `~/.skillsync/config.json` locally
- [ ] Enumerate all skills in `store/skills/` and agents in `store/agents/`
- [ ] For each, call `linkSkill()` — report `linked` or `backed up` per item
- [ ] Print summary of what was linked and where to find backups

---

### Phase 5 — `skillsync sync`, `status`, `import`

Finish the remaining v0 commands.

**`sync`** (`src/commands/sync.ts`)
- [ ] Read config — exit with helpful error if not initialized
- [ ] Run `git.sync()` — commit local changes (if any), pull, push
- [ ] Report what changed (skills updated locally, skills pushed)
- [ ] On conflict: print the conflicting file path, tell user to resolve manually and re-run

**`status`** (`src/commands/status.ts`)
- [ ] Read config — show "not initialized" state if missing
- [ ] Show team name, repo, last sync time (read from `~/.skillsync/last-sync` timestamp file)
- [ ] Call `listLinked()` — display all linked skills and agents grouped by type

**`import`** (`src/commands/import.ts`)
- [ ] Accept `<path>` as a required argument
- [ ] Validate path is a directory containing a `SKILL.md`
- [ ] Read config — exit if not initialized
- [ ] Copy the skill directory into the store (`skills/` or `agents/` based on frontmatter `type` field)
- [ ] Commit and push
- [ ] Call `linkSkill()` to update the local symlink

---

### Phase 6 — Polish and Distribution

Make it ready for real users.

- [ ] Error messages: every thrown error should produce a styled error output via `@crustjs/style` with a clear next step, never a raw stack trace
- [ ] Audit every command: confirm `detectGh()` is the first call in each handler and that no command can proceed past it without a valid authenticated `gh` session
- [ ] Add `--version` flag (pull from `package.json`)
- [ ] Write `README.md` with install instructions, quick start, and command reference
- [ ] Publish to npm (`npm publish --access public`)
- [ ] Verify `bunx skillsync --help` works from a clean machine with Bun installed

---

### Phase 7 — v1: Daemon + Auto-sync

After v0 ships and is being used by at least one team.

- [ ] Implement `src/lib/watcher.ts` with chokidar — watch `~/.skillsync/store/` for changes, debounce 2 seconds
- [ ] Add poll loop (60s interval) for remote changes
- [ ] Implement `src/commands/daemon.ts` — `start` (detach process, write PID file), `stop` (kill by PID), `status` (check PID alive)
- [ ] Implement frontmatter-aware merge in `src/lib/merger.ts` using `gray-matter` + `diff-match-patch`
- [ ] Replace v0 conflict bail-out in `git.ts` with the merger
- [ ] Add multi-target placement to `placer.ts` (codex, cursor directories)
