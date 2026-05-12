import type { BaseError } from './base.js'
import { renderEnvelope } from './envelope.js'

export type FormatErrorOptions = {
  readonly format?: string
}

export function formatErrorForCli(err: BaseError, opts: FormatErrorOptions = {}): string {
  if (opts.format === 'json')
    return renderEnvelope(err)
  return humanError(err)
}

function humanError(err: BaseError): string {
  const lines: string[] = [`${err.code}: ${err.message}`]
  if (err.hint !== undefined)
    lines.push(`hint: ${err.hint}`)
  if (err.method !== undefined && err.url !== undefined)
    lines.push(`request: ${err.method} ${err.url}`)
  if (err.httpStatus !== undefined)
    lines.push(`http_status: ${err.httpStatus}`)
  return lines.join('\n')
}
