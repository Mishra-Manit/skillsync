# skillsync

Share and sync Claude Code agents and skills across a dev team via a GitHub repo.

## Install

```bash
npm install -g @manitmishra/skillsync
```

## Requirements

- [Bun](https://bun.sh) runtime
- [gh CLI](https://cli.github.com) authenticated (`gh auth login`)

## Quick Start

**One person creates the shared repo:**

```bash
skillsync create
```

This creates a GitHub repo with `skills/` and `agents/` folders and pushes the initial structure.

**Share the repo slug (`owner/repo`) with your team.**

**Teammates join:**

```bash
skillsync join <owner/repo>
```

This clones the repo into `~/.skillsync/store/<owner>/<repo>/` and creates symlinks in `~/.claude/skills/` and `~/.claude/agents/`.

**Team members can import their existing skills or agents:**

```bash
skillsync import
```

Import flow:
- If you're in multiple repos, choose which one to import into
- Verify you have write access to that repo
- Pick one or more local skills/agents from a multiselect (default: none selected)
- Copy selected items into the repo store, link them locally, then commit + push

## Commands

| Command | Description |
|---------|-------------|
| `create` | Create a shared team skills repo on GitHub |
| `join <owner/repo>` | Clone a team repo and link its skills and agents |
| `sync [--repo owner/repo]` | Pull remote changes and push local ones (git pull --rebase + push) |
| `import` | Interactively select local skills/agents to copy into a joined repo, then push |
| `status` | Show joined repos, linked items, daemon state, and last sync time |
| `unlink [name]` | Remove symlinks for a skill or agent (restores backups if present) |
| `leave [repo]` | Leave a repo: unlink all items, restore backups, delete store, and optionally delete the GitHub repo |
| `daemon start\|stop` | Start or stop the background sync daemon |
| `check-git` | Show gh CLI version and auth status |

## How It Works

**Store layout**

Each joined repo is cloned to `~/.skillsync/store/<owner>/<repo>/`. Symlinks in `~/.claude/skills/` and `~/.claude/agents/` point into the relevant store subdirectory. You can be joined to multiple team repos simultaneously without path collisions. Config is persisted at `~/.skillsync/config.json`.

**Symlinks**

`join` creates symlinks for every item in the shared repo's `skills/` and `agents/` directories. If a real directory already exists at a target path, it is backed up to `.backup/` before the symlink is created. `unlink` and `leave` restore backups automatically.

**Daemon**

`daemon start` launches a background process that watches `~/.claude/skills/` and `~/.claude/agents/` for file changes. Changes are debounced 10 seconds before committing and pushing. The daemon also polls for remote changes every 10 minutes. Auto-commit messages follow the format `[skillsync] @username updated <skill-name>`.

Run `daemon stop` to kill the background process. `status` shows whether the daemon is running and when the last sync occurred.

**Conflicts**

On sync conflict, skillsync fails loudly with a clear error. There is no automatic merge resolution — resolve conflicts manually in the store directory and re-run `sync`.
