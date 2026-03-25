build:
	bun run build

reset:
	rm -f ~/.claude/skills/debug-session
	rm -f ~/.claude/agents/performance-profiler.md
	rm -rf ~/.skillsync/store/Mishra-Manit
	rm -f ~/.skillsync/config.json
	@echo "reset"
