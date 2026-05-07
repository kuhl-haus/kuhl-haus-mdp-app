/**
 * useDashboardStore — canonical UI state for the trading dashboard.
 *
 * Replaces the active ticker state previously managed by useWidgetBus.
 * Active ticker is keyed by link color — 9 colors, each holding a ticker symbol or null.
 */
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { LINK_COLORS } from '@/composables/useWidgetBus.js'

export const useDashboardStore = defineStore('dashboard', () => {
  // Active ticker per link color — null means no ticker selected for that color
  const activeTickers = reactive(
    Object.fromEntries(LINK_COLORS.map(c => [c.name, null]))
  )

  // Global filter mode flag (used by DailyRangeAlerts)
  const filterMode = ref(false)

  function setActiveTicker(color, ticker) {
    if (color && color in activeTickers) {
      activeTickers[color] = ticker || null
    }
  }

  function getActiveTicker(color) {
    if (!color || !(color in activeTickers)) return null
    return activeTickers[color]
  }

  function clearActiveTicker(color) {
    if (color && color in activeTickers) activeTickers[color] = null
  }

  function clearAll() {
    for (const color of Object.keys(activeTickers)) {
      activeTickers[color] = null
    }
    filterMode.value = false
  }

  return { activeTickers, filterMode, setActiveTicker, getActiveTicker, clearActiveTicker, clearAll }
})
