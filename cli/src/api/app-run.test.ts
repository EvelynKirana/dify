import type { DifyMock } from '../../test/fixtures/dify-mock/server.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startMock } from '../../test/fixtures/dify-mock/server.js'
import { createClient } from '../http/client.js'
import { AppRunClient, buildRunBody } from './app-run.js'

describe('buildRunBody', () => {
  it('sets response_mode=blocking by default', () => {
    expect(buildRunBody({}).response_mode).toBe('blocking')
  })

  it('omits query when message empty', () => {
    expect('query' in buildRunBody({})).toBe(false)
  })

  it('includes query when message present', () => {
    expect(buildRunBody({ message: 'hi' }).query).toBe('hi')
  })

  it('passes through inputs', () => {
    const body = buildRunBody({ inputs: { a: '1' } })
    expect(body.inputs).toEqual({ a: '1' })
  })

  it('omits conversation_id when missing/empty', () => {
    expect('conversation_id' in buildRunBody({ conversationId: '' })).toBe(false)
  })

  it('includes workspace_id when set', () => {
    expect(buildRunBody({ workspaceId: 'ws-1' }).workspace_id).toBe('ws-1')
  })
})

describe('AppRunClient.runBlocking', () => {
  let mock: DifyMock
  beforeEach(async () => {
    mock = await startMock({ scenario: 'happy' })
  })
  afterEach(async () => {
    await mock.stop()
  })

  it('returns chat-shaped envelope for chat app', async () => {
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test' }))
    const out = await c.runBlocking('app-1', buildRunBody({ message: 'hi' }))
    expect(out.mode).toBe('chat')
    expect(out.answer).toBe('echo: hi')
  })

  it('returns workflow-shaped envelope for workflow app', async () => {
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test' }))
    const out = await c.runBlocking('app-2', buildRunBody({ inputs: { x: '1' } }))
    expect((out.data as { status: string }).status).toBe('succeeded')
  })

  it('404 unknown app surfaces as error', async () => {
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test', retryAttempts: 0 }))
    await expect(c.runBlocking('nope', buildRunBody({}))).rejects.toThrow()
  })
})

describe('buildRunBody response_mode override', () => {
  it('sets response_mode=streaming when requested', () => {
    expect(buildRunBody({ responseMode: 'streaming' }).response_mode).toBe('streaming')
  })
})

describe('AppRunClient.runStream', () => {
  let mock: DifyMock
  beforeEach(async () => {
    mock = await startMock({ scenario: 'happy' })
  })
  afterEach(async () => {
    await mock.stop()
  })

  it('yields events for chat app', async () => {
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test' }))
    const iter = await c.runStream('app-1', buildRunBody({ message: 'hi', responseMode: 'streaming' }))
    const dec = new TextDecoder()
    const names: string[] = []
    const datas: string[] = []
    for await (const ev of iter) {
      names.push(ev.name)
      datas.push(dec.decode(ev.data))
    }
    expect(names).toEqual(['message', 'message', 'message_end'])
    expect(datas[0]).toContain('"answer":"echo: "')
    expect(datas[1]).toContain('"answer":"hi"')
  })

  it('throws typed BaseError on non-2xx open', async () => {
    mock.setScenario('server-5xx')
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test', retryAttempts: 0 }))
    await expect(
      c.runStream('app-1', buildRunBody({ message: 'hi', responseMode: 'streaming' })),
    ).rejects.toMatchObject({ code: 'server_5xx' })
  })

  it('aborts when signal fires', async () => {
    expect.assertions(1)
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test' }))
    const ctrl = new AbortController()
    const iter = await c.runStream('app-1', buildRunBody({ message: 'hi', responseMode: 'streaming' }), { signal: ctrl.signal })
    ctrl.abort()
    try {
      for await (const _ of iter) { /* drain */ }
    }
    catch (e) {
      expect((e as Error).name).toBe('AbortError')
    }
  })

  it('derives event name from JSON event field when SSE event line absent', async () => {
    const c = new AppRunClient(createClient({ host: mock.url, bearer: 'dfoa_test' }))
    const iter = await c.runStream('app-2', buildRunBody({ inputs: { x: '1' }, responseMode: 'streaming' }))
    const names: string[] = []
    for await (const ev of iter)
      names.push(ev.name)
    expect(names).toEqual(['workflow_started', 'node_started', 'node_finished', 'workflow_finished'])
  })
})
