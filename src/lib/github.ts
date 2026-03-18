import { style } from '@crustjs/style'

export type GhAuth = {
  username: string
}

type GhAuthAccount = {
  active?: boolean
  login?: string
}

type GhAuthStatusJson = {
  hosts?: Record<string, GhAuthAccount[]>
}

function pickActiveLogin(hosts: Record<string, GhAuthAccount[]>): string | null {
  const accounts = Object.values(hosts).flat()
  const active = accounts.find((account) => account.active)
  const candidate = active ?? accounts[0]
  return candidate?.login ?? null
}

export async function detectGh(): Promise<GhAuth> {
  // Check that gh is in PATH
  try {
    const versionResult = Bun.spawnSync(['gh', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (!versionResult.success) throw new Error('gh exited non-zero')
  } catch {
    process.stderr.write(style.red('✗ gh CLI is not installed.\n'))
    process.stderr.write(style.dim('  Install it from https://cli.github.com, then run `gh auth login`.\n'))
    process.exit(1)
  }

  const authJsonResult = Bun.spawnSync(['gh', 'auth', 'status', '--json', 'hosts'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // gh auth status --json exits 0 even when account has issues; non-zero is a fatal error.
  if (!authJsonResult.success) {
    process.stderr.write(style.red('✗ gh CLI is installed but you are not logged in.\n'))
    process.stderr.write(style.dim('  Run `gh auth login` to authenticate, then retry.\n'))
    process.exit(1)
  }

  const authJsonRaw = authJsonResult.stdout.toString().trim()
  try {
    const parsed = JSON.parse(authJsonRaw) as GhAuthStatusJson
    const username = parsed.hosts ? pickActiveLogin(parsed.hosts) : null

    if (username) {
      return { username }
    }
  } catch {
    // Fall through to text parsing fallback.
  }

  const authTextResult = Bun.spawnSync(['gh', 'auth', 'status'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = authTextResult.stderr.toString() + authTextResult.stdout.toString()
  const match = output.match(/Logged in to \S+ account (\S+)/)

  if (!match) {
    process.stderr.write(style.red('✗ Could not determine GitHub username from gh auth status.\n'))
    process.stderr.write(style.dim('  Try running `gh auth status` manually to inspect the output.\n'))
    process.exit(1)
  }

  return { username: match[1]! }
}
