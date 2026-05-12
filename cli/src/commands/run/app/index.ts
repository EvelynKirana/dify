import { Args, Flags } from '@oclif/core'
import { BaseError } from '../../../errors/base.js'
import { ErrorCode } from '../../../errors/codes.js'
import { DifyCommand } from '../../_shared/dify-command.js'
import { httpRetryFlag } from '../../_shared/global-flags.js'
import { agentGuide } from './guide.js'
import { runApp } from './run.js'

export default class RunApp extends DifyCommand {
  static override description = 'Run an app and print the response'
  static agentGuide = agentGuide

  static override examples = [
    '<%= config.bin %> run app app-1 "hello"',
    '<%= config.bin %> run app app-1 --input name=world',
    '<%= config.bin %> run app app-1 --stream',
    '<%= config.bin %> run app app-1 -o json',
  ]

  static override args = {
    id: Args.string({ description: 'app id', required: true }),
    message: Args.string({ description: 'user message (chat/agent-chat/advanced-chat/completion)', required: false }),
  }

  static override flags = {
    'input': Flags.string({ description: 'app input (--input k=v, repeatable)', multiple: true, default: [] }),
    'conversation': Flags.string({ description: 'resume a chat conversation by id' }),
    'workspace': Flags.string({ description: 'workspace id (overrides DIFY_WORKSPACE_ID and stored default)' }),
    'stream': Flags.boolean({
      description: 'request streaming SSE; recommended for runs that may exceed ~30s. Agent apps stream regardless.',
      default: false,
    }),
    'http-retry': httpRetryFlag,
    'output': Flags.string({ char: 'o', description: 'output format (json|yaml|text)', default: '' }),
  }

  async run(): Promise<void> {
    const { args, flags, raw } = await this.parse(RunApp)
    const format = flags.output
    const ctx = await this.authedCtx({ retryFlag: flags['http-retry'], withCache: true, format })
    const inputs = parseInputs(flags.input)
    const streamSetExplicitly = raw.some(t => t.type === 'flag' && t.flag === 'stream')
    await runApp(
      {
        appId: args.id,
        message: args.message,
        inputs,
        conversationId: flags.conversation,
        workspace: flags.workspace,
        format,
        stream: flags.stream,
        streamSetExplicitly,
      },
      { bundle: ctx.bundle, http: ctx.http, host: ctx.host, io: ctx.io, cache: ctx.cache },
    )
  }
}

function parseInputs(raw: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const item of raw) {
    const eq = item.indexOf('=')
    if (eq <= 0) {
      throw new BaseError({
        code: ErrorCode.UsageInvalidFlag,
        message: `--input expects key=value, got ${JSON.stringify(item)}`,
      })
    }
    out[item.slice(0, eq)] = item.slice(eq + 1)
  }
  return out
}
