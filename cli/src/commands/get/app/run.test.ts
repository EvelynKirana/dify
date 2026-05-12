import type { DifyMock } from '../../../../test/fixtures/dify-mock/server.js'
import type { HostsBundle } from '../../../auth/hosts.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startMock } from '../../../../test/fixtures/dify-mock/server.js'
import { createClient } from '../../../http/client.js'
import { runGetApp } from './run.js'

const baseBundle: HostsBundle = {
  current_host: '127.0.0.1',
  scheme: 'http',
  account: { id: 'acct-1', email: 'tester@dify.ai', name: 'Test Tester' },
  workspace: { id: 'ws-1', name: 'Default', role: 'owner' },
  available_workspaces: [
    { id: 'ws-1', name: 'Default', role: 'owner' },
    { id: 'ws-2', name: 'Other', role: 'normal' },
  ],
  token_storage: 'file',
  tokens: { bearer: 'dfoa_test' },
}

describe('runGetApp', () => {
  let mock: DifyMock

  beforeEach(async () => {
    mock = await startMock({ scenario: 'happy' })
  })

  afterEach(async () => {
    await mock.stop()
  })

  function http() {
    return createClient({ host: mock.url, bearer: 'dfoa_test' })
  }

  it('list (no id, default format) renders table with NAME ID MODE TAGS UPDATED', async () => {
    const out = await runGetApp({}, { bundle: baseBundle, http: http() })
    expect(out).toMatch(/^NAME\s+ID\s+MODE\s+TAGS\s+UPDATED/)
    expect(out).toContain('Greeter')
    expect(out).toContain('app-1')
    expect(out).toContain('chat')
    expect(out).toContain('demo')
    expect(out).toContain('Workflow')
    expect(out).not.toContain('app-3')
  })

  it('by-id (single) renders 1-row table', async () => {
    const out = await runGetApp({ appId: 'app-1' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('Greeter')
    expect(out).toContain('app-1')
    expect(out).not.toContain('Workflow')
  })

  it('--mode filters server-side', async () => {
    const out = await runGetApp({ mode: 'workflow' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('Workflow')
    expect(out).not.toContain('Greeter')
  })

  it('--tag filters server-side', async () => {
    const out = await runGetApp({ tag: 'demo' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('Greeter')
    expect(out).not.toContain('Workflow')
  })

  it('-A all-workspaces aggregates across workspaces sorted by id', async () => {
    const out = await runGetApp({ allWorkspaces: true }, { bundle: baseBundle, http: http() })
    expect(out).toContain('app-1')
    expect(out).toContain('app-2')
    expect(out).toContain('app-3')
    const idxApp1 = out.indexOf('app-1')
    const idxApp3 = out.indexOf('app-3')
    expect(idxApp1).toBeLessThan(idxApp3)
  })

  it('-o json emits parseable JSON envelope', async () => {
    const out = await runGetApp({ format: 'json' }, { bundle: baseBundle, http: http() })
    const parsed = JSON.parse(out) as { data: Array<{ id: string }>, total: number }
    expect(parsed.data).toHaveLength(2)
    expect(parsed.data.map(r => r.id).sort()).toEqual(['app-1', 'app-2'])
  })

  it('-o yaml emits YAML envelope', async () => {
    const out = await runGetApp({ format: 'yaml' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('data:')
    expect(out).toContain('id: app-1')
  })

  it('-o name emits ids one per line', async () => {
    const out = await runGetApp({ format: 'name' }, { bundle: baseBundle, http: http() })
    expect(out.trim().split('\n').sort()).toEqual(['app-1', 'app-2'])
  })

  it('-o wide includes AUTHOR and WORKSPACE columns', async () => {
    const out = await runGetApp({ format: 'wide' }, { bundle: baseBundle, http: http() })
    expect(out).toMatch(/^NAME\s+ID\s+MODE\s+TAGS\s+UPDATED\s+AUTHOR\s+WORKSPACE/)
    expect(out).toContain('tester')
    expect(out).toContain('Default')
  })

  it('rejects unknown format', async () => {
    await expect(runGetApp({ format: 'bogus' }, { bundle: baseBundle, http: http() }))
      .rejects
      .toThrow(/not supported/)
  })

  it('--workspace flag overrides bundle default', async () => {
    const out = await runGetApp({ workspace: 'ws-2' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('app-3')
    expect(out).toContain('OtherWS Bot')
    expect(out).not.toContain('Greeter')
  })

  it('throws NotLoggedIn-equivalent when no workspace can be resolved', async () => {
    const minimal: HostsBundle = { current_host: 'h', token_storage: 'file' }
    await expect(runGetApp({}, { bundle: minimal, http: http() })).rejects.toThrow(/no workspace/)
  })
})
