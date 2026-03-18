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

Used by **each teammate** after accepting the GitHub invite. Can be run multiple times with different repos — each one is tracked independently.

Flow:
1. Validate `<owner/repo>` format with `@crustjs/validate`
2. Check `config.repos` — if the slug already exists, ask the user if they want to re-clone (default: no); if they decline, exit cleanly
3. Clone the team repo to `~/.skillsync/store/<owner>/<repo>/` (namespaced so multiple repos coexist without collision)
4. Read and validate `skillsync.json` from the cloned repo
5. Add an entry to `config.repos` keyed by repo slug — never overwrites unrelated existing repo entries
6. For each skill/agent in the store, create a symlink in the appropriate local tool directories
7. Handle conflicts: if the user already has a local skill with the same name, back it up to `~/.claude/skills/.backup/<name>/` before creating the symlink
8. Report what was linked and what was backed up

```
$ bunx skillsync join acme/acme-skills

  Joining acme-skills...

  Cloned acme/acme-skills → ~/.skillsync/store/acme/acme-skills/ (3 skills, 1 agent)

  Linking to Claude Code...
    code-review       linked
    deploy-prod       linked
    api-conventions   linked
    planner           backed up your local version to .backup/

  Done. Skills are active in Claude Code.
  Run `skillsync sync` to pull updates.

$ bunx skillsync join personal/my-skills

  Joining my-skills...

  Cloned personal/my-skills → ~/.skillsync/store/personal/my-skills/ (2 skills, 0 agents)

  Linking to Claude Code...
    sql-guide         linked
    refactor-helper   linked

  Done. You now have 2 repos joined. Run `skillsync status` to see all.
```

---

### `skillsync sync`

One-shot manual sync. Commits any local edits to team skills, pulls remote changes, and resolves conflicts.

**Multi-repo behavior:**
- No flag → if one repo is joined, syncs it automatically; if multiple repos are joined, syncs **all** of them in sequence
- `--repo <owner/repo>` → syncs only the specified repo; exits with a styled error if the slug is not in `config.repos`

```
$ skillsync sync

  Syncing acme/acme-skills...
  Committed local changes to code-review
  Pulled 1 update (deploy-prod updated by @alice)
  ✓ acme/acme-skills up to date

  Syncing personal/my-skills...
  Nothing to commit.
  ✓ personal/my-skills up to date

$ skillsync sync --repo acme/acme-skills

  Syncing acme/acme-skills...
  Committed local changes to code-review
  ✓ acme/acme-skills up to date
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

Shows current state for all joined repos: repo URLs, linked skills and agents per repo, and last sync timestamps. Read-only — never modifies anything.

```
$ skillsync status

  GitHub user: @alice
  2 repos joined:

  acme/acme-skills
    Team:      acme-skills
    Store:     ~/.skillsync/store/acme/acme-skills/
    Last sync: 4 minutes ago
    Skills (3): code-review, deploy-prod, api-conventions
    Agents (1): planner

  personal/my-skills
    Team:      my-skills
    Store:     ~/.skillsync/store/personal/my-skills/
    Last sync: never
    Skills (2): sql-guide, refactor-helper
    Agents (0): —

$ skillsync status  # when no repos are joined

  Not initialized. Run `skillsync join <owner/repo>` or `skillsync create` to get started.
```

---

### `skillsync import <path>`

Adds a skill from the local machine into a shared team repo after initial setup.

**Repo selection:**
- No flag → if one repo is joined, uses it automatically; if multiple repos are joined, presents a `select` prompt
- `--repo <owner/repo>` → targets the specified repo directly; exits with a styled error if the slug is not in `config.repos`

```
$ skillsync import ~/.claude/skills/sql-migrations

  # single repo joined — no prompt needed
  Copied sql-migrations into acme/acme-skills/skills/
  Committed and pushed.
  Symlink updated locally.

$ skillsync import ~/.claude/skills/sql-migrations

  # multiple repos joined — prompts for target
  Which repo should this skill be added to?
  > acme/acme-skills
    personal/my-skills

  Copied sql-migrations into acme/acme-skills/skills/
  Committed and pushed.
  Symlink updated locally.

$ skillsync import ~/.claude/skills/sql-migrations --repo personal/my-skills

  Copied sql-migrations into personal/my-skills/skills/
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

