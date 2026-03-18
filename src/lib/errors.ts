import { style } from '@crustjs/style'

export function fatal(message: string, hint?: string): never {
  process.stderr.write(style.red(`✗ ${message}\n`))
  if (hint) process.stderr.write(style.dim(`  ${hint}\n`))
  process.exit(1)
}
