import { writeFileSync, appendFileSync, unlinkSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { detectGh } from './lib/github'
import { startWatcher } from './lib/watcher'

const PID_FILE = join(homedir(), '.skillsync', 'daemon.pid')
const LOG_FILE = join(homedir(), '.skillsync', 'daemon.log')

function log(msg: string): void {
  const line = `${new Date().toISOString()} ${msg}\n`
  appendFileSync(LOG_FILE, line)
}

// Set up log and PID first so failures are diagnosable
writeFileSync(LOG_FILE, '')
writeFileSync(PID_FILE, String(process.pid))

log(`daemon starting (pid ${process.pid})`)

let username: string
try {
  username = detectGh().username
} catch (err) {
  log(`startup failed: ${err instanceof Error ? err.message : String(err)}`)
  try { unlinkSync(PID_FILE) } catch { /* already gone */ }
  process.exit(1)
}

log(`authenticated as @${username}`)

const handle = startWatcher(username, log)

function shutdown(): void {
  log('daemon stopping')
  handle.stop()
  try {
    unlinkSync(PID_FILE)
  } catch {
    // PID file may already be removed
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
