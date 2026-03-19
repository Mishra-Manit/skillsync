# CLI Polish & Code Cleanup Implementation Plan

**Goal:** Make the CLI output visually polished and consistent, and make the codebase dead-simple to read and contribute to.

**Approach:** Extract a shared `ui.ts` output module that every command uses, so formatting is defined once. Remove async/sync mismatches, flatten awkward control flow, DRY up duplicated scan logic, and give every command a consistent visual structure. Add autoCompletePlugin for free UX polish.

**Stack:** TypeScript, @crustjs/style, @crustjs/plugins

---

### Task 1: Create `src/lib/ui.ts` — shared output helpers

**Files:**
- Create: `src/lib/ui.ts`

**Implementation:**

Small module that wraps `process.stderr.write` with semantic helpers. Every function is one line. The visual language:
- `header(cmd)` — bold command name with a blank line above
- `subheader(text)` — dim context line (e.g. "Authenticated as @user")
- `success(text)` — green check + text
- `warn(text)` — yellow ! + text
- `info(text)` — dim dash + text
- `item(text)` — indented bullet
- `label(key, value, width?)` — aligned key:value pair
- `blank()` — empty line
- `divider()` — thin dim line
- `box(lines)` — indented block for call-to-action sections

```typescript
import { style } from '@crustjs/style'

const write = (s: string) => process.stderr.write(s)

export const ui = {
  header:    (cmd: string) => write(`\n  ${style.bold(`skillsync ${cmd}`)}\n`),
  subheader: (text: string) => write(`  ${style.dim(text)}\n\n`),
  success:   (text: string) => write(`  ${style.green('+')} ${text}\n`),
  warn:      (text: string) => write(`  ${style.yellow('!')} ${text}\n`),
  error:     (text: string) => write(`  ${style.red('x')} ${text}\n`),
  info:      (text: string) => write(`  ${style.dim('-')} ${text}\n`),
  line:      (text: string) => write(`  ${text}\n`),
  label:     (key: string, value: string, width = 14) =>
               write(`    ${style.dim(key.padEnd(width))}${value}\n`),
  blank:     () => write('\n'),
  hint:      (text: string) => write(`  ${style.dim(text)}\n`),
}
```

**Verify:**
```bash
bun run typecheck
```

**Commit:**
`refactor: extract shared ui output helpers`

---

### Task 2: Drop fake `async` from sync functions in `github.ts`

**Files:**
- Modify: `src/lib/github.ts`

**Implementation:**

These functions only use `Bun.spawnSync` and never `await` anything:
- `detectGh()` — remove `async`, return type stays `GhAuth`
- `createRepo()` — remove `async`, return type stays `CreateRepoResult`
- `getAuthDetails()` — remove `async`, return type stays `GhAuthDetails`
- `inviteCollaborator()` — remove `async`, return type stays the same

All callers already `await` them (which is fine — awaiting a non-Promise is a no-op).

**Verify:**
```bash
bun run typecheck
```

**Commit:**
`refactor: remove async from sync github functions`

---

### Task 3: Rewrite all commands to use `ui.*` helpers

**Files:**
- Modify: `src/commands/create.ts`
- Modify: `src/commands/join.ts`
- Modify: `src/commands/status.ts`
- Modify: `src/commands/leave.ts`
- Modify: `src/commands/delete.ts`
- Modify: `src/commands/check-git.ts`
- Modify: `src/commands/sync.ts`
- Modify: `src/commands/import.ts`
- Modify: `src/lib/errors.ts`

**Implementation:**

Replace every `process.stderr.write(...)` call with the appropriate `ui.*` call. Each command gets a consistent structure:

```
ui.header('command-name')
ui.subheader('context info')
... command body ...
ui.blank()
```

Key changes per file:

**`create.ts`** — Also flatten the IIFE: replace `const repoSlug = await (async () => {...})()` with a straight `let repoSlug` + try/catch. Remove the nested arrow function.

**`join.ts`** — Replace inline status lines with `ui.success()`, `ui.warn()`, `ui.info()`.

**`status.ts`** — Replace `printRepoBlock` internals with `ui.label()`. Replace `printNotInitialized` with `ui.hint()`.

**`leave.ts`** — Replace manual writes with `ui.success()`, `ui.hint()`.

**`delete.ts`** — Replace manual writes with `ui.success()`, `ui.info()`.

**`check-git.ts`** — Replace manual label writes with `ui.label()`.

**`sync.ts` / `import.ts`** — Update stubs to use `ui.header()` + `ui.hint('Coming soon.')`.

**`errors.ts`** — Update `fatal()` to use consistent indentation matching `ui.*`.

**Verify:**
```bash
bun run typecheck
bun dist/index.js status
bun dist/index.js check-git
```

**Commit:**
`refactor: standardize all command output through ui helpers`

---

### Task 4: DRY up `linkAllFromStore` in `placer.ts`

**Files:**
- Modify: `src/lib/placer.ts`

**Implementation:**

The skills and agents scanning blocks are nearly identical. Extract a shared scanner:

```typescript
type ScanEntry = { name: string; srcPath: string }

async function scanStoreDir(
  dir: string,
  filter: (entry: Dirent) => boolean,
): Promise<ScanEntry[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter(filter)
      .map((e) => ({ name: e.name, srcPath: join(dir, e.name) }))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    return []
  }
}
```

Then `linkAllFromStore` becomes:

```typescript
export async function linkAllFromStore(storePath: string): Promise<LinkResultEntry[]> {
  const skills = await scanStoreDir(
    join(storePath, 'skills'),
    (e) => e.isDirectory() && !e.name.startsWith('.'),
  )
  const agents = await scanStoreDir(
    join(storePath, 'agents'),
    (e) => e.isFile() && e.name.endsWith('.md'),
  )

  const link = (name: string, src: string, dest: string) =>
    linkSkill(src, dest).then((result) => ({ name, result }))

  const claudeDir = join(homedir(), '.claude')

  return Promise.all([
    ...skills.map((s) => link(s.name, s.srcPath, join(claudeDir, 'skills', s.name))),
    ...agents.map((a) => link(a.name, a.srcPath, join(claudeDir, 'agents', a.name))),
  ])
}
```

**Verify:**
```bash
bun run typecheck
```

**Commit:**
`refactor: DRY up store directory scanning in placer`

---

### Task 5: Add `autoCompletePlugin` to `index.ts`

**Files:**
- Modify: `src/index.ts`

**Implementation:**

Add the "Did you mean?" plugin for mistyped subcommands:

```typescript
import { helpPlugin, versionPlugin, autoCompletePlugin } from '@crustjs/plugins'

// Registration order matters:
.use(versionPlugin('0.1.0'))
.use(autoCompletePlugin({ mode: 'help' }))
.use(helpPlugin())
```

**Verify:**
```bash
bun run build && bun dist/index.js crate
# Should suggest "Did you mean: create?"
```

**Commit:**
`feat: add autocomplete suggestions for mistyped commands`

---

### Task 6: Build and smoke test

**Files:** none

**Implementation:**

```bash
bun run typecheck
bun run build
bun dist/index.js --help
bun dist/index.js check-git
bun dist/index.js status
bun dist/index.js crate  # test autocomplete
```

Verify all output is consistent, no raw `process.stderr.write` remains in commands, and the build is clean.

**Commit:** none (verification only)
