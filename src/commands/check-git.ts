import { style } from '@crustjs/style'
import { detectGh } from '../lib/github'

function parseVersion(output: string): string {
  const match = output.match(/gh version (\S+)/)
  return match ? match[1]! : 'unknown'
}

function parseAuthDetails(output: string): {
  host: string
  authMethod: string
  protocol: string
  token: string
  scopes: string
} {
  const hostMatch = output.match(/^(\S+)\s*$/m)
  const authMethodMatch = output.match(/account \S+ \((\S+)\)/)
  const protocolMatch = output.match(/configured to use (\S+) protocol/)
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

  const authResult = Bun.spawnSync(['gh', 'auth', 'status'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const version = parseVersion(versionResult.stdout.toString())
  const authOutput = authResult.stderr.toString() + authResult.stdout.toString()
  const { host, authMethod, protocol, token, scopes } = parseAuthDetails(authOutput)

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
