import type { Command } from '@oclif/core'
import { fileURLToPath } from 'node:url'
import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DifyHelp from './help-class.js'

describe('DifyHelp', () => {
  let config: Config

  beforeAll(async () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    config = await Config.load({ root })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('appends agentGuide string after standard help when present', async () => {
    const fakeCommand = {
      id: 'run:app',
      agentGuide: 'WORKFLOW\n  1. do this\n',
      description: 'test',
      flags: {},
      args: {},
      examples: [],
      aliases: [],
    }

    const help = new DifyHelp(config, { stripAnsi: true })
    const logSpy = vi.spyOn(help, 'log').mockImplementation(() => {})
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(help)), 'showCommandHelp')
      .mockResolvedValue(undefined)

    await help.showCommandHelp(fakeCommand as unknown as Command.Loadable)

    expect(logSpy).toHaveBeenCalledWith('WORKFLOW\n  1. do this\n')
  })

  it('does not call log for agentGuide when command has none', async () => {
    const fakeCommand = {
      id: 'auth:login',
      description: 'test',
      flags: {},
      args: {},
      examples: [],
      aliases: [],
    }

    const help = new DifyHelp(config, { stripAnsi: true })
    const logSpy = vi.spyOn(help, 'log').mockImplementation(() => {})
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(help)), 'showCommandHelp')
      .mockResolvedValue(undefined)

    await help.showCommandHelp(fakeCommand as unknown as Command.Loadable)

    expect(logSpy).not.toHaveBeenCalled()
  })
})
