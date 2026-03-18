import { spinner } from '@crustjs/prompts'
import { style } from '@crustjs/style'

export async function runImport(skillPath: string): Promise<void> {
  process.stderr.write(style.bold('skillsync import') + '\n')
  process.stderr.write(`Importing from ${skillPath}...\n`)
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
