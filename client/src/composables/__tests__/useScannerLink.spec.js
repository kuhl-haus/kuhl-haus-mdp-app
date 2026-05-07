/**
 * Tests for useScannerLink composable.
 *
 * useScannerLink wraps useDashboardStore — test via onRowClick and verify
 * store state. Reset store between tests via createPinia().
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useScannerLink } from '../useScannerLink.js'
import { useDashboardStore } from '@/stores/useDashboardStore.js'
import { LINK_COLORS } from '@/constants/linkColors.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useScannerLink', () => {
  // ------------------------------------------------------------------
  // onRowClick
  // ------------------------------------------------------------------

  it('test_useScannerLink_with_color_and_ticker_expect_store_updated', () => {
    const linkColor = ref('blue')
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({ symbol: 'AAPL' })

    expect(store.activeTickers['blue']).toBe('AAPL')
  })

  it('test_useScannerLink_with_no_color_expect_no_store_update', () => {
    const linkColor = ref(null)
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({ symbol: 'AAPL' })

    LINK_COLORS.forEach(({ name }) => {
      expect(store.activeTickers[name]).toBeNull()
    })
  })

  it('test_useScannerLink_with_ticker_field_expect_store_updated', () => {
    const linkColor = ref('red')
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({ ticker: 'MSFT' })

    expect(store.activeTickers['red']).toBe('MSFT')
  })

  it('test_useScannerLink_with_no_symbol_or_ticker_expect_no_store_update', () => {
    const linkColor = ref('green')
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({})

    expect(store.activeTickers['green']).toBeNull()
  })

  it('test_useScannerLink_clicking_active_ticker_again_expect_clears', () => {
    const linkColor = ref('orange')
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({ symbol: 'NVDA' })
    expect(store.activeTickers['orange']).toBe('NVDA')

    onRowClick({ symbol: 'NVDA' })
    expect(store.activeTickers['orange']).toBeNull()
  })

  it('test_useScannerLink_clicking_different_ticker_expect_updates', () => {
    const linkColor = ref('cyan')
    const { onRowClick } = useScannerLink(linkColor)
    const store = useDashboardStore()

    onRowClick({ symbol: 'AMD' })
    onRowClick({ symbol: 'NVDA' })

    expect(store.activeTickers['cyan']).toBe('NVDA')
  })

  // ------------------------------------------------------------------
  // activeTicker computed
  // ------------------------------------------------------------------

  it('test_useScannerLink_activeTicker_reflects_store_state', () => {
    const linkColor = ref('violet')
    const { activeTicker, onRowClick } = useScannerLink(linkColor)

    expect(activeTicker.value).toBeNull()

    onRowClick({ symbol: 'SPY' })
    expect(activeTicker.value).toBe('SPY')
  })

  it('test_useScannerLink_activeTicker_with_no_color_expect_null', () => {
    const linkColor = ref(null)
    const { activeTicker } = useScannerLink(linkColor)

    expect(activeTicker.value).toBeNull()
  })

  it('test_useScannerLink_activeTicker_updates_when_color_changes', () => {
    const linkColor = ref('pink')
    const { activeTicker, onRowClick } = useScannerLink(linkColor)

    onRowClick({ symbol: 'QQQ' })
    expect(activeTicker.value).toBe('QQQ')

    linkColor.value = 'white'
    expect(activeTicker.value).toBeNull()
  })
})
