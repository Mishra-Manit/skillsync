import { fatal } from './errors'

export type GhAuth = {
  username: string
}

export type GhAuthAccount = {
  active?: boolean
  host?: string
  state?: string
  login?: string
  token?: string
  scopes?: string
  gitProtocol?: string
  tokenSource?: string
}

export type GhAuthStatusJson = {
  hosts?: Record<string, GhAuthAccount[]>
}

export function pickActiveAccount(hosts: Record<string, GhAuthAccount[]>): GhAuthAccount | null {
  const accounts = Object.values(hosts).flat()
  return accounts.find((a) => a.active) ?? accounts[0] ?? null
}

export async function detectGh(): Promise<GhAuth> {
  // Confirm gh is in PATH
  try {
    const versionResult = Bun.spawnSync(['gh', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (!versionResult.success) throw new Error('gh exited non-zero')
  } catch {
    fatal('gh CLI is not installed.', 'Install it from https://cli.github.com, then run `gh auth login`.')
  }

  // Confirm gh is authenticated
  const authJsonResult = Bun.spawnSync(['gh', 'auth', 'status', '--json', 'hosts'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!authJsonResult.success) {
    fatal('gh CLI is installed but you are not logged in.', 'Run `gh auth login` to authenticate, then retry.')
  }

  // Try JSON parsing first
  const raw = authJsonResult.stdout.toString().trim()
  try {
    const parsed = JSON.parse(raw) as GhAuthStatusJson
    const account = parsed.hosts ? pickActiveAccount(parsed.hosts) : null
    if (account?.login) return { username: account.login }
  } catch {
    // Fall through to text parsing
  }

  // Text fallback
  const textResult = Bun.spawnSync(['gh', 'auth', 'status'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = textResult.stderr.toString() + textResult.stdout.toString()
  const match = output.match(/Logged in to \S+ account (\S+)/)

  if (!match) {
    fatal(
      'Could not determine GitHub username from gh auth status.',
      'Try running `gh auth status` manually to inspect the output.',
    )
  }

  return { username: match[1]! }
}
