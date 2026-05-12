import type { SseEvent } from '../../../http/sse.js'
import { Buffer } from 'node:buffer'
import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { streamPrinterFor } from './stream-handlers.js'

const enc = new TextEncoder()
function ev(name: string, data: object): SseEvent {
  return { name, data: enc.encode(JSON.stringify(data)) }
}

function captures(): { out: PassThrough, err: PassThrough, outBuf: () => string, errBuf: () => string } {
  const out = new PassThrough()
  const err = new PassThrough()
  const oc: Buffer[] = []
  out.on('data', d => oc.push(d as Buffer))
  const ec: Buffer[] = []
  err.on('data', d => ec.push(d as Buffer))
  return {
    out,
    err,
    outBuf: () => Buffer.concat(oc).toString('utf-8'),
    errBuf: () => Buffer.concat(ec).toString('utf-8'),
  }
}

describe('streamPrinterFor — chat', () => {
  it('prints answer chunks live and conversation hint on end', () => {
    const sp = streamPrinterFor('chat')
    const cap = captures()
    sp.onEvent(cap.out, cap.err, ev('message', { conversation_id: 'c1', answer: 'hello ' }))
    sp.onEvent(cap.out, cap.err, ev('message', { answer: 'world' }))
    sp.onEnd(cap.out, cap.err)
    expect(cap.outBuf()).toBe('hello world\n')
    expect(cap.errBuf()).toContain('--conversation c1')
  })
})

describe('streamPrinterFor — agent-chat', () => {
  it('writes agent_thought to stderr', () => {
    const sp = streamPrinterFor('agent-chat')
    const cap = captures()
    sp.onEvent(cap.out, cap.err, ev('agent_thought', { thought: 'thinking' }))
    sp.onEvent(cap.out, cap.err, ev('agent_message', { answer: 'done' }))
    sp.onEnd(cap.out, cap.err)
    expect(cap.errBuf()).toContain('thought: thinking')
    expect(cap.outBuf()).toContain('done')
  })
})

describe('streamPrinterFor — completion', () => {
  it('prints answers + trailing newline', () => {
    const sp = streamPrinterFor('completion')
    const cap = captures()
    sp.onEvent(cap.out, cap.err, ev('message', { answer: 'foo' }))
    sp.onEvent(cap.out, cap.err, ev('message', { answer: 'bar' }))
    sp.onEnd(cap.out, cap.err)
    expect(cap.outBuf()).toBe('foobar\n')
  })
})

describe('streamPrinterFor — workflow', () => {
  it('streams node titles to stderr and outputs JSON on end', () => {
    const sp = streamPrinterFor('workflow')
    const cap = captures()
    sp.onEvent(cap.out, cap.err, ev('node_started', { title: 'A' }))
    sp.onEvent(cap.out, cap.err, ev('node_finished', { id: 'a', status: 'succeeded' }))
    sp.onEvent(cap.out, cap.err, ev('workflow_finished', { data: { outputs: { x: 1 } } }))
    sp.onEnd(cap.out, cap.err)
    expect(cap.errBuf()).toContain('→ A')
    const parsed = JSON.parse(cap.outBuf().trim()) as { x: number }
    expect(parsed.x).toBe(1)
  })
})

describe('streamPrinterFor — unknown mode', () => {
  it('throws', () => {
    expect(() => streamPrinterFor('whatever')).toThrow()
  })
})
