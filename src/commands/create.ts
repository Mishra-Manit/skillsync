import { input, confirm, multiselect, spinner } from '@crustjs/prompts'
import { style } from '@crustjs/style'

export async function runCreate(): Promise<void> {
  process.stderr.write(style.bold('skillsync create') + '\n')
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
