# skillsync

> Share and keep Claude Code agents and skills in sync with your team.

---

## Problem

When you work with Claude Code, you build skills (`~/.claude/skills/`) and agents (`~/.claude/agents/`) that encode your workflows, conventions, and automation. Without a shared system, teams end up copying files manually, drifting out of sync, or keeping their best workflows trapped on one machine.

`skillsync` solves that with a Bun-based CLI that uses GitHub repos as the shared source of truth. A team lead can create a repo, seed it with selected local skills and agents, invite teammates, and each teammate can join that repo and link its contents into Claude Code through symlinks.

---

## Prerequisites

- **Bun 1+** — required to run the CLI
- **GitHub CLI (`gh`)** — **hard requirement**
  - Must be installed
  - Must be authenticated with `gh auth login`
  - Used for auth detection, repo creation, cloning, collaborator invites, and optional repo deletion

If `gh` is missing or unauthenticated, commands exit immediately with a clear error.

---

## What It Does

- **Creates** a GitHub repo for shared team skills and agents
- **Invites** teammates by GitHub username
- **Discovers** local Claude Code skills and agents
- **Copies** selected items into the shared repo
- **Clones** joined repos into `~/.skillsync/store/<owner>/<repo>/`
- **Links** shared items into `~/.claude/skills/` and `~/.claude/agents/`
- **Backs up** conflicting local items before linking
- **Tracks** joined repos in local machine config
- **Removes** linked items safely with `delete`, `leave`, and `destroy`

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | TypeScript | Clear, maintainable CLI code |
| Runtime | Bun | Fast runtime and easy `bunx` distribution |
| CLI framework | `@crustjs/core` | Command routing and command definitions |
| Plugins | `@crustjs/plugins` | Help, version, autocomplete |
| Interactive UI | `@crustjs/prompts` | Input, confirm, select, multiselect, spinner |
| Terminal styling | `@crustjs/style` | Styled stderr output |
| Config persistence | `@crustjs/store` | Persistent local config under `~/.skillsync/` |
| Validation | `zod` | External data validation when needed |
| GitHub integration | `gh` CLI | Auth, clone, create, invite, delete |
| Git integration | `git` CLI | Init, add, commit, push |

---

## Core Commands

### Pre-flight Check

Every real command starts by checking GitHub CLI availability and auth through `detectGh()` in `src/lib/github.ts`.

Flow:

1. Run `gh --version`
2. Run `gh auth status`
3. Extract the authenticated GitHub username
4. Exit with a styled error if either check fails

This is the guardrail that keeps the rest of the CLI simple.

---

### `skillsync create`

Used by a team lead to create a new shared repo.

Current flow:

1. Run GitHub pre-flight check
2. Prompt for team name
3. Prompt for optional GitHub org
4. Prompt for repo visibility (`private` or `public`)
5. Create the GitHub repo
6. Initialize a local git repo in `~/.skillsync/store/<owner>/<repo>/`
7. Add `origin`
8. Seed the repo with:
   - `skills/`
   - `agents/`
   - `README.md`
9. Prompt for teammate GitHub usernames to invite
10. Discover local Claude skills and agents
11. Let the user choose which items to share
12. Copy selected items into the repo
13. Commit and push
14. Save the repo in local config
15. Link shared items locally
16. Print the `join` command to share with teammates

Notes:

- The repo is seeded from code, not from a repo manifest file
- Shared item selection defaults to nothing selected
- Invites support GitHub usernames only

Example:

```
$ bunx skillsync create

  skillsync create
  Authenticated as @alice

  Team name: acme-skills
  GitHub org (blank for personal account): acme
  Visibility: private

  Found 7 skills and 2 agents on your machine.
  Select items to share with the team
  > [x] code-review
    [x] deploy-prod
    [ ] my-private-helper
    [x] planner (agent)

  Share this command with your team:

    bunx skillsync join acme/acme-skills
```

---

### `skillsync join <owner/repo>`

Used by a teammate to join a shared repo.

Current flow:

1. Run GitHub pre-flight check
2. Validate `<owner/repo>` format
3. Compute local store path as `~/.skillsync/store/<owner>/<repo>/`
4. If already joined, ask whether to re-clone
5. Clone the repo with `gh repo clone`
6. Save the repo in local config
7. Link everything found under:
   - `<storePath>/skills/`
   - `<storePath>/agents/`
8. Report linked, backed-up, and skipped items

Important behavior:

- No `skillsync.json` or repo manifest is read
- Repo metadata is inferred from the repo slug and local config
- If a real local item already exists, it is moved into `.backup/` before linking
- If another joined repo already owns the target symlink name, the new item is skipped

Example:

