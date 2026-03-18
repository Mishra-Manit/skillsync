# CrustJS Reference

> TypeScript-first, Bun-native CLI framework. This doc covers everything needed to build skillsync with CrustJS.

- **Repo:** https://github.com/chenxin-yan/crust
- **NPM Org:** https://www.npmjs.com/org/crustjs
- **License:** MIT

---

## Table of Contents

1. [What is CrustJS](#1-what-is-crustjs)
2. [Installation](#2-installation)
3. [Commands](#3-commands)
4. [Arguments](#4-arguments)
5. [Flags](#5-flags)
6. [Subcommands](#6-subcommands)
7. [Lifecycle Hooks](#7-lifecycle-hooks)
8. [Plugins](#8-plugins)
9. [Error Handling](#9-error-handling)
10. [Environment Variables](#10-environment-variables)
11. [Building & Distribution](#11-building--distribution)
12. [Development Workflow](#12-development-workflow)
13. [@crustjs/prompts](#13-crustjsprompts)
14. [@crustjs/style](#14-crustjsstyle)
15. [@crustjs/store](#15-crustjsstore)
16. [@crustjs/validate](#16-crustjsvalidate)
17. [@crustjs/skills](#17-crustjsskills)
18. [@crustjs/create](#18-crustjscreate)
19. [Types Reference](#19-types-reference)

---

## 1. What is CrustJS

CrustJS sits between a bare arg parser and a heavyweight framework. You pull in only what you need.

**Key traits:**
- Chainable, immutable builder API with full TypeScript inference — no manual type annotations
- Zero runtime dependencies in core
- Built for Bun — no Node compatibility layers
- Compile-time validation catches alias collisions and variadic mistakes before runtime
- Middleware-based plugin system with lifecycle hooks

---

## 2. Installation

```bash
bun add @crustjs/core
bun add @crustjs/plugins        # helpPlugin, versionPlugin, autoCompletePlugin, updateNotifierPlugin
bun add -d @crustjs/crust       # build tooling (crust build, crust publish)

# Optional modules (install what you need)
bun add @crustjs/prompts        # interactive prompts
bun add @crustjs/style          # ANSI styling
bun add @crustjs/store          # typed JSON persistence
bun add @crustjs/validate       # schema-based validation (Zod or Effect)
bun add @crustjs/skills         # generate agent skill files
bun add @crustjs/create         # scaffolding engine
```

---

## 3. Commands

Commands are defined with the `Crust` chainable builder.

```typescript
import { Crust } from "@crustjs/core";
import { helpPlugin, versionPlugin } from "@crustjs/plugins";

const main = new Crust("skillsync")
  .meta({ description: "Share and sync Claude Code agents across your team" })
  .use(versionPlugin("0.1.0"))
  .use(helpPlugin())
  .run(() => {
    console.log("Use --help for available commands");
  });

await main.execute();
```

### `.meta(meta)`

```typescript
.meta({
  description: "Short description shown in help",
  usage: "skillsync [command] [options]", // overrides auto-generated usage
})
```

### `.run(handler)`

Receives `CrustCommandContext`:

```typescript
.run(({ args, flags, rawArgs }) => {
  // args   — parsed positional args (typed from .args() definitions)
  // flags  — parsed named flags (typed from .flags() definitions)
  // rawArgs — everything after --
})
```

Supports async:

```typescript
.run(async ({ args, flags }) => {
  const result = await someAsyncOp();
})
```

### `.execute(options?)`

Parses `process.argv`, resolves subcommands, runs plugins and middleware, executes handler. Never throws — catches all errors, writes to stderr, sets `process.exitCode = 1`.

```typescript
await main.execute();

// Override argv (for testing)
await main.execute({ argv: ["sync", "--verbose"] });
```

### Immutable Builder

Every method returns a new instance. Safe to reuse:

```typescript
const base = new Crust("test").flags({ verbose: { type: "boolean" } });
const a = base.run(() => console.log("A"));
const b = base.run(() => console.log("B"));
// a and b are independent
```

### Type Inference

`required` or `default` on an arg/flag guarantees `T` (non-undefined). Neither yields `T | undefined`.

```typescript
.args([
  { name: "port", type: "number", default: 3000 }, // → number
  { name: "host", type: "string", required: true }, // → string
  { name: "tag",  type: "string" },                 // → string | undefined
])
.flags({
  verbose: { type: "boolean" },                     // → boolean | undefined
  output:  { type: "string", default: "dist" },     // → string
  count:   { type: "number", required: true },      // → number
})
```

---

## 4. Arguments

Positional values mapped to named, typed definitions via `.args()`.

```
skillsync join my-team
#                ^^^^^^^ arg[0]
```

```typescript
const cmd = new Crust("join")
  .args([
    { name: "team", type: "string", required: true, description: "Team name to join" },
    { name: "alias", type: "string", description: "Local alias for the team" },
  ])
  .run(({ args }) => {
    args.team;  // string (required)
    args.alias; // string | undefined
  });
```

### ArgDef Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Argument name (used as key in `args`) |
| `type` | `"string" \| "number" \| "boolean"` | Value type |
| `description` | `string` | Help text |
| `default` | `T` | Used when arg is not provided |
| `required` | `true` | Error if not provided |
| `variadic` | `true` | Collect remaining positionals into array (last arg only) |

### Type Coercion

| Type | Behavior |
|---|---|
| `"string"` | Value kept as-is |
| `"number"` | Coerced; throws `PARSE` if invalid |
| `"boolean"` | `"true"` / `"1"` → `true` |

### Variadic Arguments

```typescript
new Crust("import")
  .args([
    { name: "destination", type: "string", required: true },
    { name: "files", type: "string", variadic: true },
  ])
  .run(({ args }) => {
    args.destination; // string
    args.files;       // string[]
  });
```

Only the **last** argument can be variadic. Enforced at compile time and runtime.

### The `--` Separator

```typescript
.run(({ rawArgs }) => {
  // rawArgs: everything after --
})
```

```bash
skillsync sync -- --extra-flag
# rawArgs: ["--extra-flag"]
```

---

## 5. Flags

Named options via `--name` (long) or `-n` (short), defined with `.flags()`.

```typescript
new Crust("sync")
  .flags({
    verbose: { type: "boolean", short: "v", description: "Verbose output" },
    repo:    { type: "string",  short: "r", description: "Target repo URL" },
    port:    { type: "number",  default: 3000 },
  })
  .run(({ flags }) => {
    flags.verbose; // boolean | undefined
    flags.repo;    // string | undefined
    flags.port;    // number (has default)
  });
```

### FlagDef Properties

| Property | Type | Description |
|---|---|---|
| `type` | `"string" \| "number" \| "boolean"` | Value type |
| `description` | `string` | Help text |
| `default` | `T` | Default value |
| `required` | `true` | Error if not provided |
| `short` | `string` | Single-char short form (`-x`) |
| `aliases` | `string[]` | Additional long-form aliases |
| `multiple` | `true` | Collect repeated values into array |
| `inherit` | `true` | Make available to subcommands |

### Boolean Flags

```bash
my-cli --verbose        # true
my-cli --no-verbose     # false (--no-* negation)
```

- `--no-` prefix is **reserved** — cannot be used as a flag name or alias
- `--verbose=true` is a parse error
- When repeated, last occurrence wins

### Multiple Values

```typescript
.flags({
  target: { type: "string", multiple: true, short: "t" },
})

// my-cli --target linux-x64 --target darwin-arm64
// flags.target → string[] | undefined
```

### Flag Inheritance

Make a flag available across all subcommands:

```typescript
const app = new Crust("skillsync")
  .flags({
    verbose: { type: "boolean", short: "v", inherit: true },
  })
  .command("sync", (cmd) =>
    cmd.run(({ flags }) => {
      flags.verbose; // inherited, typed as boolean | undefined
    })
  );
```

### Unknown Flags

Crust uses strict mode. Unknown flags throw a `PARSE` error immediately.

---

## 6. Subcommands

Build nested command trees like `skillsync create`, `skillsync join`, etc.

### Inline Subcommands (default pattern)

```typescript
const main = new Crust("skillsync")
  .use(helpPlugin())
  .command("create", (cmd) =>
    cmd
      .meta({ description: "Create a new team" })
      .args([{ name: "name", type: "string", required: true }])
      .run(({ args }) => {
        console.log(`Creating team: ${args.name}`);
      })
  )
  .command("join", (cmd) =>
    cmd
      .meta({ description: "Join an existing team" })
      .args([{ name: "repo", type: "string", required: true }])
      .run(({ args }) => { /* ... */ })
  );

await main.execute();
```

### File-Split Pattern (for inherited flags)

Use `.sub()` for subcommands in separate files that need parent's `inherit: true` flags:

```typescript
// shared.ts
export const app = new Crust("skillsync")
  .flags({ verbose: { type: "boolean", short: "v", inherit: true } });

// commands/sync.ts
import { app } from "../shared.ts";

export const syncCmd = app.sub("sync")
  .meta({ description: "Sync skills from remote" })
  .flags({ dry: { type: "boolean", description: "Dry run" } })
  .run(({ flags }) => {
    flags.verbose; // boolean | undefined — inherited and typed
    flags.dry;     // boolean | undefined — local
  });

// cli.ts
import { app } from "./shared.ts";
import { syncCmd } from "./commands/sync.ts";

await app.command(syncCmd).execute();
```

### Routing Algorithm

Crust walks the subcommand tree **before** parsing flags. Each token is checked against subcommand names — matched → recurse; no match → positional arg or `COMMAND_NOT_FOUND`.

### Container Commands

A command with subcommands but no `.run()` handler. Running it directly triggers help automatically.

### Dual Commands

A command can have both `.run()` and subcommands. First positional checked against subcommand names; if no match, treated as a positional arg.

### Nested Subcommands

```typescript
new Crust("skillsync")
  .command("create", (create) =>
    create
      .command("agent", (cmd) =>
        cmd.run(({ args }) => { /* ... */ })
      )
      .command("skill", (cmd) =>
        cmd.run(({ args }) => { /* ... */ })
      )
  );
```

```bash
skillsync create agent
skillsync create skill
```

### Unknown Subcommands

Throws `COMMAND_NOT_FOUND` with details:
```typescript
{
  input: "crate",             // what the user typed
  available: ["create", "join"], // valid subcommands
  commandPath: ["skillsync"],
  parentCommand: main,
}
```

`autoCompletePlugin` catches this and shows "Did you mean?" suggestions.

---

## 7. Lifecycle Hooks

Three hooks around command execution: `preRun` → `run` → `postRun`.

```typescript
new Crust("deploy")
  .preRun(async ({ flags }) => {
    // validation, setup — runs before run()
  })
  .run(async ({ flags }) => {
    // main logic
  })
  .postRun(async ({ flags }) => {
    // cleanup — runs even if run() throws (finally block)
  });
```

### Full Execution Order

```
plugin setup → routing → parsing → middleware chain → preRun → run → postRun
```

Middleware wraps the hook chain in an onion model:

```
middleware A → middleware B → preRun → run → postRun
```

### Hook Context

All three hooks receive `CrustCommandContext<A, F>`:

```typescript
interface CrustCommandContext<A, F> {
  args: InferArgs<A>;
  flags: InferFlags<F>;
  rawArgs: string[];
  command: CommandNode;
}
```

### Execution Phases

1. **Initialization** — Plugin `setup()` hooks run sequentially
2. **Routing & Parsing** — `resolveCommand()` + `parseArgs()`
3. **Middleware & Hooks** — Onion chain with hooks at center
4. **Error Handling** — `.execute()` catches all, prints to stderr, exits 1

---

## 8. Plugins

Middleware-based extension system with setup (once at init) and middleware (per invocation).

### Official Plugins

```typescript
import { helpPlugin, versionPlugin, autoCompletePlugin, updateNotifierPlugin } from "@crustjs/plugins";
```

| Plugin | Purpose |
|---|---|
| `helpPlugin()` | Adds `--help` / `-h` with auto-generated help text |
| `versionPlugin(v)` | Adds `--version` / `-v` to root command |
| `autoCompletePlugin()` | "Did you mean?" on mistyped subcommands |
| `updateNotifierPlugin()` | Checks npm for newer versions |

### Recommended Registration Order

```typescript
new Crust("skillsync")
  .use(versionPlugin("0.1.0"))
  .use(autoCompletePlugin({ mode: "help" }))
  .use(helpPlugin())
```

### Custom Plugin

```typescript
import type { CrustPlugin } from "@crustjs/core";

function timingPlugin(): CrustPlugin {
  return {
    name: "timing",
    async middleware(context, next) {
      const start = performance.now();
      await next();
      const ms = (performance.now() - start).toFixed(2);
      console.log(`Done in ${ms}ms`);
    },
  };
}
```

### Plugin Setup Phase

Runs once at init, before parsing. Can inject flags and subcommands:

```typescript
const myPlugin: CrustPlugin = {
  name: "my-plugin",
  setup(context, actions) {
    actions.addFlag(context.rootCommand, "debug", {
      type: "boolean",
      description: "Enable debug mode",
    });
  },
};
```

### Plugin State

Plugins share state via `context.state`:

```typescript
{
  setup(context) {
    context.state.set("auth.token", process.env.API_TOKEN);
  },
  async middleware(context, next) {
    const token = context.state.get<string>("auth.token");
    if (!token) { process.exitCode = 1; return; }
    await next();
  },
}
```

State API: `get<T>(key)`, `set(key, value)`, `has(key)`, `delete(key)`.

### Always call `next()`

Unless intentionally blocking execution, always call `next()` in middleware.

---

## 9. Error Handling

### CrustError

Every framework-level error is a `CrustError` instance:

```typescript
import { CrustError } from "@crustjs/core";

try {
  parseArgs(cmd._node, ["--unknown"]);
} catch (error) {
  if (error instanceof CrustError) {
    console.log(error.code);    // "PARSE"
    console.log(error.message); // 'Unknown flag "--unknown"'
  }
}
```

### Error Codes

| Code | When |
|---|---|
| `DEFINITION` | Invalid flag/arg definition (alias collision, `no-` prefix, empty name) |
| `VALIDATION` | Missing required arg/flag, failed schema validation |
| `PARSE` | Unknown flag, invalid number coercion, bad boolean syntax |
| `EXECUTION` | Error thrown in command handler |
| `COMMAND_NOT_FOUND` | User typed an unknown subcommand |

### Type Narrowing with `.is()`

```typescript
if (error instanceof CrustError) {
  if (error.is("COMMAND_NOT_FOUND")) {
    console.log(`Unknown: ${error.details.input}`);
    console.log(`Available: ${error.details.available.join(", ")}`);
  }

  if (error.is("VALIDATION")) {
    console.log("Missing required input:", error.message);
  }
}
```

### Throwing in Commands

```typescript
// Framework-level (structured)
throw new CrustError("VALIDATION", `Invalid config: ${flags.config}`);

// Application-level (plain Error, auto-wrapped to EXECUTION)
throw new Error(`Deployment failed: ${result.message}`);
```

### Three Validation Layers

1. **Compile-time** — TypeScript catches variadic position, alias collisions, `no-` prefix
2. **Runtime** — Builder methods and `parseArgs` throw `CrustError("DEFINITION" | "PARSE")`
3. **Pre-compile** — `crust build` runs validation subprocess before compiling

---

## 10. Environment Variables

### Runtime (secrets, deployment config)

Bun auto-loads `.env` files at runtime, including in compiled executables:

```typescript
const token = process.env.API_TOKEN;
if (!token) throw new Error("Missing API_TOKEN");
```

### Build-time Constants (public config)

Use `PUBLIC_*` prefix — values are embedded in the binary:

```bash
crust build --env-file .env.production
```

```
PUBLIC_API_ORIGIN=https://api.example.com   # embedded in binary
API_TOKEN=secret                            # NOT embedded
```

**Warning:** `PUBLIC_*` values are visible in the binary. Never put secrets there.

### Recommended Pattern

```typescript
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  apiToken: required("API_TOKEN"),
  publicApiOrigin: process.env.PUBLIC_API_ORIGIN,
};
```

---

## 11. Building & Distribution

### Basic Build

```bash
# Build for all platforms (default)
crust build

# Custom entry point
crust build --entry src/cli.ts

# Specific platform
crust build --target darwin-arm64

# With env file
crust build --env-file .env.production
```

### Build Flags

| Flag | Alias | Default | Description |
|---|---|---|---|
| `--entry` | `-e` | `src/cli.ts` | Entry file |
| `--outfile` | `-o` | — | Output path (single-target only) |
| `--name` | `-n` | auto | Binary name |
| `--minify` | — | `true` | Minify output |
| `--target` | `-t` | all platforms | Target(s), repeatable |
| `--outdir` | `-d` | `dist` | Output directory |
| `--env-file` | — | — | Env file(s), repeatable |
| `--validate` | — | `true` | Pre-compile validation |
| `--package` | — | `false` | Stage npm packages in `dist/npm` |

### Supported Targets

| Alias | Platform |
|---|---|
| `linux-x64` | Linux x86_64 |
| `linux-arm64` | Linux ARM64 |
| `darwin-x64` | macOS Intel |
| `darwin-arm64` | macOS Apple Silicon |
| `windows-x64` | Windows x86_64 |
| `windows-arm64` | Windows ARM64 |

### Multi-Target Output

```
dist/
├── cli                   # Shell resolver (detect platform, exec binary)
├── cli.cmd               # Windows batch resolver
├── my-cli-bun-linux-x64-baseline
├── my-cli-bun-darwin-arm64
└── ...
```

Reference `dist/cli` in `package.json`'s `bin` field.

### package.json Setup

```json
{
  "name": "skillsync",
  "bin": { "skillsync": "dist/cli" },
  "scripts": {
    "build": "crust build",
    "prepack": "bun run build"
  }
}
```

### Publishing

```bash
crust build --package       # Stage npm packages in dist/npm
crust publish               # Publish platform packages, then root
crust publish --dry-run
crust publish --tag next
```

---

## 12. Development Workflow

```bash
# Run source directly (fastest loop)
bun run src/cli.ts --help
bun run src/cli.ts create my-team

# Type check
bun run check:types

# Build and test binary
bun run build
./dist/cli --help
```

### Linked Install

```bash
bun link                    # Register locally
bun link -g skillsync       # Global availability
skillsync --help
```

### Smoke Test Packed Artifact

```bash
bun run build
TARBALL="$(pwd)/$(bun pm pack 2>/dev/null | tail -1)"
mkdir -p ../skillsync-install && cd ../skillsync-install
bun init -y && bun add "$TARBALL"
./node_modules/.bin/skillsync --help
```

---

## 13. @crustjs/prompts

Interactive terminal prompts. Renders to stderr (stdout stays clean for pipes).

```typescript
import { input, confirm, select, multiselect, spinner } from "@crustjs/prompts";
```

### `input(options)`

```typescript
const name = await input({
  message: "Team name?",
  placeholder: "my-team",
  default: "my-team",
  validate: (v) => v.length > 0 || "Name is required",
});
```

| Option | Type | Description |
|---|---|---|
| `message` | `string` | Prompt message |
| `placeholder` | `string` | Shown when empty |
| `default` | `string` | Used on empty submit |
| `initial` | `string` | Skip prompt, return immediately (CI) |
| `validate` | `(v: string) => true \| string` | Return `true` or error message |
| `theme` | `PartialPromptTheme` | Per-prompt style overrides |

### `password(options)`

```typescript
const token = await password({
  message: "GitHub token:",
  validate: (v) => v.length > 0 || "Required",
});
```

Same options as `input` plus `mask` (default `"*"`).

### `confirm(options)`

```typescript
const ok = await confirm({
  message: "Push to remote?",
  default: false,
  active: "Yes",
  inactive: "No",
});
```

Toggle with arrow keys, h/l, y/n, or Tab.

### `select(options)`

```typescript
const scope = await select({
  message: "Install scope",
  choices: [
    { label: "Global (~/.claude)", value: "global" },
    { label: "Project (.claude)", value: "project", hint: "recommended" },
  ],
  default: "project",
});
```

| Option | Type | Description |
|---|---|---|
| `choices` | `Choice<T>[]` | Strings or `{ label, value, hint? }` |
| `default` | `T` | Sets initial cursor |
| `maxVisible` | `number` | Scroll threshold (default 10) |

### `multiselect(options)`

```typescript
const skills = await multiselect({
  message: "Select skills to share",
  choices: [
    { label: "brainstorming", value: "brainstorming" },
    { label: "commit", value: "commit", hint: "recommended" },
    { label: "review", value: "review" },
  ],
  default: [],
  required: true,
});
```

Space to toggle, `a` toggle-all, `i` invert, Enter to confirm.

| Extra Option | Type | Description |
|---|---|---|
| `required` | `boolean` | Require at least one selection |
| `min` | `number` | Minimum selections |
| `max` | `number` | Maximum selections |

### `filter(options)`

Fuzzy-search selection — type to filter, matched characters highlighted:

```typescript
const lang = await filter({
  message: "Search agent",
  choices: ["brainstorming", "commit", "review", "plan"],
  placeholder: "Type to filter...",
});
```

### `spinner(options)`

```typescript
const result = await spinner({
  message: "Cloning repo...",
  task: async ({ updateMessage }) => {
    await cloneRepo(url);
    updateMessage("Installing...");
    await install();
    return result;
  },
  spinner: "dots", // "dots" | "line" | "arc" | "bounce" | { frames, interval }
});
```

Works in non-TTY environments (skips animation, prints final line only).

### Non-Interactive / CI

All prompts accept `initial` to skip interactivity:

```typescript
const name = await input({
  message: "Team name?",
  initial: process.env.CI_TEAM_NAME,
});
```

Without `initial` in a non-TTY environment, prompts throw `NonInteractiveError`.

### Error Handling

```typescript
import { NonInteractiveError, CancelledError } from "@crustjs/prompts";

try {
  const answer = await input({ message: "?" });
} catch (err) {
  if (err instanceof CancelledError) process.exit(0);     // Ctrl+C
  if (err instanceof NonInteractiveError) process.exit(1); // not a TTY
}
```

### Theming

```typescript
import { setTheme, createTheme } from "@crustjs/prompts";
import { magenta, cyan } from "@crustjs/style";

setTheme({ prefix: magenta, success: cyan }); // global
```

Theme slots: `prefix`, `message`, `placeholder`, `cursor`, `selected`, `unselected`, `error`, `success`, `hint`, `spinner`, `filterMatch`.

Resolution order: default → `setTheme()` → per-prompt `theme` option (later wins).

---

## 14. @crustjs/style

ANSI-safe styling primitives with terminal capability awareness.

```typescript
import { bold, red, cyan, dim, italic, green } from "@crustjs/style";

console.log(bold("Build succeeded"));
console.log(red("Error: missing argument"));
console.log(dim("note: check your config"));
```

### Modifiers

`bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`

### Colors (Foreground)

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`
`brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`, `brightWhite`

### Background Colors

`bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`
`bgBrightBlack`, `bgBrightRed`, `bgBrightGreen`, `bgBrightYellow`, `bgBrightBlue`, `bgBrightMagenta`, `bgBrightCyan`, `bgBrightWhite`

### Truecolor

```typescript
import { rgb, bgRgb, hex, bgHex } from "@crustjs/style";

rgb("text", 0, 128, 255)
hex("text", "#ff8800")
bgRgb("text", 255, 128, 0)
bgHex("text", "#ff0000")
```

In `auto` mode, truecolor only emits when `COLORTERM=truecolor|24bit` or similar is set.

### Mode-Aware Instance

```typescript
import { createStyle } from "@crustjs/style";

const s = createStyle();             // auto
const color = createStyle({ mode: "always" });
const plain = createStyle({ mode: "never" });

console.log(s.bold.red("error"));
console.log(plain.red("error"));     // "error" no ANSI
```

### Text Layout

```typescript
import { visibleWidth, wrapText, padEnd, table } from "@crustjs/style";

// ANSI-aware width (strips sequences before measuring)
const w = visibleWidth(styledText);

// Wrap styled text
const wrapped = wrapText(longText, 80);

// Formatted table
console.log(table(
  ["Command", "Description"],
  [
    ["create", "Create a new team"],
    ["join",   "Join an existing team"],
  ]
));
```

### Block Helpers

```typescript
import { unorderedList, orderedList, taskList } from "@crustjs/style";

unorderedList(["item A", "item B"])
orderedList(["first", "second"])
taskList([{ text: "Done", checked: true }, { text: "Pending", checked: false }])
```

---

## 15. @crustjs/store

Typed JSON persistence with platform-standard directory resolution.

```typescript
import { createStore, configDir } from "@crustjs/store";

const store = createStore({
  dirPath: configDir("skillsync"),
  fields: {
    token:   { type: "string",  default: "" },
    verbose: { type: "boolean", default: false },
    team:    { type: "string",  default: "" },
  },
});

const state = await store.read();       // returns defaults when no file exists
await store.write({ ...state, token: "abc" });
await store.update((s) => ({ ...s, verbose: true }));
await store.patch({ team: "my-team" }); // shallow merge, preserves other keys
await store.reset();                    // deletes file, reverts to defaults
```

### Path Helpers

| Helper | Linux / macOS | Windows |
|---|---|---|
| `configDir(app)` | `~/.config/<app>` | `%APPDATA%\<app>` |
| `dataDir(app)` | `~/.local/share/<app>` | `%LOCALAPPDATA%\<app>\Data` |
| `stateDir(app)` | `~/.local/state/<app>` | `%LOCALAPPDATA%\<app>\State` |
| `cacheDir(app)` | `~/.cache/<app>` | `%LOCALAPPDATA%\<app>\Cache` |

Use `configDir` for user preferences, `dataDir` for important app data, `stateDir` for runtime state, `cacheDir` for regenerable data.

### Multiple Stores

```typescript
const dir = configDir("skillsync");

const config = createStore({ dirPath: dir, fields: { /* ... */ } });
// → ~/.config/skillsync/config.json

const auth = createStore({ dirPath: dir, name: "auth", fields: { token: { type: "string", default: "" } } });
// → ~/.config/skillsync/auth.json
```

### Field Definition

```typescript
fields: {
  theme:    { type: "string",  default: "light" },
  count:    { type: "number",  default: 0 },
  verbose:  { type: "boolean", default: false },
  tags:     { type: "string",  array: true, default: [] },
}
```

### Validation

```typescript
// Manual validator
fields: {
  port: {
    type: "number",
    default: 3000,
    validate(value) {
      if (value < 1 || value > 65535) throw new Error("port must be 1–65535");
    },
  },
}

// Schema-based (Zod)
import { field } from "@crustjs/validate/zod";
import { z } from "zod";

fields: {
  theme: {
    type: "string",
    default: "light",
    validate: field(z.enum(["light", "dark"])),
  },
}
```

### Error Handling

```typescript
import { CrustStoreError } from "@crustjs/store";

try {
  const state = await store.read();
} catch (err) {
  if (err instanceof CrustStoreError) {
    if (err.is("PARSE"))      console.error("Corrupt config file");
    if (err.is("IO"))         console.error(`${err.details.operation} failed`);
    if (err.is("VALIDATION")) err.details.issues.forEach(i => console.error(i.message));
  }
}
```

Error codes: `PATH` | `PARSE` | `IO` | `VALIDATION`

### Defaults Merge Rules

- Persisted values override defaults
- Missing keys fall back to defaults (in memory only — not written to disk)
- Unknown persisted keys dropped by default (`pruneUnknown: true`)
- Falsy values (`null`, `0`, `""`, `false`) in persisted file are preserved
- `read()` on malformed JSON throws immediately (no silent fallback to defaults)

---

## 16. @crustjs/validate

Schema-first validation for args, flags, prompts, and stores. Built on Standard Schema v1.

### Entrypoints

| Import | Use case |
|---|---|
| `@crustjs/validate/zod` | Zod 4 schemas for commands, prompts, stores |
| `@crustjs/validate/effect` | Effect Schema |
| `@crustjs/validate/standard` | Any Standard Schema v1 library (prompt/store only) |

### Command Validation with Zod

```typescript
import { Crust } from "@crustjs/core";
import { arg, flag, commandValidator } from "@crustjs/validate/zod";
import { z } from "zod";

const greet = new Crust("greet")
  .args([arg("name", z.string().min(1).describe("Person to greet"))])
  .flags({
    loud: flag(z.boolean().default(false).describe("Shout"), { short: "l" }),
    port: flag(z.number().int().min(1).max(65535).default(3000)),
  })
  .run(commandValidator(({ args, flags }) => {
    // args.name is string, flags.loud is boolean, flags.port is number — all fully typed
  }));
```

- Use `arg(name, schema)` for positional args
- Use `flag(schema, options?)` for flags; `options` supports `short`, `aliases`
- Wrap handler with `commandValidator(handler)`

### Variadic Args with Zod

```typescript
.args([arg("files", z.string(), { variadic: true })])
// args.files is string[] — use scalar schema, not z.array()
```

### Prompt Validation

```typescript
import { promptValidator, parsePromptValue } from "@crustjs/validate/zod";
import { input } from "@crustjs/prompts";
import { z } from "zod";

// Validate in prompt
const name = await input({
  message: "Team name?",
  validate: promptValidator(z.string().min(1, "Required")),
});

// Parse and coerce after prompt
const raw = await input({ message: "Port?" });
const port = await parsePromptValue(z.coerce.number().int().positive(), raw);
// port is typed as number
```

### Store Validation

```typescript
import { field } from "@crustjs/validate/zod";
import { z } from "zod";

fields: {
  theme: {
    type: "string",
    default: "light",
    validate: field(z.enum(["light", "dark"])),
  },
}
```

### Schema Support (Zod)

Primitives: `z.string()`, `z.number()`, `z.boolean()`
Enums: `z.enum([...])`, `z.literal("value")`
Arrays: `z.array(z.string())` (for `multiple: true` flags)
Wrappers: `.optional()`, `.default()`, `.nullable()`, `.transform()`, `.pipe()`
Descriptions: `.describe("text")` auto-extracted for help output

---

## 17. @crustjs/skills

Generates agent skill files from CLI command definitions so AI assistants can understand your CLI.

### Plugin Registration

```typescript
import { skillPlugin } from "@crustjs/skills";

const app = new Crust("skillsync")
  .use(skillPlugin({
    version: "0.1.0",
    defaultScope: "global",     // "global" | "project" | omit to prompt
    autoUpdate: true,           // silently update when version changes
    command: "skill",           // registers "skillsync skill" subcommand
    instructions: `
Read command docs before suggesting exact flags.
Prefer exact syntax copied from the relevant command file.
    `,
  }));
```

This registers a `skillsync skill` subcommand that interactively installs/uninstalls agent skills.

### Plugin Options

```typescript
interface SkillPluginOptions {
  version: string;
  defaultScope?: "global" | "project";
  autoUpdate?: boolean;          // default true
  command?: string;              // default "skill"
  instructions?: string | string[];
}
```

### Supported Agents

**Universal group** (single toggle, shared `~/.agents/` path):
`amp`, `cline`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, `kimi-cli`, `opencode`, `replit`

**Additional agents** (detected by presence, each with own path):
`claude-code`, `windsurf`, `roo`, `continue`, `augment`, `goose`, `trae`, and many more.

### Annotating Commands

Add agent-facing instructions to specific commands without touching the public API:

```typescript
import { annotate } from "@crustjs/skills";

const sync = annotate(
  new Crust("sync").run(() => { /* ... */ }),
  [
    "Always check sync status before running.",
    "Prefer --dry-run before actual sync.",
  ]
);
```

`string` → raw markdown block; `string[]` → bullet list in `SKILL.md`.

### Skill Metadata

```typescript
const meta: SkillMeta = {
  name: "skillsync",
  description: "CLI for sharing Claude Code skills",
  version: "0.1.0",
  allowedTools: "Bash(skillsync *) Read Grep",
  license: "MIT",
};
```

### Conflict Detection

Each generated skill dir has a `crust.json` marker. Existing dirs without it trigger `SkillConflictError`.

```typescript
import { generateSkill, SkillConflictError } from "@crustjs/skills";

try {
  await generateSkill({ command, meta, agents });
} catch (err) {
  if (err instanceof SkillConflictError) {
    await generateSkill({ command, meta, agents, force: true });
  }
}
```

### Low-Level Primitives

```typescript
import { detectInstalledAgents, generateSkill, uninstallSkill, skillStatus, isValidSkillName } from "@crustjs/skills";

isValidSkillName("skillsync"); // true — 1-64 lowercase alphanumeric + hyphens

const agents = await detectInstalledAgents();

await generateSkill({
  command: rootCommandNode,
  meta: { name: "skillsync", description: "...", version: "0.1.0" },
  agents: ["claude-code", ...agents],
  scope: "global",
});

const status = await skillStatus({ name: "skillsync", agents });
await uninstallSkill({ name: "skillsync", agents });
```

---

## 18. @crustjs/create

Headless scaffolding engine for `create-xxx` / `bun create-xxx` tools.

```typescript
import { scaffold, runSteps } from "@crustjs/create";

const result = await scaffold({
  template: "./templates/base",
  dest: "./my-project",
  context: { name: "my-app", description: "A cool CLI" },
  conflict: "overwrite", // "abort" (default) | "overwrite"
});

console.log("Created:", result.files);

await runSteps(
  [
    { type: "install" },
    { type: "git-init", commit: "Initial commit" },
    { type: "open-editor" },
  ],
  "./my-project"
);
```

### Template Conventions

- `{{var}}` placeholders in text files are replaced with `context` values
- `_gitignore` → `.gitignore` (underscore prefix → dotfile)
- `__tests__` preserved unchanged (double underscore)
- Binary files auto-detected (null-byte check) and copied as-is

### Template Composition

```typescript
await scaffold({ template: "./templates/base", dest, context });
await scaffold({ template: "./templates/typescript", dest, context, conflict: "overwrite" });
```

### Post-Scaffold Steps

| Type | Fields | Description |
|---|---|---|
| `install` | — | Detect package manager, run install |
| `git-init` | `commit?: string` | `git init`, optional stage + commit |
| `open-editor` | — | Open `$EDITOR` or VS Code |
| `command` | `cmd: string`, `cwd?: string` | Run arbitrary shell command |

### Utilities

```typescript
import { interpolate, detectPackageManager, isGitInstalled, getGitUser } from "@crustjs/create";

interpolate("Hello, {{name}}!", { name: "world" }); // "Hello, world!"

const pm = await detectPackageManager(); // "bun" | "npm" | "pnpm" | "yarn"
const git = await isGitInstalled();      // boolean
const user = await getGitUser();         // { name: string | null, email: string | null }
```

---

## 19. Types Reference

### Core Types

```typescript
// Command context passed to run/preRun/postRun
interface CrustCommandContext<A extends ArgsDef, F extends FlagsDef> {
  args: InferArgs<A>;
  flags: InferFlags<F>;
  rawArgs: string[];
  command: CommandNode;
}

// Command metadata
interface CommandMeta {
  name: string;
  description?: string;
  usage?: string;
}

// Plugin interface
interface CrustPlugin {
  name?: string;
  setup?: (context: SetupContext, actions: SetupActions) => void | Promise<void>;
  middleware?: PluginMiddleware;
}

// Middleware context
interface MiddlewareContext {
  readonly argv: readonly string[];
  readonly rootCommand: CommandNode;
  readonly state: PluginState;
  route: Readonly<CommandRoute> | null;
  input: ParseResult | null;
}

// Route resolved from argv
interface CommandRoute {
  command: CommandNode;
  argv: string[];
  commandPath: string[];
}
```

### Inference Types

```typescript
// Args inference
// { type: "string" }              → string | undefined
// { type: "string", required: true } → string
// { type: "string", default: "x" }  → string
// { type: "string", variadic: true } → string[]

// Flags inference
// { type: "string" }              → string | undefined
// { type: "string", required: true } → string
// { type: "string", default: "x" }  → string
// { type: "boolean" }             → boolean | undefined
// { type: "string", multiple: true } → string[] | undefined
// { type: "string", multiple: true, required: true } → string[]
```

### Flag Inheritance Types

```typescript
// Selects flags with inherit: true
type InheritableFlags<F extends FlagsDef> = { ... }

// Merges parent + local (local overrides)
type MergeFlags<Parent, Local> = Omit<Parent, keyof Local> & Local;

// Effective flags in subcommand handlers
type EffectiveFlags<Inherited, Local> = MergeFlags<InheritableFlags<Inherited>, Local>;
```

### Compile-Time Validators

```typescript
ValidateVariadicArgs<A>        // only last arg can be variadic
ValidateFlagAliases<F>         // no alias collisions
ValidateNoPrefixedFlags<F>     // no no-* flag names or aliases
```

Violations add branded error properties (e.g., `FIX_VARIADIC_POSITION`) to the offending definition, surfacing as TypeScript errors.

### CrustError

```typescript
class CrustError extends Error {
  code: CrustErrorCode;
  is<C extends CrustErrorCode>(code: C): this is CrustError & { details: ... };
  withCause(cause: unknown): this;
  cause: unknown;
}

type CrustErrorCode = "DEFINITION" | "VALIDATION" | "PARSE" | "EXECUTION" | "COMMAND_NOT_FOUND";
```

### ArgDef / FlagDef

```typescript
type ArgDef = {
  name: string;
  type: "string" | "number" | "boolean";
  description?: string;
  default?: T;
  required?: true;
  variadic?: true;
};

type FlagDef = {
  type: "string" | "number" | "boolean";
  description?: string;
  default?: T;
  required?: true;
  short?: string;
  aliases?: string[];
  multiple?: true;
  inherit?: true;
};
```
