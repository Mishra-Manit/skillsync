import { spinner } from '@crustjs/prompts'
import { style } from '@crustjs/style'

export async function runSync(): Promise<void> {
  process.stderr.write(style.bold('skillsync sync') + '\n')
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