Each joined repo is cloned into a namespaced subdirectory of `~/.skillsync/store/`. Multiple team repos coexist without any path collision. Skills are symlinked from the relevant store subdirectory into tool directories:

```
~/.skillsync/store/
  acme/
    acme-skills/              ← clone of github.com/acme/acme-skills
      skills/
        code-review/
          SKILL.md
        deploy-prod/
          SKILL.md
          scripts/
            deploy.sh
      agents/
        planner.md
  personal/
    my-skills/                ← clone of github.com/personal/my-skills
      skills/
        sql-guide/
          SKILL.md
        refactor-helper/
          SKILL.md
      agents/

Symlinked to:
~/.claude/skills/code-review      -> ~/.skillsync/store/acme/acme-skills/skills/code-review
~/.claude/skills/deploy-prod      -> ~/.skillsync/store/acme/acme-skills/skills/deploy-prod
~/.claude/agents/planner.md       -> ~/.skillsync/store/acme/acme-skills/agents/planner.md
~/.claude/skills/sql-guide        -> ~/.skillsync/store/personal/my-skills/skills/sql-guide
~/.claude/skills/refactor-helper  -> ~/.skillsync/store/personal/my-skills/skills/refactor-helper
```

`placer.ts` determines symlink ownership by checking whether the resolved target path falls anywhere under `~/.skillsync/store/` — it does not need to know which specific repo a symlink belongs to in order to safely manage it.

If the user has `codex` or `cursor` enabled in their config, those get symlinked too. The placer only manages its own symlinks — it will not clobber real directories.

**Conflict on join**: if a real (non-symlink) directory exists at the target, it is backed up to `~/.claude/skills/.backup/<name>/` before the symlink is created. The user is notified.

**Name collisions across repos**: if two joined repos both contain a skill named `code-review`, the second `join` will detect the collision (the target symlink already exists and is owned), warn the user, and skip that skill — it does not overwrite. The user must rename one of the skills manually to resolve this.

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
- [ ] Define `RepoConfig` type: `{ repo: string, team: string, storePath: string, linkedAt: string, lastSync: string | null }` — one entry per joined repo; `storePath` is the absolute local clone path (e.g. `~/.skillsync/store/acme/acme-skills`)
- [ ] Define `Config` type: `{ username: string, repos: Record<string, RepoConfig> }` — `repos` is keyed by repo slug `"owner/repo"`
- [ ] Define `@crustjs/store` schema and initialize the store at `~/.skillsync/`
- [ ] `readConfig()` — return typed `Config` or `null` if the store file does not exist
- [ ] `writeConfig(config: Config)` — atomic write via store; creates `~/.skillsync/` if needed
- [ ] `addRepo(entry: RepoConfig)` — read current config (or create a fresh empty one), merge the new entry into `config.repos` keyed by `entry.repo`, then call `writeConfig()`; never modifies any other existing repo entry
- [ ] `removeRepo(slug: string)` — remove the entry at `config.repos[slug]` and call `writeConfig()`; no-op if the slug is not present
- [ ] `resolveRepo(config: Config, flag?: string): RepoConfig` — shared helper used by `sync` and `import`: if `flag` is set, look up `config.repos[flag]` and error with a styled message if not found; if `config.repos` has exactly one entry, return it automatically; otherwise throw a `NeedsRepoSelectError` that the calling command catches to show a `select` prompt before retrying

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
- [ ] Compute the namespaced clone destination: `~/.skillsync/store/<owner>/<repo>/` — derived directly from the slug argument
- [ ] Check `readConfig()` — if the slug already exists in `config.repos`, prompt the user whether to re-clone (default: no); if they decline, exit cleanly with a styled message
- [ ] Call `cloneRepo()` into the computed destination; show a spinner while cloning
- [ ] Read and validate `skillsync.json` from the cloned repo with `@crustjs/validate`
- [ ] Call `addRepo()` with a new `RepoConfig` entry — never overwrites entries for unrelated repos already in config
- [ ] Enumerate `<storePath>/skills/` and `<storePath>/agents/`; for each entry call `linkSkill()` — if the target symlink already exists and `isOwnedSymlink()` returns true, skip it and warn the user (name collision with a skill from another joined repo)
- [ ] Print per-item result (`linked` / `backed up` / `skipped — name collision`) and a final summary

