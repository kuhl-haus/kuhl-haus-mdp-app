/**
 * useScannerLink — scanner-side widget bus integration.
 *
 * Call in any Scanner widget to get:
 *   - onRowClick(row): call when a row is clicked; broadcasts symbol to bus
 *   - activeTicker: computed active ticker for this link color (for row highlight)
 *
 * @param {import('vue').Ref<string|null>} linkColorRef  - reactive linkColor prop
 */
import { computed } from 'vue'
import { useDashboardStore } from '@/stores/useDashboardStore.js'

export function useScannerLink(linkColorRef) {
  const store = useDashboardStore()

  const activeTicker = computed(() => {
    const color = linkColorRef.value
    return color ? store.activeTickers[color] : null
  })

  const onRowClick = (row) => {
    const color = linkColorRef.value
    if (!color) return
    const symbol = row.symbol || row.ticker || null
    if (!symbol) return
    // Toggle: clicking the active ticker clears it
    const current = store.activeTickers[color]
    store.setActiveTicker(color, current === symbol ? null : symbol)
  }

  return { activeTicker, onRowClick }
}
