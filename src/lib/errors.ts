import { ui } from './ui'

export function fatal(message: string, hint?: string): never {
  ui.blank()
  ui.error(message)
  if (hint) ui.hint(hint)
  ui.blank()
  process.exit(1)
}
