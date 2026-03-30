/**
 * useWidgetBus — lightweight cross-widget event bus for ticker linking.
 *
 * Widgets are grouped by a shared link color. When a Scanner or Alert widget
 * calls setActiveTicker(color, ticker), all Content widgets watching that
 * color receive the update via getActiveTicker(color) or the activeTickers map.
 *
 * Active ticker state is intentionally ephemeral — it resets on page reload.
 *
 * Usage:
 *   import { useWidgetBus } from '@/composables/useWidgetBus.js'
 *   const { setActiveTicker, getActiveTicker, activeTickers, LINK_COLORS } = useWidgetBus()
 */
import { reactive } from 'vue'

// 9-color palette — high contrast, distinct at a glance
export const LINK_COLORS = [
  { name: 'red',    hex: '#ef4444' },
  { name: 'orange', hex: '#f97316' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'green',  hex: '#22c55e' },
  { name: 'blue',   hex: '#3b82f6' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'pink',   hex: '#ec4899' },
  { name: 'cyan',   hex: '#06b6d4' },
  { name: 'white',  hex: '#e5e7eb' },
]

export const LINK_COLOR_MAP = Object.fromEntries(LINK_COLORS.map(c => [c.name, c.hex]))

// ── News freshness state ─────────────────────────────────────────────────────
// Map of ticker → timestamp (ms) of most recent article mentioning that ticker.
// Updated by news feed widgets; consumed by scanner widgets.
const newsTimestamps = reactive({})

const FLAME_THRESHOLDS = [
  { variant: 'red',    maxH: 1   },
  { variant: 'orange', maxH: 3   },
  { variant: 'yellow', maxH: 12  },
  { variant: 'white',  maxH: 24  },
  { variant: 'blue',   maxH: 72  },
  { variant: 'dark',   maxH: Infinity },
]

const FLAME_LABELS = {
  red:    'Hot news',
  orange: 'Recent news',
  yellow: 'News today',
  white:  'Multi-session news',
  blue:   'Older news',
  dark:   'Stale news',
}

function formatAge(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function getFlameVariant(ticker) {
  const ts = newsTimestamps[ticker]
  if (!ts) return null
  const h = (Date.now() - ts) / 3_600_000
  return FLAME_THRESHOLDS.find(t => h < t.maxH)?.variant ?? 'dark'
}

export function getFlameTooltip(ticker) {
  const ts = newsTimestamps[ticker]
  if (!ts) return null
  const variant = getFlameVariant(ticker)
  return `${FLAME_LABELS[variant]} — ${formatAge(Date.now() - ts)}`
}

export function setNewsTimestamp(ticker, timestamp) {
  if (!ticker) return
  // Only update if newer than existing
  if (!newsTimestamps[ticker] || timestamp > newsTimestamps[ticker]) {
    newsTimestamps[ticker] = timestamp
  }
}

export { newsTimestamps }

// ── Active ticker state ───────────────────────────────────────────────────────
// Shared reactive state — single instance across all components (module singleton)
const activeTickers = reactive(
  Object.fromEntries(LINK_COLORS.map(c => [c.name, null]))
)

export function useWidgetBus() {
  const setActiveTicker = (color, ticker) => {
    if (color && color in activeTickers) {
      activeTickers[color] = ticker || null
    }
  }

  const getActiveTicker = (color) => {
    if (!color || !(color in activeTickers)) return null
    return activeTickers[color]
  }

  const clearActiveTicker = (color) => {
    if (color && color in activeTickers) activeTickers[color] = null
  }

  return { activeTickers, setActiveTicker, getActiveTicker, clearActiveTicker, LINK_COLORS, LINK_COLOR_MAP }
}
