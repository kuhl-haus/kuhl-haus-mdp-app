/**
 * Tests for useWidgetBus composable.
 *
 * useWidgetBus is a module singleton — activeTickers state persists across
 * imports within the same test run. Each test clears all colors via
 * clearActiveTicker to ensure isolation without needing module resets.
 */
import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useWidgetBus, LINK_COLORS, getFlameVariant, getFlameTooltip, setNewsTimestamp, newsTimestamps } from '../useWidgetBus.js'

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

// --------------------------------------------------------------------
// setNewsTimestamp
// --------------------------------------------------------------------

describe('setNewsTimestamp', () => {
  beforeEach(() => {
    // Clear newsTimestamps between tests
    Object.keys(newsTimestamps).forEach(k => delete newsTimestamps[k])
  })

  test('with new ticker expect timestamp set', () => {
    setNewsTimestamp('AAPL', 1000)
    expect(newsTimestamps['AAPL']).toBe(1000)
  })

  test('with newer timestamp expect value updated', () => {
    newsTimestamps['TSLA'] = 100
    setNewsTimestamp('TSLA', 9999)
    expect(newsTimestamps['TSLA']).toBe(9999)
  })

  test('with older timestamp expect value unchanged', () => {
    newsTimestamps['NVDA'] = 9999
    setNewsTimestamp('NVDA', 100)
    expect(newsTimestamps['NVDA']).toBe(9999)
  })

  test('with null ticker expect no-op', () => {
    setNewsTimestamp(null, 12345)
    expect(Object.keys(newsTimestamps).length).toBe(0)
  })

  test('with empty string ticker expect no-op', () => {
    setNewsTimestamp('', 12345)
    expect(Object.keys(newsTimestamps).length).toBe(0)
  })
})

// --------------------------------------------------------------------
// getFlameVariant
// --------------------------------------------------------------------

describe('getFlameVariant', () => {
  let nowSpy
  const REF_NOW = 10 * 3_600_000  // arbitrary reference point (10h epoch)

  beforeEach(() => {
    Object.keys(newsTimestamps).forEach(k => delete newsTimestamps[k])
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(REF_NOW)
  })
  afterEach(() => nowSpy.mockRestore())

  test('with no timestamp expect null', () => {
    expect(getFlameVariant('AAPL')).toBeNull()
  })

  test('with timestamp 30min ago expect red', () => {
    newsTimestamps['AAPL'] = REF_NOW - 30 * 60 * 1000  // 0.5h ago
    expect(getFlameVariant('AAPL')).toBe('red')
  })

  test('with timestamp 2h ago expect orange', () => {
    newsTimestamps['AAPL'] = REF_NOW - 2 * 3_600_000
    expect(getFlameVariant('AAPL')).toBe('orange')
  })

  test('with timestamp 6h ago expect yellow', () => {
    newsTimestamps['AAPL'] = REF_NOW - 6 * 3_600_000
    expect(getFlameVariant('AAPL')).toBe('yellow')
  })

  test('with timestamp 18h ago expect white', () => {
    newsTimestamps['AAPL'] = REF_NOW - 18 * 3_600_000
    expect(getFlameVariant('AAPL')).toBe('white')
  })

  test('with timestamp 48h ago expect blue', () => {
    newsTimestamps['AAPL'] = REF_NOW - 48 * 3_600_000
    expect(getFlameVariant('AAPL')).toBe('blue')
  })

  test('with timestamp 96h ago expect dark', () => {
    newsTimestamps['AAPL'] = REF_NOW - 96 * 3_600_000
    expect(getFlameVariant('AAPL')).toBe('dark')
  })
})

// --------------------------------------------------------------------
// getFlameTooltip (also covers formatAge branches)
// --------------------------------------------------------------------

describe('getFlameTooltip', () => {
  let nowSpy
  const REF_NOW = 200 * 3_600_000  // large base to avoid negatives

  beforeEach(() => {
    Object.keys(newsTimestamps).forEach(k => delete newsTimestamps[k])
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(REF_NOW)
  })
  afterEach(() => nowSpy.mockRestore())

  test('with no timestamp expect null', () => {
    expect(getFlameTooltip('AAPL')).toBeNull()
  })

  test('with timestamp returns string containing label and age', () => {
    newsTimestamps['AAPL'] = REF_NOW - 30 * 60 * 1000  // 30 min
    const tooltip = getFlameTooltip('AAPL')
    expect(typeof tooltip).toBe('string')
    expect(tooltip).toContain('Hot news')
    expect(tooltip).toContain('ago')
  })

  test('with age under 60s expect Xs ago format', () => {
    newsTimestamps['X'] = REF_NOW - 30 * 1000  // 30 seconds
    const tooltip = getFlameTooltip('X')
    expect(tooltip).toContain('30s ago')
  })

  test('with age in minutes expect Xm ago format', () => {
    newsTimestamps['X'] = REF_NOW - 5 * 60 * 1000  // 5 minutes
    const tooltip = getFlameTooltip('X')
    expect(tooltip).toContain('5m ago')
  })

  test('with age in hours expect Xh ago format', () => {
    newsTimestamps['X'] = REF_NOW - 3 * 3_600_000  // 3 hours
    const tooltip = getFlameTooltip('X')
    expect(tooltip).toContain('3h ago')
  })

  test('with age in days expect Xd ago format', () => {
    newsTimestamps['X'] = REF_NOW - 2 * 24 * 3_600_000  // 2 days
    const tooltip = getFlameTooltip('X')
    expect(tooltip).toContain('2d ago')
  })
})
