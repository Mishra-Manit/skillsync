# skillsync

CLI tool for sharing and syncing Claude Code agents and skills across a dev team. TypeScript + Bun, distributed via bunx.

## Commands

```bash
bun run build          # compile TypeScript → dist/
bun run dev            # watch mode
bun run lint           # eslint
bun run typecheck      # tsc --noEmit
bun dist/index.js      # run locally after build
```

Write extremely easy to consume code, optimize for how easy the code is to read. Make the code skimmable. Avoid cleverness. Use early returns.

## Project Structure

```
src/
  commands/        # one file per CLI command (create, join, sync, daemon, status, import, delete, leave, destroy, check-git)
  lib/             # shared logic (git, syncer, watcher, placer, discovery, config, github, ui, errors)
  daemon-worker.ts # standalone background process entry point (not a CrustJS command)
  index.ts         # @crustjs/core entrypoint — register subcommands here, thin as possible
```

Each command file imports only from `lib/`. Commands contain no business logic — they wire up @crustjs/prompts and call lib functions.

## CrustJS

This project uses CrustJS as its CLI framework. For all API usage, patterns, and module docs see `docs/crustJS.md`.

Rules:
- Use `@crustjs/prompts` for interactive input and `@crustjs/style` for output — never `console.log`
- All prompt UI renders to stderr; stdout stays clean for piped output
- Use `@crustjs/store` for any config/state persistence — never write JSON files manually
- Use `zod` for schema validation of any external data

## Code Style

- Immutable patterns only — never mutate objects or arrays
- Functions under 50 lines; files under 400 lines
- No `console.log` anywhere — use `@crustjs/style` for output
- Async/await throughout; no callbacks
- Use `fatal()` from `src/lib/errors.ts` for all error exits — never inline `process.stderr.write` + `process.exit(1)`

## Key Behaviors (non-obvious)

**Symlink ownership**: `placer.ts` only touches symlinks it created. It will never overwrite a real directory — it backs it up to `.backup/` first and notifies the user.

**Import flow**: `import` is interactive. It resolves a target joined repo (auto if one joined, otherwise prompt), verifies write access through `gh`, then shows a multiselect of local skills/agents with nothing selected by default. This prevents accidental sharing of personal items.

**gh CLI detection**: `github.ts` shells out to `gh auth status` to detect if the user is authenticated. `gh` is a hard requirement: if `gh` is unavailable or unauthenticated, exit with a clear error and tell the user to run `gh auth login`.

**Store location**: each joined repo is cloned into `~/.skillsync/store/<owner>/<repo>/` — one namespaced subdirectory per team repo. Tool directories (`~/.claude/skills/`, etc.) contain symlinks pointing into the relevant store subdirectory. This means a user can be joined to multiple team repos simultaneously without any path collision.

**Config format**: local machine state lives at `~/.skillsync/config.json` (managed by `@crustjs/store`). It holds a `username` string and a `repos` map keyed by repo slug (`"owner/repo"`), where each entry is a `RepoConfig` object (`{ repo, team, storePath, linkedAt, lastSync }`). `import` resolves a single target repo (auto if one joined, otherwise prompt). `sync` uses `--repo <owner/repo>` for one repo or, with no flag, processes all joined repos sequentially.

**Commit messages**: auto-commits follow the format `[skillsync] @username updated <skill-name>`. Never prompt the user for a commit message.

## Current Scope

Current commands: `create`, `join`, `sync`, `status`, `import`, `check-git`, `delete`, `leave`, `destroy`, `daemon start|stop`.

Do not implement multi-target placement (codex/cursor) or automatic merge conflict resolution yet. On sync conflict, fail loudly with a clear error and tell the user to resolve manually.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@crustjs/core` | Command routing and subcommand registration |
| `@crustjs/prompts` | Interactive prompts (input, select, multiselect, spinner) |
| `@crustjs/style` | Terminal color and text formatting |
| `@crustjs/store` | Typed JSON config persistence at `~/.skillsync/` |
| `chokidar` | File system watching for daemon auto-sync |
| `zod` | Schema validation for external data |

See `docs/crustJS.md` for full CrustJS module docs.

## Spec

Full product spec lives in `docs/SPEC.md`. Read it before implementing any new command.

---

## Frontend — `web/`

Next.js 16 + React 19 + Tailwind CSS 4 marketing site and docs. Run from the `web/` directory.

```bash
cd web
npm run dev    # local dev server
npm run build  # production build
npm run lint   # eslint
```

### Next.js 16 — Read the Docs First

This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Before writing any frontend code, read the relevant guide in `web/node_modules/next/dist/docs/` and heed deprecation notices.

### Stack

- **Next.js 16** (App Router only — no `pages/` directory)
- **React 19** with Server Components by default
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **TypeScript** strict mode
- Fonts: Inter (body), Fraunces (display), IBM Plex Mono (code)

### Frontend Structure

```
web/
  app/
    layout.tsx        # root layout — fonts, metadata, global CSS
    page.tsx          # landing page
    docs/page.tsx     # docs page
    components/       # shared UI components
    globals.css       # Tailwind directives + custom styles
  next.config.ts      # turbopack config
```

### Frontend Code Style

- Server Components by default; add `"use client"` only when you need browser APIs, hooks, or event handlers
- Tailwind utility classes for all styling — no CSS modules, no styled-components
- Components are pure functions; no class components
- Keep components under 150 lines; extract sub-components when they grow
- Use semantic HTML (`<section>`, `<nav>`, `<article>`, etc.)
- All images use `next/image`; all links use `next/link`
- No `console.log` in shipped code
- Prefer composition over prop drilling — use React context sparingly
