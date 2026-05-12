import type { DifyMock } from '../../../../test/fixtures/dify-mock/server.js'
import type { HostsBundle } from '../../../auth/hosts.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startMock } from '../../../../test/fixtures/dify-mock/server.js'
import { loadAppInfoCache } from '../../../cache/app-info.js'
import { createClient } from '../../../http/client.js'
import { bufferStreams } from '../../../io/streams.js'
import { runApp } from './run.js'

function bundle(): HostsBundle {
  return {
    current_host: 'http://localhost',
    token_storage: 'file',
    tokens: { bearer: 'dfoa_test' },
    account: { id: 'acct-1', email: 't@d.ai', name: 'T' },
    workspace: { id: 'ws-1', name: 'Default', role: 'owner' },
    available_workspaces: [
      { id: 'ws-1', name: 'Default', role: 'owner' },
      { id: 'ws-2', name: 'Other', role: 'normal' },
    ],
  }
}

describe('runApp', () => {
  let mock: DifyMock
  let dir: string
  beforeEach(async () => {
    mock = await startMock({ scenario: 'happy' })
    dir = await mkdtemp(join(tmpdir(), 'difyctl-runapp-'))
  })
  afterEach(async () => {
    await mock.stop()
    await rm(dir, { recursive: true, force: true })
  })

  it('chat: prints answer + conversation hint to stderr', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-1', message: 'hi' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    expect(io.outBuf()).toBe('echo: hi\n')
    expect(io.errBuf()).toContain('--conversation conv-1')
  })

  it('workflow: rejects positional message with usage error', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await expect(runApp(
      { appId: 'app-2', message: 'hi' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )).rejects.toMatchObject({ code: 'usage_invalid_flag' })
  })

  it('workflow: prints outputs JSON', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-2', inputs: { x: '1' } },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    const out = JSON.parse(io.outBuf().trim()) as { result: string }
    expect(out.result).toBe('echo: ')
  })

  it('json: passes through full envelope', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-1', message: 'hi', format: 'json' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    const parsed = JSON.parse(io.outBuf()) as { mode: string, answer: string }
    expect(parsed.mode).toBe('chat')
    expect(parsed.answer).toBe('echo: hi')
  })

  it('rejects unknown format', async () => {
    const io = bufferStreams()
    await expect(runApp(
      { appId: 'app-1', format: 'bogus' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io },
    )).rejects.toThrow(/not supported/)
  })

  it('unknown app id surfaces as error', async () => {
    const io = bufferStreams()
    await expect(runApp(
      { appId: 'nope', message: 'hi' },
      {
        bundle: bundle(),
        http: createClient({ host: mock.url, bearer: 'dfoa_test', retryAttempts: 0 }),
        host: mock.url,
        io,
      },
    )).rejects.toThrow()
  })

  it('--stream chat: streams answer to stdout and hint to stderr', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-1', message: 'hi', stream: true, streamSetExplicitly: true },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    expect(io.outBuf()).toContain('echo: ')
    expect(io.outBuf()).toContain('hi')
    expect(io.errBuf()).toContain('--conversation conv-1')
  })

  it('--stream -o json chat: aggregates into blocking-shape envelope', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-1', message: 'hi', stream: true, streamSetExplicitly: true, format: 'json' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    const parsed = JSON.parse(io.outBuf()) as { mode: string, answer: string, conversation_id: string }
    expect(parsed.mode).toBe('chat')
    expect(parsed.answer).toBe('echo: hi')
    expect(parsed.conversation_id).toBe('conv-1')
  })

  it('agent-chat forces streaming without --stream', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-4', workspace: 'ws-2', message: 'do research' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    expect(io.outBuf()).toContain('do research')
    expect(io.errBuf()).toContain('thought:')
  })

  it('agent-chat with --stream=false explicitly: warns then streams', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-4', workspace: 'ws-2', message: 'go', stream: false, streamSetExplicitly: true },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    expect(io.errBuf()).toContain('agent apps require streaming')
    expect(io.outBuf()).toContain('go')
    expect(io.errBuf()).toContain('thought:')
  })

  it('--stream workflow -o json: aggregates from workflow_finished', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await runApp(
      { appId: 'app-2', inputs: { x: '1' }, stream: true, streamSetExplicitly: true, format: 'json' },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test' }), host: mock.url, io, cache },
    )
    const parsed = JSON.parse(io.outBuf()) as { mode: string, data: { status: string } }
    expect(parsed.mode).toBe('workflow')
    expect(parsed.data.status).toBe('succeeded')
  })

  it('stream-error scenario: error event surfaces typed BaseError', async () => {
    mock.setScenario('stream-error')
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ configDir: dir })
    await expect(runApp(
      { appId: 'app-1', message: 'hi', stream: true, streamSetExplicitly: true },
      { bundle: bundle(), http: createClient({ host: mock.url, bearer: 'dfoa_test', retryAttempts: 0 }), host: mock.url, io, cache },
    )).rejects.toMatchObject({ code: 'server_5xx' })
  })
})
