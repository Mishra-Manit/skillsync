import { style } from '@crustjs/style'

export type GhAuth = {
  username: string
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

  // Check that gh is authenticated
  const authResult = Bun.spawnSync(['gh', 'auth', 'status'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (!authResult.success) {
    process.stderr.write(style.red('✗ gh CLI is installed but you are not logged in.\n'))
    process.stderr.write(style.dim('  Run `gh auth login` to authenticate, then retry.\n'))
    process.exit(1)
  }

  // gh auth status writes to stderr
  const output = authResult.stderr.toString() + authResult.stdout.toString()
  const match = output.match(/Logged in to \S+ account (\S+)/)

  if (!match) {
    process.stderr.write(style.red('✗ Could not determine GitHub username from gh auth status.\n'))
    process.stderr.write(style.dim('  Try running `gh auth status` manually to inspect the output.\n'))
    process.exit(1)
  }

  return { username: match[1]! }
}
