import { describe, expect, it } from 'vitest'

const INDEX_MODULES = import.meta.glob<{ default?: unknown }>(
  './**/index.ts',
  { eager: true },
)

const COMMAND_MODULES = Object.fromEntries(
  Object.entries(INDEX_MODULES).filter(([path]) => !path.includes('/_')),
)

describe('command folder coverage', () => {
  it('discovers at least one command index', () => {
    expect(Object.keys(COMMAND_MODULES).length).toBeGreaterThan(0)
  })

  describe.each(Object.entries(COMMAND_MODULES))('%s', (path, mod) => {
    it('default export exists', () => {
      expect(mod.default, `${path}: missing default export`).toBeDefined()
    })
  })
})