**Smoke test:** `bun dist/index.js join <your-test-repo>` clones the repo to `~/.skillsync/store/<owner>/<repo>/`, creates symlinks in `~/.claude/skills/`, and adds one entry to `config.repos` in `~/.skillsync/config.json`. Run `join` a second time with a different test repo — both entries appear side-by-side in config and all symlinks coexist without collision. Verify with `ls -la ~/.claude/skills/`.

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
- [ ] `readConfig()` — exit with styled error if `null` or `config.repos` is empty (suggest `join` or `create`)
- [ ] Determine target repos: if `--repo <slug>` flag is provided, look it up in `config.repos` and exit with a styled error if not found; otherwise collect **all** entries in `config.repos` and sync them sequentially
- [ ] For each target repo: show a labeled spinner (`Syncing <slug>...`), call `git.sync(repoConfig.storePath, username)`; on success update `repoConfig.lastSync` to the current ISO timestamp via `addRepo()`
- [ ] On `SyncConflictError`: print the repo slug and conflicting file path in red, instruct the user to open the file, resolve the conflict markers, and re-run `sync`; when syncing all repos continue to the next one rather than aborting entirely
- [ ] On success: print a per-repo summary of what was pushed and what was pulled (diff HEAD before/after for each)

**Smoke test:** Edit a skill file in `~/.skillsync/store/acme/acme-skills/skills/`, run `sync`, verify the commit appears on GitHub. Run `sync --repo acme/acme-skills` and verify only that repo is touched. With two repos joined, run `sync` with no flag and verify both repos are processed in sequence with individual result lines.

---

### Phase 5 — `skillsync status`

**Goal:** A quick read-only health check. All dependencies already exist — this phase should take under an hour.

**`src/commands/status.ts`**
- [ ] `readConfig()` — if `null` or `config.repos` is empty, print a "not initialized" state with the suggested next step and exit cleanly (exit code 0, not an error)
- [ ] Print the authenticated GitHub username at the top, then iterate over every entry in `config.repos` and render one block per repo
- [ ] Per-repo block: team name, store path, last sync timestamp (from `repoConfig.lastSync`, display as relative time or "never"), and linked skill/agent counts
- [ ] Call `listLinked()` — group results by which `storePath` prefix the symlink resolves to, so skills are shown under the correct repo block
- [ ] If a repo's `storePath` directory is missing or empty, print an inline warning that the repo may need to be re-cloned (`skillsync join <slug>`)

**Smoke test:** Run `status` after joining two repos and syncing only one. Both repo blocks appear; the unsynced one shows "Last sync: never". Delete `~/.skillsync/config.json` and re-run — gets the "not initialized" message.

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
- [ ] Show spinner: call `createRepo(name, org)` — repo is created and cloned into `~/.skillsync/store/<org-or-username>/<name>/` (same namespaced layout used by `join`)
- [ ] Seed the repo: create `skills/` and `agents/` directories; write `skillsync.json` (from the schema); write a starter `skills/example/SKILL.md`; write `README.md` containing the `join` command
- [ ] Prompt: invite teammates — comma-separated input; for each trimmed value call `inviteCollaborator()`, print per-invitee result
- [ ] Call `discoverLocalSkills()` — if non-empty results, show multiselect (nothing checked by default); copy selected items into `store/skills/` or `store/agents/`
- [ ] `commitAll` + `push` everything
- [ ] Call `addRepo()` with a new `RepoConfig` entry (slug, team name, computed `storePath`, current ISO timestamp as `linkedAt`, `lastSync: null`)
- [ ] Print the `join` command in a highlighted box

**Smoke test:** Run `create` end-to-end. Verify the private repo is cloned into `~/.skillsync/store/<org-or-username>/<name>/`, the private repo exists on GitHub, invites were sent, selected skills appear in the repo, and the printed `join` command works from a second machine/account. If the user already has another repo joined, verify `status` shows both repos.

---

### Phase 7 — `skillsync import`

**Goal:** Let any team member add a skill to the shared repo after initial setup. Short phase — all dependencies are already built.

