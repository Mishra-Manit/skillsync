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

> **Ordering rationale:** Each phase ends with something you can run and manually verify. Library code is built only as far as the next command needs it — no speculative work. `join` is built before `create` because it has far fewer dependencies (no GitHub API, no discovery), lets you validate the entire store → symlink → config pipeline against a manually-created test repo, and gives you confidence in the foundation before tackling the most complex command.

---

### Phase 1 — Scaffold

**Goal:** `bun dist/index.js --help` prints all five subcommands. Nothing else works yet.

- [ ] Initialize `package.json` (`name: skillsync`, `type: module`), `tsconfig.json` (`strict: true`, `outDir: dist/`), `.gitignore`
- [ ] Install all v0 dependencies: `@crustjs/core`, `@crustjs/prompts`, `@crustjs/style`, `@crustjs/store`, `@crustjs/validate`, `simple-git`, `gray-matter`
- [ ] Add `bun run build`, `bun run dev` (watch), `bun run typecheck`, `bun run lint` scripts
- [ ] Create `src/index.ts` — register `create`, `join`, `sync`, `status`, `import` as stub handlers that just print `"not implemented"` via `@crustjs/style`
- [ ] Add `bin.skillsync` field to `package.json` pointing to `dist/index.js`

**Smoke test:** `bun run build && bun dist/index.js --help` lists all five commands. `bun run typecheck` passes with zero errors.

---

### Phase 2 — Universal Foundations: `config.ts` + `detectGh()`

**Goal:** Every command can read/write local config and will exit cleanly if `gh` is missing. These two modules underpin everything else — build them once, never revisit.

**`src/lib/config.ts`**
- [ ] Define `Config` type: `{ repo: string, team: string, username: string, linkedAt: string }`
- [ ] Define `@crustjs/store` schema and initialize the store at `~/.skillsync/`
- [ ] `readConfig()` — return typed `Config` or `null` if the store file does not exist
- [ ] `writeConfig(config: Config)` — atomic write via store; creates `~/.skillsync/` if needed

**`src/lib/github.ts`** (pre-flight only — GitHub API calls come in Phase 6)
- [ ] `detectGh()` — run `gh --version` (confirms in PATH), then `gh auth status` (confirms login); parse authenticated username from output; return `{ username: string }` on success; on any failure print a styled two-line error (what went wrong + how to fix it) and `process.exit(1)`

- [ ] Drop `detectGh()` as the first call into every command stub from Phase 1

**Smoke test:** With `gh` logged out, running `bun dist/index.js join foo/bar` prints a styled error and exits 1. Logged back in, it prints `"not implemented"`.

---

### Phase 3 — `skillsync join` (first fully working command)

**Goal:** A teammate can point `join` at any real GitHub repo and get symlinks wired up in `~/.claude/skills/`. Create a throwaway test repo manually on GitHub to drive this.

**`src/lib/git.ts`** (clone only — push/pull/commit come in Phase 4)
- [ ] `cloneRepo(repoSlug, destPath)` — shells out to `gh repo clone <slug> <destPath>`; returns a `SimpleGit` instance bound to `destPath`

**`src/lib/placer.ts`** (full module — needed by `join`, `import`, and `status`)
- [ ] `isOwnedSymlink(targetPath)` — returns `true` if path is a symlink pointing into `~/.skillsync/store/`
- [ ] `linkSkill(storePath, targetPath)` — create symlink from `targetPath` → `storePath`; if a real directory already occupies `targetPath`, move it to `~/.claude/skills/.backup/<name>` and notify user before linking
- [ ] `unlinkSkill(targetPath)` — remove symlink only if `isOwnedSymlink()` is true; never removes real directories
- [ ] `listLinked()` — scan all known target directories, return every path where `isOwnedSymlink()` is true

**`src/commands/join.ts`**
- [ ] Call `detectGh()` — always first
- [ ] Accept `<owner/repo>` as required argument; validate format with `@crustjs/validate`
- [ ] Call `cloneRepo()` into `~/.skillsync/store/`; show a spinner while cloning
- [ ] Read and validate `skillsync.json` from the cloned repo with `@crustjs/validate`
- [ ] Call `writeConfig()` with repo slug, team name, and username
- [ ] Enumerate `store/skills/` and `store/agents/`; call `linkSkill()` for each
- [ ] Print per-item result (`linked` / `backed up`) and a final summary

