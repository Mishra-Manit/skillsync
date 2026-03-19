import { style } from '@crustjs/style'

const write = (s: string) => process.stderr.write(s)

export const ui = {
  header:    (cmd: string) => write(`\n  ${style.bold(`skillsync ${cmd}`)}\n`),
  subheader: (text: string) => write(`  ${style.dim(text)}\n\n`),
  success:   (text: string) => write(`  ${style.green('+')} ${text}\n`),
  warn:      (text: string) => write(`  ${style.yellow('!')} ${text}\n`),
  error:     (text: string) => write(`  ${style.red('x')} ${text}\n`),
  info:      (text: string) => write(`  ${style.dim('-')} ${text}\n`),
  line:      (text: string) => write(`  ${text}\n`),
  label:     (key: string, value: string, width = 14) =>
               write(`    ${style.dim(key.padEnd(width))}${value}\n`),
  blank:     () => write('\n'),
  hint:      (text: string) => write(`  ${style.dim(text)}\n`),
}
