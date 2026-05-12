import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Version from './index.js'

describe('Version command', () => {
  let logs: string[]

  beforeEach(() => {
    logs = []
    vi.spyOn(Version.prototype, 'log').mockImplementation((line?: string) => {
      logs.push(line ?? '')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints structured block on stable channel without warning', async () => {
    const info = await import('../../version/info.js')
    const orig = info.versionInfo.channel
    Object.assign(info.versionInfo, { channel: 'stable' })
    try {
      await Version.run([])
      const text = logs.join('\n')
      expect(text).toMatch(/^difyctl /)
      expect(text).toContain('channel: stable')
      expect(text).toContain('compat:')
      expect(text).not.toContain('WARNING:')
    }
    finally {
      Object.assign(info.versionInfo, { channel: orig })
    }
  })

  it('prints warning on rc channel', async () => {
    const info = await import('../../version/info.js')
    const orig = info.versionInfo.channel
    Object.assign(info.versionInfo, { channel: 'rc' })
    try {
      await Version.run([])
      const text = logs.join('\n')
      expect(text).toContain('channel: rc')
      expect(text).toContain('WARNING: This build is a release candidate')
      expect(text).toContain('install the stable channel')
    }
    finally {
      Object.assign(info.versionInfo, { channel: orig })
    }
  })

  it('emits JSON when --json flag passed', async () => {
    await Version.run(['--json'])
    const payload = JSON.parse(logs.join(''))
    expect(payload).toHaveProperty('version')
    expect(payload).toHaveProperty('channel')
    expect(payload).toHaveProperty('compat')
    expect(payload.compat).toHaveProperty('minDify')
    expect(payload.compat).toHaveProperty('maxDify')
  })
})