**`src/commands/import.ts`**
- [ ] Call `detectGh()` — always first
- [ ] Accept `<path>` as required argument; validate it is an existing directory containing a `SKILL.md`
- [ ] Parse `SKILL.md` frontmatter with `gray-matter` to determine `name` and `type` (`skill` | `agent`)
- [ ] `readConfig()` — exit with styled error if `null` or `config.repos` is empty (suggest `join` or `create`)
- [ ] Resolve the target repo: call `resolveRepo(config, flags['--repo'])` — auto-selects if one repo is joined, shows a `select` prompt if multiple are joined, or uses the `--repo` flag value directly
- [ ] Copy the directory into `<repoConfig.storePath>/skills/<name>/` or `<repoConfig.storePath>/agents/<name>/` (exit with a styled error if a directory with that name already exists in the target repo's store — never silently overwrite)
- [ ] Call `linkSkill()` to wire the new entry locally
- [ ] `commitAll` + `push` on `repoConfig.storePath` with message `[skillsync] @<username> added <name>`
- [ ] Print confirmation: skill name, where it lives in the store, symlink target

**Smoke test:** With two repos joined, run `import <path>` with no flag — the repo `select` prompt appears. Re-run with `import <path> --repo acme/acme-skills` — skips the prompt and goes directly to that repo. Verify the skill appears under the correct namespaced store path (e.g. `~/.skillsync/store/acme/acme-skills/skills/<name>/`), is symlinked into `~/.claude/skills/`, and the commit is visible on GitHub.

---

### Phase 8 — Polish and Distribution

**Goal:** Zero rough edges. Ready for a real team to use.

- [ ] Global error boundary in `src/index.ts` — catch any unhandled rejection, print a styled error with the message and a `--debug` hint, exit 1; never show a raw stack trace in normal mode
- [ ] Add `--debug` flag to `src/index.ts` — when set, print full stack traces and raw command output
- [ ] Audit every command: `detectGh()` is the first call, every early-exit uses a styled message, no `console.log` anywhere
- [ ] Confirm that every successful `sync` updates `repoConfig.lastSync` in `config.repos` via `addRepo()` — no separate flat file needed; `status` reads it from there
- [ ] Add `--version` flag — read from `package.json` at build time
- [ ] Write project `README.md` — install instructions, 60-second quick-start, full command reference
- [ ] Run `bun run typecheck` and `bun run lint` to zero errors/warnings
- [ ] Publish to npm: `npm publish --access public`
- [ ] Verify `bunx skillsync --help` works from a clean machine with only Bun installed

**Smoke test (end-to-end):** On a clean machine, run the full multi-repo lead → teammate flow:
1. `bunx skillsync create` — creates `acme/acme-skills`, cloned into `~/.skillsync/store/acme/acme-skills/`
2. `bunx skillsync join personal/my-skills` on the same machine — both repos now appear in `config.repos`; `bunx skillsync status` shows two repo blocks
3. Accept invite on GitHub; run `bunx skillsync join acme/acme-skills` on a second account — skills from both repos land in `~/.claude/skills/` via separate symlink trees
4. Edit a skill file under `~/.skillsync/store/acme/acme-skills/skills/`; run `bunx skillsync sync` — both repos are processed; only the modified one produces a commit
5. Run `bunx skillsync sync --repo personal/my-skills` — only that repo is touched; `acme/acme-skills` lastSync timestamp is unchanged
6. Verify the second account sees the update after their own `sync`. Total time should be under 60 seconds of active work.

---

### Phase 9 — v1: Daemon + Auto-sync

After v0 is being actively used by at least one real team.

- [ ] `src/lib/watcher.ts` — watch `~/.skillsync/store/` with chokidar; debounce 2 seconds before triggering sync
- [ ] Add a 60-second remote poll loop alongside the file watcher
- [ ] `src/commands/daemon.ts` — `start` (detach with `Bun.spawn`, write PID to `~/.skillsync/daemon.pid`), `stop` (read PID, `kill`), `status` (check PID is alive)
- [ ] `src/lib/merger.ts` — frontmatter-aware three-way merge using `gray-matter` + `diff-match-patch`; merge body independently of frontmatter
- [ ] Replace the v0 `SyncConflictError` bail-out in `git.ts` with the merger; only fail loudly if the merger itself cannot resolve
- [ ] Extend `placer.ts` for multi-target placement: `~/.codex/skills/` and `~/.cursor/skills/` driven by `targets` in `skillsync.json`
