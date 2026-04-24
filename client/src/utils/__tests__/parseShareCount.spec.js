import { describe, test, expect } from 'vitest'
import { parseShareCount } from '../parseShareCount.js'

describe('parseShareCount', () => {
  // ── Valid shorthand ───────────────────────────────────────────────────────

  test('"5 M" returns 5_000_000', () => {
    expect(parseShareCount('5 M')).toBe(5_000_000)
  })

  test('"250 K" returns 250_000', () => {
    expect(parseShareCount('250 K')).toBe(250_000)
  })

  test('"0.5 M" returns 500_000', () => {
    expect(parseShareCount('0.5 M')).toBe(500_000)
  })

  test('"1.5 B" returns 1_500_000_000', () => {
    expect(parseShareCount('1.5 B')).toBe(1_500_000_000)
  })

  test('"1 K" returns 1_000 (exactly at minimum)', () => {
    expect(parseShareCount('1 K')).toBe(1_000)
  })

  // ── Invalid shorthand (return null) ──────────────────────────────────────

  test('"0.5 K" returns null (500 < 1,000)', () => {
    expect(parseShareCount('0.5 K')).toBeNull()
  })

  test('"1K" returns null (no space between number and suffix)', () => {
    expect(parseShareCount('1K')).toBeNull()
  })

  test('"5 X" returns null (unknown suffix)', () => {
    expect(parseShareCount('5 X')).toBeNull()
  })

  test('"5 m" returns null (lowercase suffix — case-sensitive)', () => {
    expect(parseShareCount('5 m')).toBeNull()
  })

  // ── Valid raw ─────────────────────────────────────────────────────────────

  test('"5000000" returns 5_000_000', () => {
    expect(parseShareCount('5000000')).toBe(5_000_000)
  })

  test('"0" returns 0', () => {
    expect(parseShareCount('0')).toBe(0)
  })

  test('"  250000  " returns 250_000 (whitespace stripped)', () => {
    expect(parseShareCount('  250000  ')).toBe(250_000)
  })

  // ── Invalid input (return null) ───────────────────────────────────────────

  test('"abc" returns null', () => {
    expect(parseShareCount('abc')).toBeNull()
  })

  test('"" (empty string) returns null', () => {
    expect(parseShareCount('')).toBeNull()
  })

  test('null returns null', () => {
    expect(parseShareCount(null)).toBeNull()
  })

  test('undefined returns null', () => {
    expect(parseShareCount(undefined)).toBeNull()
  })
})
