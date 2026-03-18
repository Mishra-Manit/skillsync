import * as p from '@clack/prompts'

export async function runStatus(): Promise<void> {
  p.intro('skillsync status')
  p.log.info('Not yet implemented.')
  p.outro('Done.')
}
