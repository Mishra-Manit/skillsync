import { appendFileSync, unlinkSync, statSync, renameSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { detectGh } from './lib/github'
import { startWatcher } from './lib/watcher'

const SKILLSYNC_DIR = join(homedir(), '.skillsync')
const PID_FILE = join(SKILLSYNC_DIR, 'daemon.pid')
const LOG_FILE = join(SKILLSYNC_DIR, 'daemon.log')
const LOG_BACKUP = join(SKILLSYNC_DIR, 'daemon.log.1')
const MAX_LOG_BYTES = 1024 * 1024 // 1 MB

function rotateLogIfNeeded(): void {
  try {
    const { size } = statSync(LOG_FILE)
    if (size < MAX_LOG_BYTES) return
    try { renameSync(LOG_FILE, LOG_BACKUP) } catch { /* best effort */ }
  } catch {
    // log file doesn't exist yet — nothing to rotate
  }
}

function log(msg: string): void {
  rotateLogIfNeeded()
  const line = `${new Date().toISOString()} ${msg}\n`
  appendFileSync(LOG_FILE, line)
}

// Append a session separator instead of truncating previous logs
Bun.write(PID_FILE, String(process.pid))
log(`--- daemon starting (pid ${process.pid}) ---`)

let handle: ReturnType<typeof startWatcher> | null = null

function shutdown(code = 0): void {
  log('daemon stopping')
  handle?.stop()
  try { unlinkSync(PID_FILE) } catch { /* already gone */ }
  process.exit(code)
}

// Crash handlers — log the error, clean up, exit
process.on('uncaughtException', (err) => {
  log(`FATAL uncaught exception: ${err.message}`)
  if (err.stack) log(err.stack)
  shutdown(1)
})

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  log(`FATAL unhandled rejection: ${msg}`)
  if (reason instanceof Error && reason.stack) log(reason.stack)
  shutdown(1)
})

process.on('SIGTERM', () => shutdown(0))
process.on('SIGINT', () => shutdown(0))

let username: string
try {
  username = detectGh().username
} catch (err) {
  log(`startup failed: ${err instanceof Error ? err.message : String(err)}`)
  try { unlinkSync(PID_FILE) } catch { /* already gone */ }
  process.exit(1)
}

log(`authenticated as @${username}`)

handle = startWatcher(username, log)
