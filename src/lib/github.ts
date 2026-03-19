import { fatal } from './errors'

export type GhAuth = {
  username: string
}

export type InviteResult = 'invited' | 'already-member' | 'error'

export type CreateRepoResult = {
  slug: string
  url: string
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

export type GhAuthDetails = {
  username: string
  host: string
  authMethod: string
  protocol: string
  token: string
  scopes: string
}

export function detectGh(): GhAuth {
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

export function createRepo(
  name: string,
  org: string | undefined,
  visibility: 'private' | 'public' = 'private',
): CreateRepoResult {
  const repoArg = org ? `${org}/${name}` : name
  const visibilityFlag = visibility === 'public' ? '--public' : '--private'
  const result = Bun.spawnSync(
    ['gh', 'repo', 'create', repoArg, visibilityFlag],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  if (!result.success) {
    const stderr = result.stderr.toString().trim()
    fatal(`Failed to create repo "${repoArg}".`, stderr)
  }

  // gh repo create prints the URL on stdout, e.g. https://github.com/org/name
  const output = result.stdout.toString().trim()
  const urlMatch = output.match(/github\.com\/([^/]+\/[^/\s]+)/)
  const slug = urlMatch ? urlMatch[1]! : repoArg
  const url = output.startsWith('http') ? output : `https://github.com/${slug}`

  return { slug, url }
}

export function getGhVersion(): string {
  const result = Bun.spawnSync(['gh', '--version'], { stdout: 'pipe', stderr: 'pipe' })
  const match = result.stdout.toString().match(/gh version (\S+)/)
  return match ? match[1]! : 'unknown'
}

export function getAuthDetails(): GhAuthDetails {
  const { username } = detectGh()

  const result = Bun.spawnSync(
    ['gh', 'auth', 'status', '--json', 'hosts', '--show-token'],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  try {
    const parsed = JSON.parse(result.stdout.toString()) as GhAuthStatusJson
    if (parsed.hosts) {
      const account = pickActiveAccount(parsed.hosts)
      if (account) {
        return {
          username,
          host: account.host ?? 'github.com',
          authMethod: account.tokenSource ?? 'unknown',
          protocol: account.gitProtocol ?? 'unknown',
          token: account.token ?? 'unknown',
          scopes: account.scopes ?? 'unknown',
        }
      }
    }
  } catch {
    // Fall through to text fallback
  }

  const textResult = Bun.spawnSync(['gh', 'auth', 'status', '--show-token'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = textResult.stderr.toString() + textResult.stdout.toString()

  const hostMatch = output.match(/Logged in to\s+(\S+)\s+account/)
  const authMethodMatch = output.match(/account \S+ \((\S+)\)/)
  const protocolMatch =
    output.match(/Git operations protocol:\s*(\S+)/) ??
    output.match(/configured to use (\S+) protocol/)
  const tokenMatch = output.match(/Token:\s+(\S+)/)
  const scopesMatch = output.match(/Token scopes:\s+(.+)/)

  return {
    username,
    host: hostMatch?.[1] ?? 'github.com',
    authMethod: authMethodMatch?.[1] ?? 'unknown',
    protocol: protocolMatch?.[1] ?? 'unknown',
    token: tokenMatch?.[1] ?? 'unknown',
    scopes: scopesMatch?.[1]?.replace(/'/g, '').trim() ?? 'unknown',
  }
}

export function inviteCollaborator(
  repoSlug: string,
  usernameOrEmail: string,
): { target: string; result: InviteResult; detail?: string } {
  if (usernameOrEmail.includes('@')) {
    return {
      target: usernameOrEmail,
      result: 'error',
      detail: 'Use a GitHub username, not an email address',
    }
  }

  // Username-based invite
  const result = Bun.spawnSync(
    ['gh', 'api', `repos/${repoSlug}/collaborators/${usernameOrEmail}`, '-X', 'PUT'],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  if (result.success) {
    const stdout = result.stdout.toString().trim()

    // 204 No Content = already a collaborator (empty body)
    // 201 Created = invitation sent (body has invitation object)
    if (!stdout || stdout === '{}') {
      return { target: usernameOrEmail, result: 'already-member' }
    }
    return { target: usernameOrEmail, result: 'invited' }
  }

  const stderr = result.stderr.toString().trim()
  return { target: usernameOrEmail, result: 'error', detail: stderr }
}
