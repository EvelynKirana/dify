import type { AppRunClient } from '../../../../api/app-run.js'
import type { AppRunPrintFlags } from '../print-flags.js'
import type { RunAppDeps, RunAppOptions } from '../run.js'
import { BlockingStrategy } from './blocking.js'
import { StreamingStructuredStrategy } from './streaming-structured.js'
import { StreamingTextStrategy } from './streaming-text.js'

export type RunContext = {
  readonly opts: RunAppOptions
  readonly deps: RunAppDeps
  readonly mode: string
  readonly isAgent: boolean
  readonly format: string
  readonly isText: boolean
  readonly runClient: AppRunClient
  readonly printFlags: AppRunPrintFlags
}

export type RunStrategy = {
  execute: (ctx: RunContext) => Promise<void>
}

const blocking = new BlockingStrategy()
const streamingText = new StreamingTextStrategy()
const streamingStructured = new StreamingStructuredStrategy()

export function pickStrategy(useStream: boolean, isText: boolean): RunStrategy {
  if (!useStream)
    return blocking
  return isText ? streamingText : streamingStructured
}
