import type { Command } from '@oclif/core'
import { Help } from '@oclif/core'

export default class DifyHelp extends Help {
  override async showCommandHelp(command: Command.Loadable): Promise<void> {
    await super.showCommandHelp(command)
    const guide = (command as Record<string, unknown>).agentGuide
    if (typeof guide === 'string' && guide.length > 0)
      this.log(guide)
  }
}
