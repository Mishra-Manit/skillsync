import { style } from '@crustjs/style'
import { detectGh } from '../lib/github'

export async function runStatus(): Promise<void> {
  const { username } = await detectGh()
  process.stderr.write(style.bold('skillsync status') + '\n')
  process.stderr.write(style.dim(`Authenticated as @${username}\n`))
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
