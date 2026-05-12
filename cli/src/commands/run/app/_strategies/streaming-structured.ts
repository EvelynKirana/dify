import type { RunContext, RunStrategy } from './index.js'
import { buildRunBody } from '../../../../api/app-run.js'
import { newAppRunObject } from '../handlers.js'
import { collect } from '../sse-collector.js'

export class StreamingStructuredStrategy implements RunStrategy {
  async execute(ctx: RunContext): Promise<void> {
    const { opts, deps, mode, format, printFlags } = ctx
    const ctrl = new AbortController()
    const body = buildRunBody({
      message: opts.message,
      inputs: opts.inputs,
      conversationId: opts.conversationId,
      workspaceId: opts.workspace,
      responseMode: 'streaming',
    })
    let resp: Record<string, unknown>
    try {
      const events = await ctx.runClient.runStream(opts.appId, body, { signal: ctrl.signal })
      resp = await collect(events, mode)
    }
    catch (err) {
      ctrl.abort()
      throw err
    }
    deps.io.out.write(printFlags.toPrinter(format).print(newAppRunObject(mode, resp)))
  }
}
