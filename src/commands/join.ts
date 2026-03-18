import { spinner } from '@crustjs/prompts'
import { style } from '@crustjs/style'
import { detectGh } from '../lib/github'

export async function runJoin(repo: string): Promise<void> {
  const { username } = await detectGh()
  process.stderr.write(style.bold('skillsync join') + '\n')
  process.stderr.write(`Joining ${repo}...\n`)
  process.stderr.write(style.yellow('Not yet implemented.') + '\n')
}
