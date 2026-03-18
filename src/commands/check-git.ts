import { style } from '@crustjs/style'
import { detectGh, pickActiveAccount, type GhAuthStatusJson } from '../lib/github'

function parseVersion(output: string): string {
  const match = output.match(/gh version (\S+)/)
  return match ? match[1]! : 'unknown'
}

function parseAuthDetailsFallback(output: string): {
  host: string
  authMethod: string
  protocol: string
  token: string
  scopes: string
} {
  const hostMatch = output.match(/Logged in to\s+(\S+)\s+account/)
  const authMethodMatch = output.match(/account \S+ \((\S+)\)/)
  const protocolMatch =
    output.match(/Git operations protocol:\s*(\S+)/) ??
    output.match(/configured to use (\S+) protocol/)
  const tokenMatch = output.match(/Token:\s+(\S+)/)
  const scopesMatch = output.match(/Token scopes:\s+(.+)/)

  return {
    host: hostMatch ? hostMatch[1]! : 'github.com',
    authMethod: authMethodMatch ? authMethodMatch[1]! : 'unknown',
    protocol: protocolMatch ? protocolMatch[1]! : 'unknown',
    token: tokenMatch ? tokenMatch[1]! : 'unknown',
    scopes: scopesMatch ? scopesMatch[1]!.replace(/'/g, '').trim() : 'unknown',
  }
}

export async function runCheckGit(): Promise<void> {
  const { username } = await detectGh()

  const versionResult = Bun.spawnSync(['gh', '--version'], { stdout: 'pipe', stderr: 'pipe' })
  const version = parseVersion(versionResult.stdout.toString())

  // Try JSON first for reliable parsing
  const authJsonResult = Bun.spawnSync(
    ['gh', 'auth', 'status', '--json', 'hosts', '--show-token'],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  let host = 'github.com'
  let authMethod = 'unknown'
  let protocol = 'unknown'
  let token = 'unknown'
  let scopes = 'unknown'

  try {
    const parsed = JSON.parse(authJsonResult.stdout.toString()) as GhAuthStatusJson
    if (parsed.hosts) {
      const account = pickActiveAccount(parsed.hosts)
      if (account) {
        host = account.host ?? 'github.com'
        authMethod = account.tokenSource ?? 'unknown'
        protocol = account.gitProtocol ?? 'unknown'
        token = account.token ?? 'unknown'
        scopes = account.scopes ?? 'unknown'
      }
    }
  } catch {
    // Only spawn text fallback when JSON parsing fails
    const textResult = Bun.spawnSync(['gh', 'auth', 'status', '--show-token'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const fallback = parseAuthDetailsFallback(
      textResult.stderr.toString() + textResult.stdout.toString(),
    )
    host = fallback.host
    authMethod = fallback.authMethod
    protocol = fallback.protocol
    token = fallback.token
    scopes = fallback.scopes
  }

  const label = (s: string) => style.dim(s.padEnd(11))

  process.stderr.write('\n')
  process.stderr.write('  ' + style.bold('gh CLI check') + '\n\n')
  process.stderr.write(`  ${label('Version')}${version}\n`)
  process.stderr.write(`  ${label('User')}${style.green('@' + username)}\n`)
  process.stderr.write(`  ${label('Host')}${host}\n`)
  process.stderr.write(`  ${label('Auth')}${authMethod}\n`)
  process.stderr.write(`  ${label('Protocol')}${protocol}\n`)
  process.stderr.write(`  ${label('Token')}${token}\n`)
  process.stderr.write(`  ${label('Scopes')}${scopes}\n\n`)
}
