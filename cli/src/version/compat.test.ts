import { describe, expect, it } from 'vitest'
import { compatString, difyCompat } from './compat.js'

describe('difyCompat', () => {
  it('exposes minDify and maxDify as readonly strings', () => {
    expect(typeof difyCompat.minDify).toBe('string')
    expect(typeof difyCompat.maxDify).toBe('string')
  })
})

describe('compatString', () => {
  it('formats as "dify >=min, <=max"', () => {
    expect(compatString()).toMatch(/^dify >=\d+\.\d+\.\d+(-[\w.]+)?, <=\d+\.\d+\.\d+(-[\w.]+)?$/)
  })
})
