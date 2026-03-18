import * as p from '@clack/prompts'

export async function runJoin(repo: string): Promise<void> {
  p.intro('skillsync join')
  p.log.info(`Joining ${repo}...`)
  p.log.info('Not yet implemented.')
  p.outro('Done.')
}
