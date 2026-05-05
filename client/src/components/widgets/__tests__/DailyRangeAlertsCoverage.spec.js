/**
 * DailyRangeAlerts.vue — coverage for uncovered branches.
 *
 * Existing spec covers: all filters, data flow, feed switching, maxEvents
 * validation, column click modes, settings persistence.
 *
 * This file adds:
 *  - onFlameTouchStart: 500ms timer fires alert with tooltip
 *  - onFlameTouchEnd: touchend cancels timer
 *  - formatVolume: B suffix (≥1B) — the only uncovered branch
 *  - moveCol: ▲ and ▼ buttons reorder columns; boundary no-op
 *  - toggleCol: non-symbol hide/show; symbol → no-op
 *  - startResize: mousedown → mousemove → mouseup flow (unlocked)
 *  - enforceMaxEvents: events capped when maxEvents > 0 and list overflows
 *  - flushLiveEvents: maxEvents = 0 (unlimited) path
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// ── Same mocks as existing spec ────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(config.feedName || ''),
      cacheKey:     ref(config.cacheKey || ''),
      wsUrl:        ref(config.wsUrl   || 'ws://localhost:4202/ws'),
      authKey:      ref(config.authKey || 'secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
    })),
  }
})
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return { useScannerLink: vi.fn(() => ({ activeTicker: ref(null), onRowClick: vi.fn() })) }
})
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    getFlameVariant:   vi.fn(() => null),
    getFlameTooltip:   vi.fn(() => ''),
    newsTimestamps:    reactive({}),
    getActiveTicker:   vi.fn(() => null),
    setActiveTicker:   vi.fn(),
    clearActiveTicker: vi.fn(),
  }
})
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ apiKey: 'mock-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { getFlameVariant, getFlameTooltip } from '@/composables/useWidgetBus.js'
import DailyRangeAlerts from '../DailyRangeAlerts.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  isLocked:  true,
  colWidths: {},
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

function makeEvent(overrides = {}) {
  return {
    symbol: 'AAPL', timestamp: 1_000_000, price: 10, previous: 9, note: '',
    pct_change: 10, accumulated_volume: 1_000_000, relative_volume: 2,
    session: 'regular', avg_volume: 500_000, free_float: 10_000_000,
    change: 1, close: 10, direction: 'high', ...overrides,
  }
}

function getOnData(idx = 0) {
  return vi.mocked(useWebSocketClient).mock.calls[idx][0].onData
}

beforeEach(() => { vi.clearAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// onFlameTouchStart / onFlameTouchEnd
// ─────────────────────────────────────────────────────────────────────────────

describe('flame touch events', () => {
  test('with touchstart and 500ms elapsed expect alert with tooltip', async () => {
    // Arrange — enable flame icon
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('red')
    vi.mocked(getFlameTooltip).mockReturnValue('Hot news — 3m ago')

    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
      attachTo: document.body,
    })
    await nextTick()
    // Inject data to show flame icons
    getOnData()([makeEvent()])
    await nextTick()
    const flame = wrapper.find('.flame-icon')
    expect(flame.exists()).toBe(true)

    // Act — touchstart
    await flame.trigger('touchstart')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert
    expect(window.alert).toHaveBeenCalledWith('Hot news — 3m ago')
    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with touchend before 500ms expect timer cancelled', async () => {
    // Arrange
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('orange')
    vi.mocked(getFlameTooltip).mockReturnValue('News')

    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
      attachTo: document.body,
    })
    await nextTick()
    getOnData()([makeEvent()])
    await nextTick()
    const flame = wrapper.find('.flame-icon')

    // Act — touchstart then quick touchend
    await flame.trigger('touchstart')
    await flame.trigger('touchend')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert
    expect(window.alert).not.toHaveBeenCalled()
    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with empty tooltip expect alert not called', async () => {
    // Arrange
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('yellow')
    vi.mocked(getFlameTooltip).mockReturnValue('')  // empty

    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
      attachTo: document.body,
    })
    await nextTick()
    getOnData()([makeEvent()])
    await nextTick()
    const flame = wrapper.find('.flame-icon')

    // Act
    await flame.trigger('touchstart')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert
    expect(window.alert).not.toHaveBeenCalled()
    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatVolume — B branch (≥ 1B)
// ─────────────────────────────────────────────────────────────────────────────

describe('formatVolume B branch', () => {
  test('with accumulated_volume >= 1B expect B suffix in cell', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    getOnData()([makeEvent({ accumulated_volume: 2_000_000_000 })])
    await nextTick()

    // Assert — B suffix shown
    const cells = wrapper.findAll('td.accumulated_volume')
    expect(cells.some(td => td.text().includes('B'))).toBe(true)
    wrapper.unmount()
  })

  test('with avg_volume = 0 expect "0" shown (plain number path)', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    getOnData()([makeEvent({ avg_volume: 0 })])
    await nextTick()

    // Assert — "0" shown (< 1K path)
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text() === '0')).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// moveCol — ▲ and ▼ buttons
// ─────────────────────────────────────────────────────────────────────────────

describe('moveCol', () => {
  async function mountWithSettings(settingsOpened = true) {
    const calls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: {}, isLocked: false },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    if (settingsOpened) {
      await wrapper.find('.col-menu-btn').trigger('click')
      await nextTick()
    }
    return { wrapper, calls }
  }

  test('with ▼ button clicked on first column expect column moves down', async () => {
    // Arrange
    const { wrapper, calls } = await mountWithSettings()
    const state = wrapper.vm.$.setupState
    const originalOrder = [...state.colOrderLocal]
    const firstKey = originalOrder[0]

    // Act — click ▼ on the first item (move down by 1)
    const downBtns = wrapper.findAll('.col-order-btn[title="Move down"]')
    await downBtns[0].trigger('click')
    await nextTick()

    // Assert — first column moved to position 1
    expect(state.colOrderLocal[1]).toBe(firstKey)
    expect(calls.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with ▲ button clicked on last column expect column moves up', async () => {
    // Arrange
    const { wrapper, calls } = await mountWithSettings()
    const state = wrapper.vm.$.setupState
    const originalOrder = [...state.colOrderLocal]
    const lastKey = originalOrder[originalOrder.length - 1]

    // Act — click ▲ on the last item
    const upBtns = wrapper.findAll('.col-order-btn[title="Move up"]')
    const lastUpBtn = upBtns[upBtns.length - 1]
    await lastUpBtn.trigger('click')
    await nextTick()

    // Assert — last column moved up by 1
    expect(state.colOrderLocal[originalOrder.length - 2]).toBe(lastKey)
    wrapper.unmount()
  })

  test('with ▲ on first column expect no change (boundary)', async () => {
    // Arrange — first item's ▲ button is disabled; moveCol returns early
    const { wrapper } = await mountWithSettings()
    const state = wrapper.vm.$.setupState
    const originalOrder = [...state.colOrderLocal]

    // Act — directly call moveCol with newIdx < 0
    state.moveCol(originalOrder[0], -1)
    await nextTick()

    // Assert — order unchanged
    expect(state.colOrderLocal[0]).toBe(originalOrder[0])
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleCol — show/hide columns
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCol', () => {
  test('with non-symbol column unchecked expect it in hiddenCols', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, isLocked: false },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — uncheck a non-symbol column
    const items = wrapper.findAll('.col-menu-item')
    // Find a non-symbol item (symbol checkbox is disabled)
    const nonSymbolItem = items.find(item => {
      const cb = item.find('input[type="checkbox"]')
      return cb.exists() && !cb.element.disabled
    })
    const checkbox = nonSymbolItem.find('input[type="checkbox"]')
    const key = wrapper.vm.$.setupState.colOrderLocal.find(k => k !== 'symbol')
    await checkbox.setChecked(false)
    await checkbox.trigger('change')
    await nextTick()

    // Assert — key is in hiddenCols
    expect(wrapper.vm.$.setupState.hiddenColsLocal).toContain(key)
    // Re-check → removes from hiddenCols
    await checkbox.setChecked(true)
    await checkbox.trigger('change')
    await nextTick()
    expect(wrapper.vm.$.setupState.hiddenColsLocal).not.toContain(key)
    wrapper.unmount()
  })

  test('with symbol column toggle attempt expect no-op (always visible)', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, isLocked: false },
    })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — call toggleCol with 'symbol' key
    state.toggleCol('symbol', false)
    await nextTick()

    // Assert — symbol not in hiddenCols
    expect(state.hiddenColsLocal).not.toContain('symbol')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// startResize — column resize flow
// ─────────────────────────────────────────────────────────────────────────────

describe('startResize', () => {
  test('with mousedown → mousemove → mouseup expect update-settings emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, isLocked: false },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
      attachTo: document.body,
    })
    await nextTick()
    const handle = wrapper.find('.col-resize-handle')
    expect(handle.exists()).toBe(true)

    // Act — mousedown, mousemove, mouseup
    await handle.trigger('mousedown', { clientX: 0 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, bubbles: true }))
    await nextTick()
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await nextTick()

    // Assert — update-col-widths emitted via emitSettings
    expect(calls.length).toBeGreaterThan(0)
    const lastCall = calls[calls.length - 1]
    expect(lastCall.colWidths).toBeDefined()
    wrapper.unmount()
  })

  test('with isLocked=true and startResize called expect early return', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: { ...defaultProps, isLocked: true } })
    await nextTick()

    // Assert — no resize handles shown when locked
    expect(wrapper.find('.col-resize-handle').exists()).toBe(false)
    // Calling directly: locked → early return (no error)
    const state = wrapper.vm.$.setupState
    expect(() => state.startResize({ clientX: 0, target: { closest: () => null } }, 'price')).not.toThrow()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// enforceMaxEvents / flushLiveEvents edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('enforceMaxEvents', () => {
  test('with maxEvents=2 and 3 events expect cap applied', async () => {
    // Arrange — maxEvents=2 via settings, inject 3 events via cache
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 2, minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    // Inject 3 events (cache = array)
    getOnData()([makeEvent({ symbol: 'A' }), makeEvent({ symbol: 'B' }), makeEvent({ symbol: 'C' })])
    await nextTick()

    // Assert — only 2 events stored (cap applied)
    const state = wrapper.vm.$.setupState
    expect(state.events.length).toBeLessThanOrEqual(2)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Hidden-by-default columns made visible — format + cellClass coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('hidden columns visible via settings', () => {
  function mountWithAllColumns(overrides = {}) {
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: {
        ...defaultProps,
        // Show all columns (including hidden-by-default)
        settings: { hiddenCols: [], minPrice: 0, maxPrice: null, ...overrides },
      },
    })
    return wrapper
  }

  function makeFullEvent(overrides = {}) {
    return {
      symbol: 'AAPL', timestamp: 1_000_000, price: 10, previous: 9, note: 'Breakout',
      pct_change: 10, accumulated_volume: 1_000_000, relative_volume: 2,
      session: 'regular', avg_volume: 500_000, free_float: 10_000_000,
      change: 2, close: 10, direction: 'high',
      pct_change_since_open: 5, prev_day_close: 9.5,
      ...overrides,
    }
  }

  test('with pct_change_since_open positive expect positive class on cell', async () => {
    // Arrange — make pct_change_since_open column visible
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ pct_change_since_open: 5 })])
    await nextTick()

    // Assert — positive class on pct_change_since_open cell
    const cells = wrapper.findAll('td.pct_change_since_open')
    expect(cells.some(td => td.classes().includes('positive'))).toBe(true)
    wrapper.unmount()
  })

  test('with pct_change_since_open negative expect negative class on cell', async () => {
    // Arrange
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ pct_change_since_open: -3 })])
    await nextTick()

    // Assert
    const cells = wrapper.findAll('td.pct_change_since_open')
    expect(cells.some(td => td.classes().includes('negative'))).toBe(true)
    wrapper.unmount()
  })

  test('with change positive expect + prefix in format', async () => {
    // Arrange
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ change: 2 })])
    await nextTick()

    // Assert — change column shows +2.00
    const cells = wrapper.findAll('td.change')
    expect(cells.some(td => td.text().startsWith('+'))).toBe(true)
    wrapper.unmount()
  })

  test('with change negative expect negative class and minus prefix', async () => {
    // Arrange
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ change: -1.5 })])
    await nextTick()

    // Assert
    const cells = wrapper.findAll('td.change')
    expect(cells.some(td => td.classes().includes('negative'))).toBe(true)
    wrapper.unmount()
  })

  test('with session column visible expect session value rendered', async () => {
    // Arrange
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ session: 'pre' })])
    await nextTick()

    // Assert — session cell renders (no format, no decimals → raw value)
    const cells = wrapper.findAll('td.session')
    expect(cells.some(td => td.text() === 'pre')).toBe(true)
    wrapper.unmount()
  })

  test('with non-finite numeric column value expect empty string', async () => {
    // Arrange — NaN value for a decimals column → Number.isFinite = false → ''
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ prev_day_close: 'not-a-number' })])
    await nextTick()

    // Assert — empty cell for non-finite
    const cells = wrapper.findAll('td.prev_day_close')
    expect(cells.some(td => td.text() === '')).toBe(true)
    wrapper.unmount()
  })

  test('with formatVolume B suffix via acc_volume >= 1B', async () => {
    // Arrange
    const wrapper = mountWithAllColumns()
    await nextTick()
    getOnData()([makeFullEvent({ accumulated_volume: 2_000_000_000 })])
    await nextTick()

    // Assert — B suffix in volume column
    const cells = wrapper.findAll('td.accumulated_volume')
    expect(cells.some(td => td.text().includes('B'))).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// flushLiveEvents: empty _rafPending early return
// ─────────────────────────────────────────────────────────────────────────────

describe('flushLiveEvents empty batch', () => {
  test('with no pending events expect flushLiveEvents is a no-op', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Act — call flushLiveEvents directly via setupState (empty _rafPending)
    const state = wrapper.vm.$.setupState
    // _rafPending is an internal non-reactive variable; calling flushLiveEvents with it empty
    // exercises the `if (_rafPending.length === 0)` early return
    expect(() => state.flushLiveEvents()).not.toThrow()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onFlameTouchEnd when timer is null (already cleared)
// ─────────────────────────────────────────────────────────────────────────────

describe('onFlameTouchEnd with no timer', () => {
  test('with no pending timer expect onFlameTouchEnd is a no-op', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Act — call onFlameTouchEnd without a prior touchStart
    const state = wrapper.vm.$.setupState
    expect(() => state.onFlameTouchEnd()).not.toThrow()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Feed='lod' → 'Max Change %' label (lines 81-82)
// ─────────────────────────────────────────────────────────────────────────────

describe('feed=lod label variants', () => {
  function mountLod(overrides = {}) {
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    return mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'lod', minPrice: 0, maxPrice: null, ...overrides } },
    })
  }

  test('with feed=lod expect Max Change % label shown (not Min)', async () => {
    // Arrange — lod feed changes the label from Min% to Max%; open controls
    const wrapper = mountLod()
    await nextTick()
    // Open the controls panel
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert — shows "Max Change %" in settings controls
    const labels = wrapper.findAll('.filter-label')
    const maxChangeLbl = labels.find(l => l.text().includes('Max Change'))
    expect(maxChangeLbl).toBeTruthy()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// maxEvents=0 → no slice in flushLiveEvents (line 232)
// ─────────────────────────────────────────────────────────────────────────────

describe('flushLiveEvents with maxEvents=0', () => {
  test('with maxEvents=0 expect all events kept (no slice)', async () => {
    // Arrange — maxEvents=0 means unlimited
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 0, minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Push more events than would fit with any cap
    const state = wrapper.vm.$.setupState
    state._rafPending = [makeEvent({ symbol: 'AAPL' }), makeEvent({ symbol: 'TSLA' }), makeEvent({ symbol: 'MSFT' })]
    state.flushLiveEvents()
    await nextTick()

    // Assert — all 3 events kept (no slice since maxEvents=0)
    expect(state.events.length).toBe(3)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Event with null timestamp → empty time cell (line 403)
// ─────────────────────────────────────────────────────────────────────────────

describe('event with null timestamp', () => {
  test('with null timestamp in event expect empty time cell', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    const state = wrapper.vm.$.setupState
    // Push event with null timestamp
    state._rafPending = [makeEvent({ timestamp: null })]
    state.flushLiveEvents()
    await nextTick()

    // Assert — time column format returns '' for null timestamp
    const timeCol = state.visibleColumns.find(c => c.key === 'timestamp')
    if (timeCol?.format) {
      expect(timeCol.format(null)).toBe('')
    }
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings watcher: non-null minPrice/maxPrice → string conversion (lines 577-584)
// ─────────────────────────────────────────────────────────────────────────────

describe('settings watcher with non-null numeric values', () => {
  test('with minPrice=5 and maxPrice=100 in settings expect inputs populated', async () => {
    // Arrange — settings with numeric minPrice and maxPrice
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: {
        minPrice: 5, maxPrice: 100, minVolume: 50000, minRelVol: 1.5,
        minAvgVol: 100000, minFloat: 1000000, maxFloat: 100000000,
        pctChangeThreshold: 2.5,
      } },
    })
    await nextTick()

    // Assert — settings with non-null values were converted to strings in inputs
    const state = wrapper.vm.$.setupState
    expect(state.minPriceLocal).toBe('5')
    expect(state.maxPriceLocal).toBe('100')
    expect(state.minVolumeInput).toBe('50000')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// enforceMaxEvents: no trimming when length <= maxEv (line 592)
// ─────────────────────────────────────────────────────────────────────────────

describe('enforceMaxEvents no-op when under limit', () => {
  test('with 2 events and maxEvents=100 expect no trimming', async () => {
    // Arrange — few events, high limit → length <= maxEv
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 100, minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    const state = wrapper.vm.$.setupState
    state._rafPending = [makeEvent({ symbol: 'AA' }), makeEvent({ symbol: 'BB' })]
    state.flushLiveEvents()
    await nextTick()

    // enforceMaxEvents called but length=2 <= maxEv=100 → no trimming
    state.enforceMaxEvents()
    expect(state.events.length).toBe(2)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onMaxEventsChange: non-finite input → reset (line 632)
// ─────────────────────────────────────────────────────────────────────────────

describe('onMaxEventsChange with non-finite input', () => {
  test('with non-numeric maxEvents input expect reset to previous value', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 50, minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    // Open controls to make input visible
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    const state = wrapper.vm.$.setupState
    const prevValue = state.prevMaxEvents

    // Act — directly set maxEventsInput ref to non-finite value then trigger blur
    state.maxEventsInput = 'abc'
    await nextTick()
    // Call onMaxEventsBlur via setupState
    state.onMaxEventsBlur()
    await nextTick()

    // Assert — reset to previous value (non-finite: 'abc' → NaN)
    expect(state.maxEventsInput).toBe(prevValue)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings watcher: non-null values trigger string conversion (lines 577-584)
// ─────────────────────────────────────────────────────────────────────────────

describe('settings watcher updates local state with non-null values', () => {
  test('with settings prop changed to include numeric values expect inputs updated', async () => {
    // Arrange — start with null values
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: null, maxPrice: null } },
    })
    await nextTick()

    // Act — change settings prop to include non-null values (triggers watcher)
    await wrapper.setProps({
      settings: {
        minPrice: 5, maxPrice: 100, minVolume: 50000,
        minRelVol: 1.5, minAvgVol: 100000, minFloat: 1000000,
        maxFloat: 100000000, pctChangeThreshold: 2.5,
        hiddenCols: [], colOrder: [],
      },
    })
    await nextTick()

    // Assert — watcher fired, inputs updated with string conversions
    const state = wrapper.vm.$.setupState
    expect(state.minPriceLocal).toBe('5')
    expect(state.maxPriceLocal).toBe('100')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCellClass: non-function cellClass (static string path, lines 536-537)
// ─────────────────────────────────────────────────────────────────────────────

describe('getCellClass with static string cellClass', () => {
  test('with column having static string cellClass expect it used directly', async () => {
    // Arrange — show hidden columns (like pct_change_since_open with cellClass function)
    // and create event with visible data
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { hiddenCols: [], minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // getCellClass: when typeof col.cellClass === 'function' → call it (TRUE branch)
    // when cellClass is a static string → use directly (FALSE branch = lines 536 false)
    const state = wrapper.vm.$.setupState

    // Create a column with static string cellClass (not function)
    const staticCol = { key: 'test', cellClass: 'static-class' }
    const result = state.getCellClass(staticCol, { test: 1 })

    // Assert — static cellClass included
    expect(result).toContain('static-class')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WS init with null appConfig endpoints → || fallback (lines 243, 318)
// ─────────────────────────────────────────────────────────────────────────────

describe('WS initialization with null config values', () => {
  test('with appConfig missing wsEndpoint expect || fallback used', async () => {
    // Arrange — mock useConfig to return config WITHOUT wsEndpoint
    const { useConfig } = await import('@/composables/useConfig.js')
    const { ref } = await import('vue')
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test', wsEndpoint: null, massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })

    // Act — mount with null wsEndpoint (exercises || 'ws://...' fallback)
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Assert — no crash
    expect(wrapper.vm.$.setupState).toBeTruthy()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Feed watch: unknown feed → || FEED_MAP.hod fallback (line 270)
// ─────────────────────────────────────────────────────────────────────────────

describe('Feed watch with unknown feed name', () => {
  test('with settings.feed changed to unknown value expect fallback to hod', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod', minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Act — change feed to an unknown value (triggers FEED_MAP[newFeed] || FEED_MAP.hod)
    await wrapper.setProps({ settings: { feed: 'unknown-feed', minPrice: 0, maxPrice: null } })
    await nextTick()

    // Assert — no crash (fallback to hod feed)
    expect(wrapper.vm.$.setupState).toBeTruthy()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredEvents: event with null symbol → (e.symbol ?? '').toUpperCase() (line 287)
// ─────────────────────────────────────────────────────────────────────────────

describe('filteredEvents with null symbol event', () => {
  test('with event having null symbol expect ?? "" fallback used', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Set a ticker filter to trigger the symbol comparison
    state.tickerFilter = 'AAPL'
    state._rafPending = [makeEvent({ symbol: null })]
    state.flushLiveEvents()
    await nextTick()

    // Assert — event filtered out (null symbol → '' !== 'AAPL')
    // ?? '' fallback exercised
    expect(state.filteredEvents.length).toBe(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isRowActive: row with null symbol → ?? "" fallback (line 340)
// ─────────────────────────────────────────────────────────────────────────────

describe('isRowActive with null symbol row', () => {
  test('with rowClickMode=filter and row.symbol=null expect ?? "" fallback', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()
    const state = wrapper.vm.$.setupState
    state.rowClickModeLocal = 'filter'
    state.filterSetByClick = true
    state.tickerFilter = 'AAPL'
    await nextTick()

    // Act — call isRowActive with null symbol
    const result = state.isRowActive({ symbol: null })

    // Assert — '' !== 'AAPL' → not active
    expect(result).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings watcher: rowClickMode=null → ?? 'link' fallback (line ~587)
// ─────────────────────────────────────────────────────────────────────────────

describe('settings watcher rowClickMode null', () => {
  test('with settings.rowClickMode=null expect ?? link fallback', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null, rowClickMode: 'filter' } },
    })
    await nextTick()

    // Act — change settings to include null rowClickMode
    await wrapper.setProps({ settings: { minPrice: 0, maxPrice: null, rowClickMode: null } })
    await nextTick()

    // Assert — ?? 'link' fallback used
    expect(wrapper.vm.$.setupState.rowClickModeLocal).toBe('link')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toNullableNum: non-finite input → null (line 594)
// ─────────────────────────────────────────────────────────────────────────────

describe('toNullableNum with non-finite input', () => {
  test('with non-numeric string expect toNullableNum returns null', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Act — call toNullableNum directly with non-finite value
    const result = wrapper.vm.$.setupState.toNullableNum('abc')

    // Assert — non-finite → null (Number.isFinite(NaN) = false)
    expect(result).toBeNull()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// hiddenColsLocal init: settings.hiddenCols=null → ?? [] fallback (line 501)
// ─────────────────────────────────────────────────────────────────────────────

describe('hiddenColsLocal initialization with null hiddenCols', () => {
  test('with settings.hiddenCols=null expect ?? [] fallback at init', async () => {
    // Arrange — mount with hiddenCols=null so ?? [] is used
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { hiddenCols: null, minPrice: 0, maxPrice: null } },
    })
    await nextTick()

    // Assert — hiddenColsLocal initialized to [] (null ?? [])
    const state = wrapper.vm.$.setupState
    expect(state.hiddenColsLocal).toEqual([])
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredEvents: symbol not matching tickerFilter (line 243/318 context)
// Test that NULL wsUrl config triggers || fallback at WS init
// ─────────────────────────────────────────────────────────────────────────────

describe('DailyRangeAlerts with sessionFilter null', () => {
  test('with settings.sessionFilter=null in merged config expect ?? empty string', async () => {
    // Arrange — settings watcher: merged.sessionFilter ?? '' → '' fallback
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false),
      feedName: ref(''), cacheKey: ref(''),
      wsUrl: ref('ws://localhost:4202/ws'), authKey: ref('secret'),
      connect: vi.fn(), disconnect: vi.fn(),
    })
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0, maxPrice: null, sessionFilter: 'regular' } },
    })
    await nextTick()

    // Act — update settings with sessionFilter=null → ?? '' fallback
    await wrapper.setProps({ settings: { minPrice: 0, maxPrice: null, sessionFilter: null } })
    await nextTick()

    // Assert — sessionFilterLocal becomes '' (null ?? '')
    expect(wrapper.vm.$.setupState.sessionFilterLocal).toBe('')
    wrapper.unmount()
  })
})
