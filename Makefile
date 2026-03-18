build:
	bun run build

reset:
	rm -f ~/.claude/skills/debug-session
	rm -f ~/.claude/agents/performance-profiler.md
	rm -rf ~/.skillsync/store/Mishra-Manit
	rm -f ~/.skillsync/config.json
	@echo "reset"

# Join the test repo, then delete one skill and one agent
smoke-delete:
	skillsync join Mishra-Manit/test-skillsync-team
	skillsync delete --repo Mishra-Manit/test-skillsync-team
