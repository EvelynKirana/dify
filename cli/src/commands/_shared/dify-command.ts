import type { CommandError } from '@oclif/core/interfaces'
import type { AuthedContext, AuthedContextOptions } from './authed-command.js'
import { Command } from '@oclif/core'
import { isBaseError } from '../../errors/base.js'
import { formatErrorForCli } from '../../errors/format.js'
import { buildAuthedContext } from './authed-command.js'

export abstract class DifyCommand extends Command {
  protected outputFormat = ''

  protected async authedCtx(opts: AuthedContextOptions): Promise<AuthedContext> {
    this.outputFormat = opts.format ?? ''
    return buildAuthedContext(this, opts)
  }

  protected override async catch(err: CommandError): Promise<void> {
    if (isBaseError(err))
      this.error(formatErrorForCli(err, { format: this.outputFormat }), { exit: err.exit() })
    throw err
  }
}