```
$ bunx skillsync join acme/acme-skills

  skillsync join
  Authenticated as @alice

  Cloning acme/acme-skills...

  + code-review
  + deploy-prod
  ! planner backed up to .backup/

  Joined acme/acme-skills -- 2 linked, 1 backed up, 0 skipped
```

---

### `skillsync delete [name]`

Used to remove linked skills or agents from local Claude directories without touching the shared repo.

Current behavior:

- This is a **local unlink** command
- It only removes symlinks owned by `skillsync`
- It never deletes the source content in `~/.skillsync/store/`
- It can optionally restore a backed-up local item automatically if one exists

Selection behavior:

- `skillsync delete <name>` — remove matching linked item(s) by name
- `skillsync delete` — open a multiselect prompt
- `--repo <owner/repo>` — limit scope to one joined repo
- `--all` — remove everything in scope without multiselect

Current implementation details:

- There is **no** `--type` flag
- If a backup exists, it is restored automatically after unlinking
- Items are selected from currently linked symlinks, not from repo contents

Example:

```
$ skillsync delete --repo acme/acme-skills

  skillsync delete

  Select items to remove
  > [ ] code-review
    [x] deploy-prod
    [x] planner.md

  Remove 2 items? (y/N)

  + deploy-prod
  + planner.md  backup restored

  2 removed, 1 backup restored
```

---

### `skillsync sync`

Pulls remote changes and pushes local changes for joined repos.

Accepts `--repo <owner/repo>` to target a single repo. Without the flag, syncs all joined repos sequentially.

Flow per repo:

1. If the local store has uncommitted changes, commit them with a `[skillsync] @username updated <skill-name>` message
2. Fetch and pull with rebase from origin
3. Push if there were local or remote changes
4. Update `lastSync` in config

On conflict: the rebase is aborted automatically, and the user is shown clear instructions for manual resolution.

Example:

```
$ skillsync sync

  skillsync sync
  Authenticated as @alice

  + acme/acme-skills  synced
  - personal/my-skills  up to date
```

```
$ skillsync sync --repo acme/acme-skills

  skillsync sync
  Authenticated as @alice

  + acme/acme-skills  synced
```

---

### `skillsync status`

Shows the current local state across all joined repos.

Current behavior:

- Runs GitHub pre-flight check
- Reads config from `~/.skillsync/`
- Lists joined repos
- Groups linked items by repo based on symlink targets under the store
- Shows:
  - team name
  - store path
  - last sync time
  - linked skills
  - linked agents
- Warns if a repo's local store directory is missing
- Warns about orphaned links that point into the store but do not match any joined repo in config

Example:

```
$ skillsync status

  skillsync status
  GitHub user: @alice
  2 repos joined:

  acme/acme-skills
    Team:      acme-skills
    Store:     ~/.skillsync/store/acme/acme-skills
    Last sync: never
    Skills (2): code-review, deploy-prod
    Agents (1): planner.md

  personal/my-skills
    Team:      my-skills
    Store:     ~/.skillsync/store/personal/my-skills
    Last sync: never
    Skills (1): sql-guide
    Agents (0): none
```

---

### `skillsync import <path>`

Adds a local skill directory or agent markdown file into one joined repo.

Current flow:

1. Run GitHub pre-flight check
2. Resolve the source path
3. Detect whether it is:
   - a skill directory
   - an agent `.md` file
4. Read local config
5. Resolve the target repo
   - use `--repo <owner/repo>` if provided
   - auto-pick if one repo is joined
   - otherwise prompt
6. Copy the item into:
   - `<storePath>/skills/<name>/`
   - or `<storePath>/agents/<name>.md`
7. Link it locally into Claude
8. Commit and push
9. Print result summary

Important behavior:

- Existing items in the target repo are not overwritten
- Name is derived from frontmatter when possible, otherwise from the filename/directory name
- Local linking follows the same backup/collision rules as `join`

Example:

```
$ skillsync import ~/.claude/skills/sql-migrations --repo acme/acme-skills

  skillsync import
  Authenticated as @alice

  + sql-migrations copied into acme/acme-skills/skills/
  + Symlink created

  Committed and pushed.
```

---

### `skillsync check-git`

Diagnostic command for inspecting `gh` setup.

Displays:

- GitHub CLI version
- authenticated user
- host
- auth method
- git protocol
- token preview
- token scopes

Example:

```
$ skillsync check-git

  skillsync check-git

  Version       2.62.0
  User          @alice
  Host          github.com
  Auth          oauth_token
  Protocol      https
  Token         gho_xxxx...
  Scopes        gist, read:org, repo
```

---

### `skillsync leave [repo]`

Removes a joined repo from the local machine.

