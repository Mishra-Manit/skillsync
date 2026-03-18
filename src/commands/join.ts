import { spinner } from '@crustjs/prompts'
import { style } from '@crustjs/style'

export async function runJoin(repo: string): Promise<void> {
  process.stderr.write(style.bold('skillsync join') + '\n')
  process.stderr.write(`Joining ${repo}...\n`)
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