**Smoke test:** `bun dist/index.js join <your-test-repo>` clones the repo, creates symlinks in `~/.claude/skills/`, writes `~/.skillsync/config.json`. Verify symlinks with `ls -la ~/.claude/skills/`.

---

### Phase 4 — `skillsync sync`

**Goal:** After editing a skill file in the store, `sync` commits and pushes it. Validates the git round-trip.

**`src/lib/git.ts`** (complete the module)
- [ ] `commitAll(repoPath, message)` — stage all changes (`git add -A`) and commit with the provided message
- [ ] `pullRebase(repoPath)` — `git pull --rebase origin main`; on conflict throw a typed `SyncConflictError` with the conflicting file path
- [ ] `push(repoPath)` — push to `origin main`
- [ ] `sync(repoPath, username, changedSkillName?)` — orchestrate: `commitAll` (if dirty) → `pullRebase` → `push`; format commit message as `[skillsync] @<username> updated <skill-name>`

**`src/commands/sync.ts`**
- [ ] Call `detectGh()` — always first
- [ ] `readConfig()` — exit with styled error if `null` (not initialized; suggest running `join` or `create`)
- [ ] Call `git.sync()` with config values; show a spinner during network ops
- [ ] On `SyncConflictError`: print the conflicting file path in red, tell user to open it, resolve the conflict markers, and re-run `sync`
- [ ] On success: print what was pushed and what was pulled (compare HEAD before/after)

**Smoke test:** Edit a skill file in `~/.skillsync/store/skills/`, run `sync`, verify the commit appears on GitHub. Then pull in a change from GitHub and run `sync` again to verify the pull direction.

---

### Phase 5 — `skillsync status`

**Goal:** A quick read-only health check. All dependencies already exist — this phase should take under an hour.

**`src/commands/status.ts`**
- [ ] `readConfig()` — if `null`, print a "not initialized" state with suggested next step and exit cleanly (not an error)
- [ ] Display: team name, repo URL, authenticated GitHub user, and last sync timestamp (store as ISO string in config on every successful `sync`)
- [ ] Call `listLinked()` — display linked skills and agents in two groups with counts
- [ ] If store directory is missing or empty, warn that the repo may need to be re-cloned

**Smoke test:** Run `status` after a successful `join` + `sync`. All fields populate. Delete `~/.skillsync/config.json` and re-run — gets the "not initialized" message.

---

### Phase 6 — `skillsync create`

**Goal:** The team lead's full onboarding flow. This is the most complex command. Build it last among the commands so all git, placer, and config primitives are already proven.

**`src/lib/github.ts`** (complete the module)
- [ ] `createRepo(name, org?)` — `gh repo create <org/name> --private --clone` (personal if `org` is blank); returns the cloned local path
- [ ] `inviteCollaborator(repoSlug, emailOrUsername)` — `gh api /repos/<slug>/collaborators/<user> -X PUT`; handle org repos (support email) vs personal repos (username only); return `'invited' | 'already-member' | 'error'` — never throw, let the caller handle per-invitee results

**`src/lib/discovery.ts`**
- [ ] `discoverLocalSkills()` — scan `~/.claude/skills/` and `~/.claude/agents/` (v0 only; codex/cursor in v1)
- [ ] For each subdirectory, attempt to parse `SKILL.md` frontmatter with `gray-matter`; skip silently if missing
- [ ] Deduplicate by `name` frontmatter field (first found wins)
- [ ] Return `DiscoveredSkill[]`: `{ name, description, sourcePath, type: 'skill' | 'agent' }`

