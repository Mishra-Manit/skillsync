Design a minimal, developer-focused landing page for skillsync — a CLI tool that lets dev teams share Claude
  Code skills and agents via a GitHub repo.

  Aesthetic: Take inspiration from crustjs.com — single accent color, generous whitespace, no illustrations. Use a cool/slate palette. Fonts:
  Inter + JetBrains Mono for code.

  Content to include:

  - Hero: Name + tagline — "Share your Claude Code skills. Keep the whole team in sync." — with a prominent
  copyable install command: bunx skillsync-cli join <owner/repo> and a GitHub CTA.
  - Problem/solution: The problem is no built-in way to share Claude Code skills across a team (people zip
  folders and DM each other). The fix is a git-backed shared repo with symlinks into ~/.claude/.
  - How it works: Three steps — skillsync create (one dev sets up the shared repo) → skillsync join
  acme/team-skills (teammates get everything symlinked) → skillsync daemon start (auto-syncs in the background).
  - Features: Git-backed via gh CLI (no new infra), symlink architecture (one source of truth), multi-repo
  support, safe by default (backs up before overwriting), background daemon, runs via bunx (zero install).
  - Commands table: A clean reference of all commands — create, join, sync, import, status, delete, leave, daemon
   start|stop.
  - Footer: minimal — MIT license, GitHub link, built with CrustJS and Bun.

  Make it feel like something a solo developer would ship — confident, direct, no marketing fluff.
