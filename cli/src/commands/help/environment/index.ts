import { DifyCommand } from '../../_shared/dify-command.js'
import { runHelpEnvironment } from './environment.js'

export default class HelpEnvironment extends DifyCommand {
  static override description = 'Long-form documentation for every DIFY_* env var'

  static override examples = [
    '<%= config.bin %> help environment',
  ]

  async run(): Promise<void> {
    await this.parse(HelpEnvironment)
    process.stdout.write(runHelpEnvironment())
  }
}
