import type { RunContext, RunStrategy } from './index.js'
import { buildRunBody } from '../../../../api/app-run.js'
import { runWithSpinner } from '../../../../io/spinner.js'
import { chatConversationHint, newAppRunObject, RUN_MODES } from '../handlers.js'

const CHAT_MODES: ReadonlySet<string> = new Set([RUN_MODES.Chat, RUN_MODES.AgentChat, RUN_MODES.AdvancedChat])

export class BlockingStrategy implements RunStrategy {
  async execute(ctx: RunContext): Promise<void> {
    const { opts, deps, mode, format, printFlags } = ctx
    const body = buildRunBody({
      message: opts.message,
      inputs: opts.inputs,
      conversationId: opts.conversationId,
      workspaceId: opts.workspace,
    })
    const resp = await runWithSpinner(
      { io: deps.io, label: 'Running app', enabled: ctx.isText },
      () => ctx.runClient.runBlocking(opts.appId, body),
    )
    const respMode = typeof resp.mode === 'string' && resp.mode !== '' ? resp.mode : mode
    deps.io.out.write(printFlags.toPrinter(format).print(newAppRunObject(respMode, resp)))
    if (ctx.isText && CHAT_MODES.has(respMode)) {
      const hint = chatConversationHint(resp)
      if (hint !== undefined)
        deps.io.err.write(hint)
    }
  }
}
