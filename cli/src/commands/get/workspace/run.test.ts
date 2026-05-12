import type { DifyMock } from '../../../../test/fixtures/dify-mock/server.js'
import type { HostsBundle } from '../../../auth/hosts.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startMock } from '../../../../test/fixtures/dify-mock/server.js'
import { createClient } from '../../../http/client.js'
import { EMPTY_WORKSPACES_MESSAGE, runGetWorkspace } from './run.js'

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

describe('runGetWorkspace', () => {
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

  it('default format renders ID NAME ROLE STATUS CURRENT table', async () => {
    const out = await runGetWorkspace({}, { bundle: baseBundle, http: http() })
    expect(out).toMatch(/^ID\s+NAME\s+ROLE\s+STATUS\s+CURRENT/)
    expect(out).toContain('ws-1')
    expect(out).toContain('ws-2')
    expect(out).toContain('Default')
    expect(out).toContain('owner')
    expect(out).toContain('normal')
  })

  it('marks the current workspace with *', async () => {
    const out = await runGetWorkspace({}, { bundle: baseBundle, http: http() })
    for (const line of out.split('\n')) {
      if (line.includes('ws-1'))
        expect(line).toContain('*')
      else if (line.includes('ws-2'))
        expect(line).not.toContain('*')
    }
  })

  it('falls back to bundle workspace.id when server current=false', async () => {
    const overridden: HostsBundle = { ...baseBundle, workspace: { id: 'ws-2', name: 'Other', role: 'normal' } }
    const out = await runGetWorkspace({}, { bundle: overridden, http: http() })
    for (const line of out.split('\n')) {
      if (line.includes('ws-2'))
        expect(line).toContain('*')
    }
  })

  it('-o json emits a parseable workspaces envelope', async () => {
    const out = await runGetWorkspace({ format: 'json' }, { bundle: baseBundle, http: http() })
    const parsed = JSON.parse(out) as { workspaces: Array<{ id: string, status: string, current: boolean }> }
    expect(parsed.workspaces).toHaveLength(2)
    expect(parsed.workspaces.map(w => w.id).sort()).toEqual(['ws-1', 'ws-2'])
    expect(parsed.workspaces[0]?.status).toBe('normal')
    expect(parsed.workspaces[0]?.current).toBe(true)
  })

  it('-o yaml emits "workspaces:" header', async () => {
    const out = await runGetWorkspace({ format: 'yaml' }, { bundle: baseBundle, http: http() })
    expect(out).toContain('workspaces:')
    expect(out).toContain('ws-1')
  })

  it('-o name emits ids joined by newline', async () => {
    const out = await runGetWorkspace({ format: 'name' }, { bundle: baseBundle, http: http() })
    expect(out.trim().split('\n').sort()).toEqual(['ws-1', 'ws-2'])
  })

  it('empty workspaces (sso scenario) prints external-SSO message regardless of format', async () => {
    mock.setScenario('sso')
    const out = await runGetWorkspace({}, { bundle: baseBundle, http: http() })
    expect(out).toBe(EMPTY_WORKSPACES_MESSAGE)
    const jsonOut = await runGetWorkspace({ format: 'json' }, { bundle: baseBundle, http: http() })
    expect(jsonOut).toBe(EMPTY_WORKSPACES_MESSAGE)
  })

  it('rejects unknown -o format', async () => {
    await expect(runGetWorkspace({ format: 'csv' }, { bundle: baseBundle, http: http() }))
      .rejects
      .toThrow(/csv|not supported|format/i)
  })
})
