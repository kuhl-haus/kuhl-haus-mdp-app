/**
 * Tests for useScannerLink composable.
 *
 * useScannerLink wraps useWidgetBus — test via onRowClick and verify
 * activeTickers state. Reset bus between tests via clearActiveTicker.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useScannerLink } from '../useScannerLink.js'
import { useWidgetBus, LINK_COLORS } from '../useWidgetBus.js'

function resetBus() {
  const { clearActiveTicker } = useWidgetBus()
  LINK_COLORS.forEach(c => clearActiveTicker(c.name))
}

describe('useScannerLink', () => {
  beforeEach(() => {
    resetBus()
  })

  // ------------------------------------------------------------------
  // onRowClick
  // ------------------------------------------------------------------

  it('test_useScannerLink_with_color_and_ticker_expect_bus_updated', () => {
    const linkColor = ref('blue')
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({ symbol: 'AAPL' })

    expect(activeTickers['blue']).toBe('AAPL')
  })

  it('test_useScannerLink_with_no_color_expect_no_bus_update', () => {
    const linkColor = ref(null)
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({ symbol: 'AAPL' })

    LINK_COLORS.forEach(({ name }) => {
      expect(activeTickers[name]).toBeNull()
    })
  })

  it('test_useScannerLink_with_ticker_field_expect_bus_updated', () => {
    // Some rows use 'ticker' instead of 'symbol'
    const linkColor = ref('red')
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({ ticker: 'MSFT' })

    expect(activeTickers['red']).toBe('MSFT')
  })

  it('test_useScannerLink_with_no_symbol_or_ticker_expect_no_bus_update', () => {
    const linkColor = ref('green')
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({})

    expect(activeTickers['green']).toBeNull()
  })

  it('test_useScannerLink_clicking_active_ticker_again_expect_clears', () => {
    // Toggle behavior: clicking the same ticker clears it
    const linkColor = ref('orange')
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({ symbol: 'NVDA' })
    expect(activeTickers['orange']).toBe('NVDA')

    onRowClick({ symbol: 'NVDA' })
    expect(activeTickers['orange']).toBeNull()
  })

  it('test_useScannerLink_clicking_different_ticker_expect_updates', () => {
    const linkColor = ref('cyan')
    const { onRowClick } = useScannerLink(linkColor)
    const { activeTickers } = useWidgetBus()

    onRowClick({ symbol: 'AMD' })
    onRowClick({ symbol: 'NVDA' })

    expect(activeTickers['cyan']).toBe('NVDA')
  })

  // ------------------------------------------------------------------
  // activeTicker computed
  // ------------------------------------------------------------------

  it('test_useScannerLink_activeTicker_reflects_bus_state', () => {
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

    // Switch to a color with no active ticker
    linkColor.value = 'white'
    expect(activeTicker.value).toBeNull()
  })
})
