import type { KyInstance } from 'ky'
import type { SseEvent } from '../http/sse.js'
import { normalizeDifyStream } from '../http/sse-dify.js'
import { parseSSE } from '../http/sse.js'

export type RunResponse = Record<string, unknown>

export type ResponseMode = 'blocking' | 'streaming'

export type RunBodyArgs = {
  readonly message?: string
  readonly inputs?: Readonly<Record<string, string>>
  readonly conversationId?: string
  readonly workspaceId?: string
  readonly responseMode?: ResponseMode
}

export function buildRunBody(args: RunBodyArgs): Record<string, unknown> {
  const body: Record<string, unknown> = {
    inputs: args.inputs ?? {},
    response_mode: args.responseMode ?? 'blocking',
  }
  if (args.message !== undefined && args.message !== '')
    body.query = args.message
  if (args.conversationId !== undefined && args.conversationId !== '')
    body.conversation_id = args.conversationId
  if (args.workspaceId !== undefined && args.workspaceId !== '')
    body.workspace_id = args.workspaceId
  return body
}

export type RunStreamOptions = {
  signal?: AbortSignal
}

export class AppRunClient {
  private readonly http: KyInstance

  constructor(http: KyInstance) {
    this.http = http
  }

  async runBlocking(appId: string, body: Record<string, unknown>): Promise<RunResponse> {
    const raw = await this.http.post(`apps/${encodeURIComponent(appId)}/run`, { json: body }).json()
    return raw as RunResponse
  }

  async runStream(
    appId: string,
    body: Record<string, unknown>,
    opts: RunStreamOptions = {},
  ): Promise<AsyncIterable<SseEvent>> {
    const path = `apps/${encodeURIComponent(appId)}/run`
    const res = await this.http.post(path, {
      json: body,
      headers: { Accept: 'text/event-stream' },
      retry: { limit: 0 },
      signal: opts.signal,
    })
    if (res.body === null)
      throw new Error('streaming response body missing')
    return normalizeDifyStream(parseSSE(res.body, opts.signal))
  }
}
