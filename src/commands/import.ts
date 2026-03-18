import * as p from '@clack/prompts'

export async function runImport(skillPath: string): Promise<void> {
  p.intro('skillsync import')
  p.log.info(`Importing from ${skillPath}...`)
  p.log.info('Not yet implemented.')
  p.outro('Done.')
}
