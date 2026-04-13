/**
 * Shared formatting utilities for EnhancedQuoteV2 and its child components.
 * Single source of truth — import from here, never copy-paste.
 */

/** Strip protocol and trailing slash; truncate to 30 chars. */
export const truncateUrl = (url) => {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)
}

/**
 * Truncate description text at the last word boundary before maxLen.
 * Default maxLen matches the EQV2 design spec (175 chars).
 */
export const truncateDesc = (text, maxLen = 175) => {
  if (!text || text.length <= maxLen) return text
  const cut = text.lastIndexOf(' ', maxLen)
  return cut > 0 ? text.slice(0, cut) : text.slice(0, maxLen)
}

/** Format large numbers with K/M/B suffixes. Returns '—' for non-finite values. */
export const fmtVol = (val) => {
  const v = parseFloat(val)
  if (!isFinite(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toString()
}
