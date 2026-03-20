import { readFileSync, existsSync, statSync, unlinkSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { readConfig } from '../lib/config'
import { ui } from '../lib/ui'

const PID_FILE = join(homedir(), '.skillsync', 'daemon.pid')
const LOG_FILE = join(homedir(), '.skillsync', 'daemon.log')

function readPid(): number | null {
  try {
    const raw = readFileSync(PID_FILE, 'utf8').trim()
    const pid = parseInt(raw, 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function cleanStalePid(): void {
  try {
    unlinkSync(PID_FILE)
  } catch {
    // already gone
  }
}

function getWorkerPath(): string {
  // Compiled: index.js and daemon-worker.js are siblings in dist/
  const compiled = join(import.meta.dir, 'daemon-worker.js')
  if (existsSync(compiled)) return compiled

  // Dev fallback: src/commands/daemon.ts -> src/daemon-worker.ts
  return join(import.meta.dir, '..', 'daemon-worker.ts')
}

async function spawnWorker(): Promise<number | null> {
  const workerPath = getWorkerPath()
  const proc = Bun.spawn(['nohup', 'bun', workerPath], {
    stdout: 'ignore',
    stderr: 'ignore',
    stdin: 'ignore',
  })
  proc.unref()

  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const pid = readPid()
    if (pid !== null && isAlive(pid)) return pid
  }
  return null
}

/**
 * Silently revive the daemon if it's dead and the user has joined repos.
 * No UI output — intended for the auto-revive plugin.
 */
export async function reviveDaemonIfNeeded(): Promise<void> {
  const pid = readPid()
  if (pid !== null && isAlive(pid)) return

  // Only revive if the user actually has repos to sync
  const config = await readConfig()
  if (!config || Object.keys(config.repos).length === 0) return

  if (pid !== null) cleanStalePid()
  await spawnWorker()
}

export async function ensureDaemonRunning(): Promise<void> {
  const pid = readPid()
  if (pid !== null && isAlive(pid)) {
    ui.info('Background sync already running.')
    return
  }

  if (pid !== null) cleanStalePid()

  const newPid = await spawnWorker()
  if (newPid !== null) {
    ui.success('Background sync started.')
  } else {
    ui.warn(`Daemon may not have started. Check ${LOG_FILE}`)
  }
}

export async function runDaemonStart(): Promise<void> {
  ui.header('daemon start')

  const pid = readPid()
  if (pid !== null && isAlive(pid)) {
    ui.warn(`Daemon is already running (pid ${pid}).`)
    ui.blank()
    return
  }

  if (pid !== null) cleanStalePid()

  const newPid = await spawnWorker()
  if (newPid !== null) {
    ui.success(`Daemon started (pid ${newPid}).`)
    ui.hint(`Log: ${LOG_FILE}`)
  } else {
    ui.error(`Daemon failed to start. Check ${LOG_FILE}`)
  }

  ui.blank()
}

export async function runDaemonStop(): Promise<void> {
  ui.header('daemon stop')

  const pid = readPid()
  if (pid === null) {
    ui.info('Daemon is not running.')
    ui.blank()
    return
  }

  if (!isAlive(pid)) {
    cleanStalePid()
    ui.info('Daemon is not running (cleaned up stale PID file).')
    ui.blank()
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // may already be dead
  }

  // Wait for process to exit
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100))
    if (!isAlive(pid)) break
  }

  cleanStalePid()
  ui.success('Daemon stopped.')
  ui.blank()
}

export interface DaemonInfo {
  running: boolean
  pid: number | null
  uptime: string | null
  logFile: string
}

export function getDaemonInfo(): DaemonInfo {
  const pid = readPid()

  if (pid === null) return { running: false, pid: null, uptime: null, logFile: LOG_FILE }

  if (!isAlive(pid)) {
    cleanStalePid()
    return { running: false, pid: null, uptime: null, logFile: LOG_FILE }
  }

  let uptime: string | null = null
  try {
    const pidStat = statSync(PID_FILE)
    const uptimeMs = Date.now() - pidStat.mtimeMs
    const minutes = Math.floor(uptimeMs / 60_000)
    const hours = Math.floor(minutes / 60)
    uptime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
  } catch {
    // skip uptime
  }

  return { running: true, pid, uptime, logFile: LOG_FILE }
}
