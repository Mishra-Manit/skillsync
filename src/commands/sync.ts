import { detectGh } from '../lib/github'
import { ui } from '../lib/ui'

export async function runSync(): Promise<void> {
  const { username } = detectGh()

  ui.header('sync')
  ui.subheader(`Authenticated as @${username}`)

  ui.hint('Coming soon.')
  ui.blank()
}