Current flow:

1. Run GitHub pre-flight check
2. Resolve the repo argument or prompt if needed
3. Confirm
4. Unlink all items owned by that repo
5. Delete the repo's store directory
6. Remove the repo from local config

Important behavior:

- `leave` does **not** restore backups
- It only unlinks current symlinks and removes the local store
- Use `destroy` if you want backup restoration

Example:

```
$ skillsync leave acme/acme-skills

  skillsync leave

  Leave acme/acme-skills? Removes all linked items and deletes the local store. (y/N)

  + Left acme/acme-skills -- 3 items unlinked, store deleted
```

---

### `skillsync destroy [repo]`

Fully tears down a joined repo from the local machine, with backup restoration.

Current flow:

1. Run GitHub pre-flight check
2. Resolve the repo argument or prompt if needed
3. Confirm
4. Unlink all items owned by that repo
5. Restore backups when present
6. Delete the repo's store directory
7. Remove the repo from local config
8. Optionally delete the GitHub repo with `gh repo delete`

Important behavior:

- `destroy` is stronger than `leave`
- Backed-up local items are restored automatically
- GitHub repo deletion is optional and prompted separately

Example:

```
$ skillsync destroy acme/acme-skills

  skillsync destroy

  Destroy acme/acme-skills? Symlinks removed, backups restored, local store deleted. (y/N)

  + planner  backup restored
  + code-review  unlinked

  Also delete acme/acme-skills on GitHub? (y/N)

  2 items removed, 1 backup restored, store deleted
```

---

### `skillsync daemon start|stop|status`

Manages a background sync daemon that keeps skills synced automatically.

**`daemon start`**
- Spawns a detached background process that watches `~/.skillsync/store/` for file changes
- Local edits trigger a debounced sync (2s) per repo
- A 60-second poll loop checks for remote changes from teammates
- Writes PID to `~/.skillsync/daemon.pid` and logs to `~/.skillsync/daemon.log`
- If already running, prints a warning

**`daemon stop`**
- Sends SIGTERM to the daemon process
- Cleans up PID file
- If not running, prints info message

**`daemon status`**
- Shows whether the daemon is running, its PID, uptime, log path, and last sync time per repo
- Cleans up stale PID files automatically

**Auto-start**: The daemon is silently started after `join` and `create` commands so users never need to think about it.

Example:

```
$ skillsync daemon start

  skillsync daemon start
  + Daemon started (pid 12345).
    Log: ~/.skillsync/daemon.log

$ skillsync daemon status

  skillsync daemon status
  + Daemon is running.
    PID           12345
    Log           ~/.skillsync/daemon.log
    Uptime        2h 15m
    acme/acme-skills  2026-03-18T14:30:00.000Z

$ skillsync daemon stop

  skillsync daemon stop
  + Daemon stopped.
```

---

## Import Flow

During `create`, the CLI scans:

- `~/.claude/skills/`
- `~/.claude/agents/`

Discovery behavior:

- Skills are directories
- Agents are `.md` files
- Hidden items are ignored
- Already-managed symlinks are ignored
- For skills, `SKILL.md` frontmatter is read when present
- For agents, markdown frontmatter is read when present
- Labels use `name` and `description` when available
- Selection defaults to nothing selected

Selected items are copied into the team repo. Originals remain untouched.

---

## Placement Layer

Each joined repo is cloned into its own namespaced store directory:

```
~/.skillsync/store/
  acme/
    acme-skills/
      skills/
        code-review/
          SKILL.md
      agents/
        planner.md
  personal/
    my-skills/
      skills/
        sql-guide/
          SKILL.md
```

Claude Code sees symlinks like:

```
~/.claude/skills/code-review -> ~/.skillsync/store/acme/acme-skills/skills/code-review
~/.claude/agents/planner.md  -> ~/.skillsync/store/acme/acme-skills/agents/planner.md
~/.claude/skills/sql-guide   -> ~/.skillsync/store/personal/my-skills/skills/sql-guide
```

Ownership model:

- A symlink is considered owned by `skillsync` if its resolved target lives under `~/.skillsync/store/`
- The placer only removes symlinks it owns
- Real files and directories are never deleted directly

Conflict behavior:

- If a real file or directory already exists at the Claude target path, it is moved to `.backup/`
- If a symlink already exists and points somewhere else, it is treated as a collision and skipped
- If a symlink already points to the exact same store path, it is treated as already linked

Current scope is Claude only. Multi-target placement is not part of the implemented behavior.

---

## Local Config

Local machine state is stored under `~/.skillsync/` through `@crustjs/store`.

Logical config shape:

