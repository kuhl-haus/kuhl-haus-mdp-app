/**
 * Parse a user-entered share count string. Returns a number or null.
 *
 * Format 1 — shorthand: "{number} {suffix}" (space required)
 *   Suffix: K (×1,000), M (×1,000,000), B (×1,000,000,000) — case-sensitive
 *   Minimum parsed result: 1,000. Below 1,000 → null.
 *   No space between number and suffix → null.
 *   Unknown suffix → null.
 *
 * Format 2 — raw: a plain number string (no suffix)
 *   Integer or decimal, any value ≥ 0. Leading/trailing whitespace stripped.
 *   0 is valid and returns 0.
 *
 * Invalid input → null.
 */
export function parseShareCount(input) {
  if (input == null) return null
  const str = String(input).trim()
  if (!str) return null

  // Shorthand: "{number} {suffix}" — space required between number and suffix
  const shorthand = str.match(/^(\d+(?:\.\d+)?)\s+(K|M|B)$/)
  if (shorthand) {
    const num = parseFloat(shorthand[1])
    const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }
    const result = num * multipliers[shorthand[2]]
    return result >= 1_000 ? result : null
  }

  // Raw number (no suffix)
  const raw = Number(str)
  if (!Number.isFinite(raw) || raw < 0) return null
  return raw
}
