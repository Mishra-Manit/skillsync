# skillsync

CLI tool for sharing and syncing Claude Code agents and skills across a dev team. TypeScript + Node.js, distributed via npx.

## Commands

```bash
npm run build          # compile TypeScript → dist/
npm run dev            # ts-node watch mode
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
node dist/index.js     # run locally after build
```

## Project Structure

```
src/
  commands/    # one file per CLI command (create, join, sync, daemon, status, import)
  lib/         # shared logic (git, watcher, merger, placer, discovery, config, github)
  index.ts     # Commander entrypoint — register commands here, thin as possible
```

Each command file imports only from `lib/`. Commands contain no business logic — they wire up Clack prompts and call lib functions.

## CLI Patterns

**Always use Clack for user-facing output — never `console.log`.**

```typescript
import * as p from '@clack/prompts'

p.intro('skillsync create')       // session start
p.log.info('...')                  // informational
p.log.success('...')               // success
p.log.warn('...')                  // warning
p.log.error('...')                 // error
p.outro('...')                     // session end

const s = p.spinner()
s.start('Cloning repo...')
// ... async work
s.stop('Cloned.')
```

**Always guard against Ctrl+C cancellation:**

```typescript
const name = await p.text({ message: 'Team name?' })
if (p.isCancel(name)) {
  p.cancel('Cancelled.')
  process.exit(0)
}
```

## Code Style

- Immutable patterns only — never mutate objects or arrays
- Functions under 50 lines; files under 400 lines
- No `console.log` anywhere — use `p.log.*`
- Use `picocolors` for any manual color formatting (not chalk)
- Async/await throughout; no callbacks
- Zod for validating `skillsync.toml` and any external data

## Key Behaviors (non-obvious)

**Symlink ownership**: `placer.ts` only touches symlinks it created. It will never overwrite a real directory — it backs it up to `.backup/` first and notifies the user.

**Import flow default**: nothing is selected by default in the skill multiselect. The user explicitly opts in. This prevents accidental sharing of personal skills.

**gh CLI detection**: `github.ts` shells out to `gh auth status` to detect if the user is authenticated. If `gh` is unavailable or unauthenticated, fall back to plain `git` and tell the user to push manually.

**Store location**: `~/.skillsync/store/` is the canonical local copy. Tool directories (`~/.claude/skills/`, etc.) contain symlinks pointing into the store.

**Commit messages**: auto-commits follow the format `[skillsync] @username updated <skill-name>`. Never prompt the user for a commit message.

## v0 Scope

Only these commands exist in v0: `create`, `join`, `sync`, `status`, `import`.

Do not implement the daemon, multi-target placement (codex/cursor), or merge conflict resolution yet. On sync conflict in v0, fail loudly with a clear error and tell the user to resolve manually.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@clack/prompts` | All interactive prompts and output |
| `commander` | Command routing |
| `simple-git` | Git operations (no shell-out) |
| `gray-matter` | Parse YAML frontmatter from SKILL.md |
| `diff-match-patch` | Text merging (v1 only) |
| `chokidar` | Filesystem watcher (daemon, v1 only) |
| `picocolors` | Manual color formatting |
| `zod` | Config validation |

## Spec

Full product spec lives in `SPEC.md`. Read it before implementing any new command.
