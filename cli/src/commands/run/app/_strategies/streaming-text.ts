import type { RunContext, RunStrategy } from './index.js'
import { buildRunBody } from '../../../../api/app-run.js'
import { decodeStreamError } from '../sse-collector.js'

export class StreamingTextStrategy implements RunStrategy {
  async execute(ctx: RunContext): Promise<void> {
    const { opts, deps, mode, printFlags } = ctx
    const ctrl = new AbortController()
    const body = buildRunBody({
      message: opts.message,
      inputs: opts.inputs,
      conversationId: opts.conversationId,
      workspaceId: opts.workspace,
      responseMode: 'streaming',
    })
    try {
      const events = await ctx.runClient.runStream(opts.appId, body, { signal: ctrl.signal })
      const sp = printFlags.toStreamPrinter(mode)
      for await (const ev of events) {
        if (ev.name === 'ping')
          continue
        if (ev.name === 'error')
          throw decodeStreamError(ev.data)
        sp.onEvent(deps.io.out, deps.io.err, ev)
      }
      sp.onEnd(deps.io.out, deps.io.err)
    }
    catch (err) {
      ctrl.abort()
      throw err
    }
  }
}
