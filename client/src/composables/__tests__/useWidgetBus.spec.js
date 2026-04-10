/**
 * Tests for useWidgetBus composable.
 *
 * useWidgetBus is a module singleton — activeTickers state persists across
 * imports within the same test run. Each test clears all colors via
 * clearActiveTicker to ensure isolation without needing module resets.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useWidgetBus, LINK_COLORS } from '../useWidgetBus.js'

// Helper: clear all colors between tests
function resetBus() {
  const { clearActiveTicker } = useWidgetBus()
  LINK_COLORS.forEach(c => clearActiveTicker(c.name))
}

describe('useWidgetBus', () => {
  beforeEach(() => {
    resetBus()
  })

  // ------------------------------------------------------------------
  // Initial state
  // ------------------------------------------------------------------

  it('test_activeTickers_with_initial_state_expect_all_null', () => {
    const { activeTickers } = useWidgetBus()
    LINK_COLORS.forEach(({ name }) => {
      expect(activeTickers[name]).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // setActiveTicker
  // ------------------------------------------------------------------

  it('test_setActiveTicker_with_valid_color_expect_ticker_set', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('red', 'AAPL')
    expect(activeTickers['red']).toBe('AAPL')
  })

  it('test_setActiveTicker_with_invalid_color_expect_no_change', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('magenta', 'AAPL')  // not a valid color
    expect(activeTickers['magenta']).toBeUndefined()
    // Valid colors remain untouched
    LINK_COLORS.forEach(({ name }) => {
      expect(activeTickers[name]).toBeNull()
    })
  })

  it('test_setActiveTicker_with_null_ticker_expect_null', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('blue', 'TSLA')
    setActiveTicker('blue', null)
    expect(activeTickers['blue']).toBeNull()
  })

  it('test_setActiveTicker_with_empty_string_ticker_expect_null', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('green', 'MSFT')
    setActiveTicker('green', '')
    expect(activeTickers['green']).toBeNull()
  })

  it('test_setActiveTicker_with_null_color_expect_no_change', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker(null, 'AAPL')
    LINK_COLORS.forEach(({ name }) => {
      expect(activeTickers[name]).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // getActiveTicker
  // ------------------------------------------------------------------

  it('test_getActiveTicker_with_set_ticker_expect_value_returned', () => {
    const { setActiveTicker, getActiveTicker } = useWidgetBus()
    setActiveTicker('orange', 'NVDA')
    expect(getActiveTicker('orange')).toBe('NVDA')
  })

  it('test_getActiveTicker_with_unset_color_expect_null', () => {
    const { getActiveTicker } = useWidgetBus()
    expect(getActiveTicker('yellow')).toBeNull()
  })

  it('test_getActiveTicker_with_invalid_color_expect_null', () => {
    const { getActiveTicker } = useWidgetBus()
    expect(getActiveTicker('magenta')).toBeNull()
  })

  it('test_getActiveTicker_with_null_color_expect_null', () => {
    const { getActiveTicker } = useWidgetBus()
    expect(getActiveTicker(null)).toBeNull()
  })

  // ------------------------------------------------------------------
  // clearActiveTicker
  // ------------------------------------------------------------------

  it('test_clearActiveTicker_with_set_ticker_expect_null', () => {
    const { setActiveTicker, clearActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('violet', 'AMD')
    clearActiveTicker('violet')
    expect(activeTickers['violet']).toBeNull()
  })

  it('test_clearActiveTicker_with_invalid_color_expect_no_error', () => {
    const { clearActiveTicker } = useWidgetBus()
    expect(() => clearActiveTicker('magenta')).not.toThrow()
  })

  // ------------------------------------------------------------------
  // Reactivity — multiple callers share same state
  // ------------------------------------------------------------------

  it('test_activeTickers_shared_across_composable_instances', () => {
    const bus1 = useWidgetBus()
    const bus2 = useWidgetBus()
    bus1.setActiveTicker('cyan', 'SPY')
    // bus2 sees the same reactive state
    expect(bus2.activeTickers['cyan']).toBe('SPY')
    expect(bus2.getActiveTicker('cyan')).toBe('SPY')
  })

  it('test_setActiveTicker_does_not_affect_other_colors', () => {
    const { setActiveTicker, activeTickers } = useWidgetBus()
    setActiveTicker('pink', 'QQQ')
    const unaffected = LINK_COLORS.map(c => c.name).filter(n => n !== 'pink')
    unaffected.forEach(name => {
      expect(activeTickers[name]).toBeNull()
    })
  })
})
