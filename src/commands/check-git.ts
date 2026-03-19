import { style } from '@crustjs/style'
import { getGhVersion, getAuthDetails } from '../lib/github'
import { ui } from '../lib/ui'

export async function runCheckGit(): Promise<void> {
  const version = getGhVersion()
  const details = getAuthDetails()

  ui.header('check-git')
  ui.blank()

  ui.label('Version', version)
  ui.label('User', style.green('@' + details.username))
  ui.label('Host', details.host)
  ui.label('Auth', details.authMethod)
  ui.label('Protocol', details.protocol)
  ui.label('Token', details.token !== 'unknown' ? details.token.slice(0, 8) + '...' : 'unknown')
  ui.label('Scopes', details.scopes)

  ui.blank()
}