```json
{
  "username": "alice",
  "repos": {
    "acme/acme-skills": {
      "repo": "acme/acme-skills",
      "team": "acme-skills",
      "storePath": "/Users/alice/.skillsync/store/acme/acme-skills",
      "linkedAt": "2026-03-19T12:00:00.000Z",
      "lastSync": null
    }
  }
}
```

Notes:

- `repos` is keyed by repo slug
- `team` is currently just the repo name
- `lastSync` exists in config even though real sync is not implemented yet
- There is no repo-level manifest file in the shared repo

---

## Repo Structure (Team Repo)

Current repo shape created by `skillsync create`:

```
acme-skills/
  skills/
  agents/
  README.md
```

After importing or sharing items, it may look like:

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
  README.md
```

There is **no** `skillsync.json` file.

Repo metadata currently lives in:

- the GitHub repo slug
- the local machine config
- the seeded `README.md`

---

## Project Structure (CLI Codebase)

```
skillsync/
  src/
    commands/
      check-git.ts
      create.ts
      daemon.ts
      delete.ts
      destroy.ts
      import.ts
      join.ts
      leave.ts
      status.ts
      sync.ts
    lib/
      config.ts
      discovery.ts
      errors.ts
      git.ts
      github.ts
      placer.ts
      syncer.ts
      ui.ts
      watcher.ts
    daemon-worker.ts
    index.ts
  docs/
    SPEC.md
    crustJS.md
  package.json
  tsconfig.json
```

---

## Key Dependencies

Current `package.json` dependencies are:

```json
{
  "dependencies": {
    "@crustjs/core": "^0.0.15",
    "@crustjs/plugins": "^0.0.19",
    "@crustjs/prompts": "^0.0.9",
    "@crustjs/store": "^0.0.4",
    "@crustjs/style": "^0.0.5",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@eslint/js": "^9.22.0",
    "@types/bun": "latest",
    "eslint": "^9.22.0",
    "typescript": "^5.0.0",
    "typescript-eslint": "^8.26.1"
  },
  "bin": {
    "skillsync": "./dist/index.js"
  }
}
```

The implementation currently shells out to `gh` and `git` rather than using extra npm packages for git, merge, or file watching.

---

## Current Scope

| Command / Feature | Status |
|-------------------|--------|
| `create` | Implemented |
| `join` | Implemented |
| `delete` | Implemented |
| `leave` | Implemented |
| `destroy` | Implemented |
| `import` | Implemented |
| `status` | Implemented |
| `check-git` | Implemented |
| `sync` | Implemented |
| `daemon start\|stop\|status` | Implemented |
| Merge conflict resolution | Not implemented (fails loudly) |
| Multi-target placement | Not implemented |
| Repo manifest file | Removed |

Current success metric:

- A lead can create a repo
- Share selected local Claude skills and agents
- A teammate can join the repo
- Shared items appear in Claude via symlinks
- Local conflicts are backed up safely

---

## Design Decisions

**Why use GitHub repos as the backend?**  
Teams already understand GitHub. It provides sharing, history, collaboration, and a natural source of truth without building a custom service.

**Why require `gh` CLI?**  
It keeps auth simple and leverages the user's existing GitHub session. The tool can create repos, clone them, inspect auth state, invite collaborators, and optionally delete repos without introducing a separate auth flow.

**Why use symlinks?**  
Symlinks let Claude read directly from the store copy. That keeps the team repo and local Claude install aligned without maintaining duplicate working copies.

**Why backup instead of overwrite?**  
A local user may already have a personal skill or agent with the same name. Backing it up to `.backup/` makes the operation reversible and keeps ownership clear.

**Why no repo manifest file?**  
The current implementation does not need one. Repo identity comes from the GitHub slug and local config, and the shared repo structure is simple enough to infer directly from folders.

**Why keep `sync` in the CLI if it is not finished?**  
It preserves the intended command surface while the real sync engine is still being built.

---

## Implementation Notes

### What is implemented now

- GitHub auth detection
- Repo creation
- Repo cloning
- Local config persistence
- Skill and agent discovery
- Importing local content into a joined repo
- Symlink management with ownership detection
- Backup and restore flows
- Repo leave and destroy workflows
- Read-only status reporting
- Pull/rebase/push sync orchestration
- Background daemon with file watching and polling
- Auto-start daemon after join and create

### What is intentionally not implemented yet

- Automatic conflict resolution (conflicts abort rebase, user resolves manually)
- Multi-target installation for non-Claude tools

---

## Near-Term Direction

Possible next steps:

- Automatic merge conflict resolution (currently fails loudly)
- Multi-target placement for Cursor, Codex, and other agents
- Repo manifest file for selective sync
- `skillsync update` to re-link after repo structure changes