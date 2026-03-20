4. launchd Integration on macOS (High impact, Medium effort)

  Problem: Rebooting kills the daemon permanently. This is the single biggest reliability gap.
  Recommendation: Add skillsync daemon install / skillsync daemon uninstall commands that write a
  ~/Library/LaunchAgents/com.skillsync.daemon.plist. The plist sets KeepAlive: true and RunAtLoad: true,
  pointing at the bun binary and the worker script. This gives you:
  • Automatic start on login
  • Automatic restart on crash (launchd does this natively)
  • Proper process management (no nohup hack)

  On Linux, the equivalent is a ~/.config/systemd/user/skillsync.service unit with Restart=on-failure.
  Tradeoff: This is platform-specific code (two paths: launchd + systemd). It also means the daemon's
  lifecycle is now split between skillsync's PID file and the OS service manager, which can get out of
  sync. You'd need daemon stop to launchctl unload / systemctl --user stop, not just SIGTERM. It's also a
   harder sell for users who are wary of tools installing system services.
  Recommendation: Ship this as opt-in. Keep the current daemon start/stop as the default. Add daemon
  install/daemon uninstall for users who want persistence across reboots. The plist/service file is < 20
  lines.