**`src/commands/create.ts`**
- [ ] Call `detectGh()` — always first
- [ ] Prompt: team name — validate non-empty and URL-safe (`/^[a-z0-9-]+$/`) with `@crustjs/validate`
- [ ] Prompt: GitHub org — optional; blank defaults to authenticated personal account
- [ ] Show spinner: call `createRepo(name, org)` — repo is created and cloned into `~/.skillsync/store/`
- [ ] Seed the repo: create `skills/` and `agents/` directories; write `skillsync.json` (from the schema); write a starter `skills/example/SKILL.md`; write `README.md` containing the `join` command
- [ ] Prompt: invite teammates — comma-separated input; for each trimmed value call `inviteCollaborator()`, print per-invitee result
- [ ] Call `discoverLocalSkills()` — if non-empty results, show multiselect (nothing checked by default); copy selected items into `store/skills/` or `store/agents/`
- [ ] `commitAll` + `push` everything
- [ ] Call `writeConfig()` with repo slug and team name
- [ ] Print the `join` command in a highlighted box

**Smoke test:** Run `create` end-to-end. Verify the private repo exists on GitHub, invites were sent, selected skills appear in the repo, and the printed `join` command works from a second machine/account.

---

### Phase 7 — `skillsync import`

**Goal:** Let any team member add a skill to the shared repo after initial setup. Short phase — all dependencies are already built.

**`src/commands/import.ts`**
- [ ] Call `detectGh()` — always first
- [ ] Accept `<path>` as required argument; validate it is an existing directory containing a `SKILL.md`
- [ ] Parse `SKILL.md` frontmatter with `gray-matter` to determine `name` and `type` (`skill` | `agent`)
- [ ] `readConfig()` — exit with styled error if `null`
- [ ] Copy the directory into `~/.skillsync/store/skills/<name>/` or `store/agents/<name>/` (fail if name already exists in store — don't silently overwrite)
- [ ] Call `linkSkill()` to wire the new entry locally
- [ ] `commitAll` + `push` with message `[skillsync] @<username> added <name>`
- [ ] Print confirmation: skill name, where it lives in the store, symlink target

**Smoke test:** Create a local skill directory with a `SKILL.md`, run `import <path>`, verify it appears in the store, is symlinked into `~/.claude/skills/`, and the commit is visible on GitHub.

---

### Phase 8 — Polish and Distribution

**Goal:** Zero rough edges. Ready for a real team to use.

- [ ] Global error boundary in `src/index.ts` — catch any unhandled rejection, print a styled error with the message and a `--debug` hint, exit 1; never show a raw stack trace in normal mode
- [ ] Add `--debug` flag to `src/index.ts` — when set, print full stack traces and raw command output
- [ ] Audit every command: `detectGh()` is the first call, every early-exit uses a styled message, no `console.log` anywhere
- [ ] Write `~/.skillsync/last-sync` ISO timestamp on every successful `sync` (read in `status`)
- [ ] Add `--version` flag — read from `package.json` at build time
- [ ] Write project `README.md` — install instructions, 60-second quick-start, full command reference
- [ ] Run `bun run typecheck` and `bun run lint` to zero errors/warnings
- [ ] Publish to npm: `npm publish --access public`
- [ ] Verify `bunx skillsync --help` works from a clean machine with only Bun installed

**Smoke test (end-to-end):** On a clean machine, run the full lead → teammate flow: `bunx skillsync create` → accept invite on GitHub → `bunx skillsync join` on a second account → edit a skill → `bunx skillsync sync` → verify the other account sees the update after their own `sync`. Total time should be under 60 seconds of active work.

---

### Phase 9 — v1: Daemon + Auto-sync

After v0 is being actively used by at least one real team.

- [ ] `src/lib/watcher.ts` — watch `~/.skillsync/store/` with chokidar; debounce 2 seconds before triggering sync
- [ ] Add a 60-second remote poll loop alongside the file watcher
- [ ] `src/commands/daemon.ts` — `start` (detach with `Bun.spawn`, write PID to `~/.skillsync/daemon.pid`), `stop` (read PID, `kill`), `status` (check PID is alive)
- [ ] `src/lib/merger.ts` — frontmatter-aware three-way merge using `gray-matter` + `diff-match-patch`; merge body independently of frontmatter
- [ ] Replace the v0 `SyncConflictError` bail-out in `git.ts` with the merger; only fail loudly if the merger itself cannot resolve
- [ ] Extend `placer.ts` for multi-target placement: `~/.codex/skills/` and `~/.cursor/skills/` driven by `targets` in `skillsync.json`
