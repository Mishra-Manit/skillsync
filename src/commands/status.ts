import { style } from '@crustjs/style'

export async function runStatus(): Promise<void> {
  process.stderr.write(style.bold('skillsync status') + '\n')
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
