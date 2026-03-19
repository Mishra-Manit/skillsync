# skillsync -- Twitter Thread

Target audience: developers using Claude Code, AI-native dev teams, indie hackers, build-in-public crowd.

Thread structure: hook > problem > solution > feature walkthrough > social proof / design flex > CTA.
Keep each tweet under 280 chars. Thread length: 10-12 tweets.

---

## Tweet 1 (Hook)

I built a CLI that lets your entire team share Claude Code skills and agents with one command.

No more copy-pasting markdown files between machines.

bunx skillsync join acme/team-skills

Here's how it works:

---

## Tweet 2 (Problem)

The problem:

You spend hours crafting the perfect Claude Code skill. Custom agents, deployment checklists, code review prompts.

Then your teammate asks "hey can you send me that agent?" and you're zipping folders in Slack.

There's no built-in way to share skills across a team.

---

## Tweet 3 (Solution -- one-liner)

skillsync fixes this.

One GitHub repo holds your team's shared skills and agents. Everyone stays synced via git. Zero infrastructure.

The team lead runs `create`. Teammates run `join`. That's it.

---

## Tweet 4 (Create flow)

`skillsync create` does everything:

- Creates a private GitHub repo
- Scans your machine for existing skills and agents
- Lets you pick which ones to share (nothing selected by default -- no accidental leaks)
- Invites teammates by GitHub username
- Pushes everything and prints the join command

---

## Tweet 5 (Join flow)

Your teammate gets one command:

bunx skillsync join acme/team-skills

It clones the repo, symlinks every skill and agent into their ~/.claude/ directories, and they're done.

Skills are live in Claude Code immediately. No restart needed.

---

## Tweet 6 (Symlink architecture)

The clever part: skillsync uses symlinks, not copies.

Your skills live in ~/.skillsync/store/<owner>/<repo>/. Claude's directories just point there.

Edit a skill in the store, run `sync`, and every teammate gets the update. One source of truth.

---

## Tweet 7 (Multi-repo support)

You can join multiple team repos at once.

Working with two teams? Both skill sets coexist without collision. Each repo is namespaced under its own store path.

`skillsync status` shows everything at a glance -- repos joined, skills linked, last sync time.

---

## Tweet 8 (Safety)

skillsync is careful with your files:

- Never overwrites a real directory -- backs it up to .backup/ first
- Only manages its own symlinks (checks ownership before touching anything)
- `delete` removes links locally, never touches the team repo
- `leave` cleanly tears down everything -- symlinks, store, config

---

## Tweet 9 (Tech / build-in-public)

Built with:

- TypeScript + Bun (fast builds, bunx zero-install distribution)
- CrustJS for the CLI framework (type-safe commands, prompts, config store)
- gh CLI for all GitHub operations (no OAuth, no tokens to manage)
- Zod for schema validation

The whole thing is ~1500 lines across 15 files.

---

## Tweet 10 (Import flow)

Already set up and want to add a new skill?

`skillsync import ~/.claude/skills/my-new-skill`

It copies the skill into the team repo, commits with [skillsync] @you added my-new-skill, pushes, and updates your local symlink.

One command. Your whole team has it.

---

## Tweet 11 (What's next)

What's coming:

- Background daemon with auto-sync (file watcher + polling)
- Conflict resolution with diff-match-patch merging
- Multi-tool support (Codex, Cursor)
- `skillsync add <url>` to pull community skills
- Skill visibility tags (@private, @team, @public)

---

## Tweet 12 (CTA)

skillsync is open source and works today.

Get your team sharing Claude Code skills in under 60 seconds:

bunx skillsync create

GitHub: github.com/manitmishra/skillsync

If you're building with Claude Code, I'd love to hear what skills your team is sharing. Drop them below.
