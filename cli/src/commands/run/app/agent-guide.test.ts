import { describe, expect, it } from 'vitest'
import RunApp from './index.js'

describe('run app agentGuide', () => {
  it('exposes non-empty agentGuide string', () => {
    const guide = (RunApp as unknown as { agentGuide?: string }).agentGuide
    expect(typeof guide).toBe('string')
    expect(guide!.length).toBeGreaterThan(0)
  })

  it('agentGuide mentions WORKFLOW section', () => {
    const guide = (RunApp as unknown as { agentGuide?: string }).agentGuide!
    expect(guide).toContain('WORKFLOW')
  })

  it('agentGuide mentions ERROR RECOVERY section', () => {
    const guide = (RunApp as unknown as { agentGuide?: string }).agentGuide!
    expect(guide).toContain('ERROR RECOVERY')
  })
})
