import { detectGh } from '../lib/github'
import { ui } from '../lib/ui'

export async function runImport(_skillPath: string): Promise<void> {
  const { username } = detectGh()

  ui.header('import')
  ui.subheader(`Authenticated as @${username}`)

  ui.hint('Coming soon.')
  ui.blank()
}
