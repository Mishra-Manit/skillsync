# skillsync

skillsync is a CLI tool that lets developers share and sync Claude Code agents and skills across a dev team using a GitHub repo as the transport layer. No backend, no database — just Git and the `gh` CLI.

---

## Part 1: CLI

**Package:** `@manitmishra/skillsync` (npm) — `package.json` at repo root.
**Runtime:** Bun >= 1.0.0. All internals use `Bun.spawnSync`, `Bun.spawn`, `Bun.write`. Not compatible with Node.
**CLI framework:** CrustJS (`@crustjs/core`, `@crustjs/plugins`, `@crustjs/prompts`, `@crustjs/style`, `@crustjs/store`).
**Other deps:** `chokidar` (file watching), `zod` (validation).

### Commands

```bash
bun run build          # bun build src/index.ts src/daemon-worker.ts --outdir dist --target bun
make smoke             # smoke-test the compiled binary
```

### Source structure

```
src/
  index.ts             # entrypoint -- registers all commands, auto-revives daemon
  commands/
    create.ts          # interactive create: prompts team name, org, visibility, seeds skills/agents, creates GitHub repo, starts daemon
    join.ts            # clone a repo, register in config, symlink skills/agents, start daemon
    sync.ts            # commit local changes, pull rebase, push -- for all repos or a specific one
    import.ts          # discover unmanaged local skills/agents, copy into store, commit and push
    status.ts          # print joined repos, linked items, daemon status, orphaned symlinks
    unlink.ts          # remove skillsync-managed symlinks from ~/.claude/ -- does NOT touch GitHub
    leave.ts           # unlink all items, delete local store, remove from config, optionally delete GitHub repo
    daemon.ts          # manage background sync worker (start/stop)
    check-git.ts       # verify gh auth and print token details
  lib/
    config.ts          # read/write ~/.skillsync/config.json via @crustjs/store
    git.ts             # raw git operations via Bun.spawnSync (clone, commit, pull, push, rebase)
    github.ts          # gh CLI operations (create repo, invite collaborator, check write access)
    placer.ts          # symlink lifecycle: link/unlink skills and agents, restore backups
    syncer.ts          # sync algorithm, commit message builder, last-sync timestamp
    watcher.ts         # chokidar watcher on ~/.skillsync/store/, debounce 10s, polls remote every 10min
    discovery.ts       # scan ~/.claude/ for items not already owned by skillsync
    ui.ts              # stderr output helpers (header, success, warn, error, hint)
    errors.ts          # fatal(message, hint) -- prints and exits 1
  daemon-worker.ts     # standalone background process: watcher + remote polling, PID at ~/.skillsync/daemon.pid
dist/                  # compiled output (index.js, daemon-worker.js)
bin/skillsync          # executable entrypoint -> dist/index.js
```

### Runtime store layout

```
~/.skillsync/
  config.json          # joined repos, last sync timestamps
  daemon.pid
  daemon.log           # 1 MB rotation
  store/
    <owner>/<repo>/
      skills/<name>/   # git-tracked directory
      agents/<name>.md # git-tracked file
~/.claude/
  skills/<name>        -> symlink into store
  agents/<name>.md     -> symlink into store
```

### Key rules for CLI work

- Skills are **directories** under `skills/`; agents are **`.md` files** under `agents/`. Placer handles both differently.
- Never mutate config objects directly — `config.ts` returns new objects.
- All user-facing output goes to **stderr** via `ui.ts`. Stdout is reserved for machine-readable output.
- The daemon is a **separate Bun process** spawned with `nohup`. Do not add daemon logic to the main CLI process.
- `gh` CLI is the only GitHub interface — no Octokit, no REST calls.
- `delete` and `destroy` commands **do not exist** — they were removed. The active removal commands are `unlink` and `leave`.

---

## Part 2: Frontend (web/)

Marketing site and docs page for skillsync. Lives entirely under `web/` as a separate npm workspace.

**Stack:** Next.js 16.2, React 19, Tailwind CSS 4, TypeScript, MDX (via `@next/mdx`).
**Fonts:** Inter (body), Fraunces (display), IBM Plex Mono (mono) — all via `next/font/google`.

### Commands

```bash
cd web
npm run dev    # local dev server
npm run build  # production build
npm run lint   # eslint
```

### Next.js 16 -- Read the Docs First

This version has breaking changes. Before writing any frontend code, read the relevant guide in `web/node_modules/next/dist/docs/` and heed deprecation notices.

### Structure

```
web/
  app/
    layout.tsx              # root layout: font variables, metadata, body
    page.tsx                # landing page (imports all section components)
    globals.css             # Tailwind 4 @theme inline + rotating-text keyframes
    components/
      header.tsx            # nav: wordmark + Features / How It Works / Docs / Get Started
      hero.tsx              # beta pill, animated headline, 3 CTAs, terminal mockup
      rotating-text.tsx     # "use client" -- TypeAnimation cycling team descriptors
      terminal.tsx          # static terminal mockup of `skillsync create` output
      problem-solution.tsx  # problem statement + 3-step how-it-works (Create, Import, Sync)
      features.tsx          # 5-feature grid (no new platform, GitHub-backed, symlink, daemon, team mgmt)
      final-cta.tsx         # install pill + MIT license note
      footer.tsx            # wordmark + Product / Resources link columns
      copy-pill.tsx         # "use client" -- copies `npm install -g @manitmishra/skillsync` to clipboard
    docs/
      page.tsx              # two-column layout: sidebar + MDX content
      sidebar.tsx           # "use client" -- sticky TOC with IntersectionObserver active highlighting
      content.mdx           # full docs: Installation, Quick Start, all commands, Architecture, Config, Troubleshooting
  next.config.ts            # MDX enabled, pageExtensions includes md/mdx
  mdx-components.tsx        # global MDX component overrides (headings, code blocks, tables, etc.)
```

### Color palette (defined in globals.css)

| Token | Value | Usage |
|---|---|---|
| `bg` | #FAF8F5 | warm off-white page background |
| `fg` | #1A1A1A | primary text |
| `accent` | #5E7A64 | muted green, CTAs and active states |
| `muted` | #666666 | secondary text |
| `terminal` | #2D2D2D | terminal mockup background |
| `border` | #E8E4DF | dividers |

### Code style

- Server Components by default; add `"use client"` only when you need browser APIs, hooks, or event handlers.
- Tailwind utility classes for all styling -- no CSS modules, no styled-components.
- Components are pure functions; no class components.
- Keep components under 150 lines; extract sub-components when they grow.
- Use semantic HTML (`<section>`, `<nav>`, `<article>`, etc.).
- All images use `next/image`; all links use `next/link`.
- No `console.log` in shipped code.

### Known issues

- Docs sidebar TOC lists `delete` and `destroy` commands — these were removed from the CLI. Update `docs/content.mdx` and `docs/sidebar.tsx` to reflect the actual commands (`unlink`, `leave`).
- Footer links are placeholder `#` hrefs — real anchors not yet wired up.
