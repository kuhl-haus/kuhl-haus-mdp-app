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
import { reactive, computed } from 'vue'

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
