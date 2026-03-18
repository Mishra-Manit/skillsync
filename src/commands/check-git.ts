import { style } from '@crustjs/style'
import { detectGh } from '../lib/github'

function parseVersion(output: string): string {
  const match = output.match(/gh version (\S+)/)
  return match ? match[1]! : 'unknown'
}

type GhAuthAccount = {
  active?: boolean
  host?: string
  state?: string
  login?: string
  token?: string
  scopes?: string
  gitProtocol?: string
  tokenSource?: string
}

type GhAuthStatusJson = {
  hosts?: Record<string, GhAuthAccount[]>
}

function pickDisplayAccount(hosts: Record<string, GhAuthAccount[]>): GhAuthAccount | null {
  const accounts = Object.values(hosts).flat()
  const active = accounts.find((account) => account.active)
  return active ?? accounts[0] ?? null
}

function parseAuthDetailsFromJson(output: string): {
  host: string
  authMethod: string
  protocol: string
  token: string
  scopes: string
} | null {
  try {
    const parsed = JSON.parse(output) as GhAuthStatusJson
    if (!parsed.hosts) return null

    const account = pickDisplayAccount(parsed.hosts)
    if (!account) return null

    return {
      host: account.host ?? 'github.com',
      authMethod: account.tokenSource ?? 'unknown',
      protocol: account.gitProtocol ?? 'unknown',
      token: account.token ?? 'unknown',
      scopes: account.scopes ?? 'unknown',
    }
  } catch {
    return null
  }
}

function parseAuthDetails(output: string): {
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
    scopes: scopesMatch
      ? scopesMatch[1]!.replace(/'/g, '').trim()
      : 'unknown',
  }
}

export async function runCheckGit(): Promise<void> {
  const { username } = await detectGh()

  const versionResult = Bun.spawnSync(['gh', '--version'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const authJsonResult = Bun.spawnSync(['gh', 'auth', 'status', '--json', 'hosts', '--show-token'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const authTextResult = Bun.spawnSync(['gh', 'auth', 'status', '--show-token'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const version = parseVersion(versionResult.stdout.toString())
  const authDetails = parseAuthDetailsFromJson(authJsonResult.stdout.toString())
  const fallbackOutput = authTextResult.stderr.toString() + authTextResult.stdout.toString()
  const { host, authMethod, protocol, token, scopes } = authDetails ?? parseAuthDetails(fallbackOutput)

  const label = (s: string) => style.dim(s.padEnd(11))

  process.stderr.write('\n')
  process.stderr.write('  ' + style.bold('gh CLI check') + '\n')
  process.stderr.write('\n')
  process.stderr.write(`  ${label('Version')}${version}\n`)
  process.stderr.write(`  ${label('User')}${style.green('@' + username)}\n`)
  process.stderr.write(`  ${label('Host')}${host}\n`)
  process.stderr.write(`  ${label('Auth')}${authMethod}\n`)
  process.stderr.write(`  ${label('Protocol')}${protocol}\n`)
  process.stderr.write(`  ${label('Token')}${token}\n`)
  process.stderr.write(`  ${label('Scopes')}${scopes}\n`)
  process.stderr.write('\n')
}
