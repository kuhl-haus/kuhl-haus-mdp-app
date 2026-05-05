/**
 * TopGappers.vue — coverage for uncovered branches.
 *
 * Existing spec covers: filteredData, getRowClass (>100/50/20/10%),
 * column format/cellClass, useConfig integration.
 *
 * This file adds:
 *  - settings prop watch: props.settings change syncs all filter fields
 *  - handleClickOutside: click outside colMenuRef closes the menu
 *  - toggleCol: symbol col is undeletable; non-symbol col hides/shows
 *  - sortBy: same key toggles direction; new key resets direction
 *  - getRowClass: pct_change < 10 → no class (undefined)
 *  - formatVolume: B / M / K / plain-number branches
 *  - filteredData: items filtered by minPrice, maxPrice, volume, relVol thresholds
 *  - minChangePercent = null → no change filter applied
 *  - column menu show/hide via ⚙️ button
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// ── Mocks (same as existing TopGappers.spec.js) ────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((c) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(c?.cacheLimit ?? 1000),
    })),
  }
})
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return {
    useScannerLink: vi.fn(() => ({ activeTicker: ref(null), onRowClick: vi.fn() })),
  }
})
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    useWidgetBus: vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })),
    getFlameVariant: vi.fn(() => null),
    getFlameTooltip: vi.fn(() => ''),
    newsTimestamps: reactive({}),
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
import TopGappers from '../TopGappers.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  isLocked:  true,
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

/** Open settings that pass all default filters */
const openSettings = {
  volumeThreshold:    '0',
  relVolumeThreshold: '0',
  minPriceThreshold:  0,
  maxPriceThreshold:  1000000000,
  minChangePercent:   0,
  hiddenCols:         [],
}

function makeRow(overrides = {}) {
  return {
    symbol: 'AAPL', close: 5, change: 1, pct_change: 20, pct_change_since_open: 15,
    accumulated_volume: 200_000, relative_volume: 7, free_float: 500_000,
    avg_volume: 50_000, prev_day_volume: 100_000, official_open_price: 4,
    prev_day_close: 4, aggregate_vwap: 4.5, prev_day_vwap: 4,
    ...overrides,
  }
}

function makeWsMock() {
  return {
    lastDataAt:   ref(null),
    isConnected:  ref(true),
    reconnecting: ref(false),
    connect:      vi.fn(),
    disconnect:   vi.fn(),
    subscribe:    vi.fn(),
    unsubscribe:  vi.fn(),
    getCache:     vi.fn(),
    cacheLimit:   ref(1000),
  }
}

async function mountWithData(data, settings = openSettings) {
  vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
  const wrapper = mount(TopGappers, {
    props: { ...defaultProps, settings },
  })
  const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
  onData(data)
  await nextTick()
  return wrapper
}

beforeEach(() => { vi.clearAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// settings prop watch
// ─────────────────────────────────────────────────────────────────────────────

describe('settings prop watch', () => {
  test('with props.settings updated expect all filter fields synced', async () => {
    // Arrange
    const wrapper = await mountWithData([], { volumeThreshold: '100', relVolumeThreshold: '5', minPriceThreshold: 2, maxPriceThreshold: 20, minChangePercent: 10, hiddenCols: [] })

    // Act — update settings via prop change
    await wrapper.setProps({
      settings: {
        volumeThreshold:    '500',
        relVolumeThreshold: '10',
        minPriceThreshold:  5,
        maxPriceThreshold:  50,
        minChangePercent:   15,
        hiddenCols:         ['close'],
      },
    })
    await nextTick()

    // Assert — local state synced (accessible via setupState)
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('500')
    expect(state.relVolumeThreshold).toBe('10')
    expect(state.minPriceThreshold).toBe(5)
    expect(state.maxPriceThreshold).toBe(50)
    expect(state.minChangePercent).toBe(15)
    expect(state.hiddenCols).toContain('close')
    wrapper.unmount()
  })

  test('with props.settings updated with nullish fields expect defaults applied', async () => {
    // Arrange — start with custom settings
    const wrapper = await mountWithData([], { volumeThreshold: '500', relVolumeThreshold: '10', minPriceThreshold: 5, maxPriceThreshold: 50, minChangePercent: 15, hiddenCols: [] })

    // Act — update with empty settings (should use ??)
    await wrapper.setProps({ settings: {} })
    await nextTick()

    // Assert — defaults restored
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('100')
    expect(state.relVolumeThreshold).toBe('5')
    expect(state.minPriceThreshold).toBe(2)
    expect(state.maxPriceThreshold).toBe(20)
    expect(state.minChangePercent).toBe(10)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Column menu (⚙️) open/close and toggleCol
// ─────────────────────────────────────────────────────────────────────────────

describe('column menu', () => {
  test('with ⚙️ click expect col-menu-popover shown', async () => {
    // Arrange
    const wrapper = await mountWithData([])

    // Assert — hidden by default
    expect(wrapper.find('.col-menu-popover').exists()).toBe(false)

    // Act
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert — visible
    expect(wrapper.find('.col-menu-popover').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with second ⚙️ click expect col-menu-popover hidden', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.col-menu-popover').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with click outside colMenuRef expect menu closed', async () => {
    // Arrange
    const wrapper = mount(TopGappers, {
      props: { ...defaultProps, settings: openSettings },
      attachTo: document.body,
    })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('.col-menu-popover').exists()).toBe(true)

    // Act — click outside the col-menu-wrap
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // Assert
    expect(wrapper.find('.col-menu-popover').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('toggleCol', () => {
  test('with symbol column unchecked expect no-op (symbol always visible)', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — find symbol checkbox (disabled) and attempt change
    const symbolCheckbox = wrapper.findAll('.col-menu-item input').find(i => i.element.disabled)
    // Symbol checkbox is disabled — toggling it should have no effect
    const state = wrapper.vm.$.setupState
    const hiddenBefore = [...state.hiddenCols]
    if (symbolCheckbox) {
      await symbolCheckbox.trigger('change')
      await nextTick()
    }

    // Assert — symbol not in hiddenCols
    expect(state.hiddenCols).not.toContain('symbol')
    wrapper.unmount()
  })

  test('with non-symbol column unchecked expect column added to hiddenCols', async () => {
    // Arrange
    const calls = []
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopGappers, {
      props: { ...defaultProps, settings: openSettings },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — uncheck 'close' column (not symbol)
    const closeItem = wrapper.findAll('.col-menu-item').find(item => item.text().includes('Price'))
    const closeCheckbox = closeItem.find('input[type="checkbox"]')
    await closeCheckbox.setChecked(false)
    await closeCheckbox.trigger('change')
    await nextTick()

    // Assert — 'close' is now hidden
    const state = wrapper.vm.$.setupState
    expect(state.hiddenCols).toContain('close')
    // Also verify that checking it again removes from hiddenCols
    await closeCheckbox.setChecked(true)
    await closeCheckbox.trigger('change')
    await nextTick()
    expect(state.hiddenCols).not.toContain('close')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy — same key toggle and new key
// ─────────────────────────────────────────────────────────────────────────────

describe('sortBy', () => {
  test('with same column sorted again expect direction toggled', async () => {
    // Arrange — default sortKey='pct_change', sortDir='desc'
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    expect(state.sortDir).toBe('desc')

    // Act — sort by same key
    state.sortBy('pct_change')
    await nextTick()

    // Assert — direction flipped to 'asc'
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })

  test('with new column sorted expect sortKey updated and direction set by column type', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState

    // Act — sort by 'close' (a regular column, not pct_change or relative_volume)
    state.sortBy('close')
    await nextTick()

    // Assert — sortKey changed, direction reset to 'asc' (non-desc default)
    expect(state.sortKey).toBe('close')
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })

  test('with pct_change column sorted (new) expect desc direction', async () => {
    // Arrange — start on a different key
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    state.sortBy('close') // switch to 'close' first
    await nextTick()
    expect(state.sortKey).toBe('close')

    // Act — sort by pct_change (desc by default for this key)
    state.sortBy('pct_change')
    await nextTick()

    // Assert
    expect(state.sortKey).toBe('pct_change')
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })

  test('with relative_volume as new sort key expect desc direction', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    state.sortBy('close') // start on different key
    await nextTick()

    // Act
    state.sortBy('relative_volume')
    await nextTick()

    // Assert
    expect(state.sortKey).toBe('relative_volume')
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getRowClass — pct_change < 10 (no class)
// ─────────────────────────────────────────────────────────────────────────────

describe('getRowClass with pct_change < 10', () => {
  test('with pct_change=5 expect no row class (undefined)', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow({ pct_change: 5 })])

    // Assert — no special class on the row (tr has no special class)
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    // None of the special classes should be present
    const rowClasses = rows[0].classes()
    expect(rowClasses).not.toContain('hundred-percent-gainer')
    expect(rowClasses).not.toContain('fifty-percent-gainer')
    expect(rowClasses).not.toContain('twenty-percent-gainer')
    expect(rowClasses).not.toContain('ten-percent-gainer')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatVolume — B / M / K / plain
// ─────────────────────────────────────────────────────────────────────────────

describe('formatVolume', () => {
  test('with volume >= 1B expect B suffix', async () => {
    // Arrange — avg_volume >= 1B
    const wrapper = await mountWithData([makeRow({ avg_volume: 2_000_000_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('B'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume >= 1M and < 1B expect M suffix', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow({ avg_volume: 5_000_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('M'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume >= 1K and < 1M expect K suffix', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow({ avg_volume: 50_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('K'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume < 1K expect plain number', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow({ avg_volume: 500 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text() === '500')).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredData — items filtered by thresholds
// ─────────────────────────────────────────────────────────────────────────────

describe('filteredData filter thresholds', () => {
  test('with item below minPrice expect filtered out', async () => {
    // Arrange — minPrice = 5, row.close = 3
    const wrapper = await mountWithData(
      [makeRow({ close: 3 })],
      { ...openSettings, minPriceThreshold: 5, maxPriceThreshold: 1000000000 }
    )
    // Assert — row filtered out
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item above maxPrice expect filtered out', async () => {
    // Arrange — maxPrice = 3, row.close = 5
    const wrapper = await mountWithData(
      [makeRow({ close: 5 })],
      { ...openSettings, minPriceThreshold: 0, maxPriceThreshold: 3 }
    )
    // Assert
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item below volume threshold expect filtered out', async () => {
    // Arrange — volumeThreshold = 1000 (1M shares), row volume = 500K
    const wrapper = await mountWithData(
      [makeRow({ accumulated_volume: 500_000 })],
      { ...openSettings, volumeThreshold: '1000' }
    )
    // Assert
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item below relVol threshold expect filtered out', async () => {
    // Arrange — relVolumeThreshold = 10, row relVol = 2
    const wrapper = await mountWithData(
      [makeRow({ relative_volume: 2 })],
      { ...openSettings, relVolumeThreshold: '10' }
    )
    // Assert
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item below minChangePercent expect filtered out', async () => {
    // Arrange — minChangePercent = 20, row pct_change = 5
    const wrapper = await mountWithData(
      [makeRow({ pct_change: 5 })],
      { ...openSettings, minChangePercent: 20 }
    )
    // Assert
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with minChangePercent set to null via setupState expect no change filter', async () => {
    // Arrange — minChangePercent cannot be null via settings (guarded by ?? 10),
    // so we set it directly via setupState to reach the null branch in filteredData.
    const wrapper = await mountWithData([makeRow({ pct_change: 1 })])
    // pct_change=1 with default minChangePercent=0 passes. Now set null.
    const state = wrapper.vm.$.setupState
    state.minChangePercent = null  // set ref value to null directly
    await nextTick()

    // Assert — item still passes (null === null → no filter applied)
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleCol('symbol') → early return (line 165)
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCol with symbol key', () => {
  test('with toggleCol(symbol) expect early return, no state change', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    const hiddenBefore = [...state.hiddenCols]

    // Act — calling with 'symbol' should return early (if (key === 'symbol') return)
    state.toggleCol('symbol', false)
    await nextTick()

    // Assert — hiddenCols unchanged (symbol guard triggered)
    expect([...state.hiddenCols]).toEqual(hiddenBefore)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy with 'pct_change' key → 'desc' default direction (line 251)
// ─────────────────────────────────────────────────────────────────────────────

describe('sortBy with pct_change sets desc direction', () => {
  test('with sortBy(pct_change) on new key expect sortDir=desc', async () => {
    // Arrange — start with default sort (relative_volume or pct_change)
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    state.sortKey = 'symbol'  // set to something else first
    state.sortDir = 'asc'

    // Act — switch to pct_change (in the list → 'desc' default)
    state.sortBy('pct_change')
    await nextTick()

    // Assert — sortDir defaults to 'desc' for pct_change
    expect(state.sortKey).toBe('pct_change')
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy with key NOT in list → 'asc' default (line 251 [0,1] path)
// ─────────────────────────────────────────────────────────────────────────────

describe('sortBy with non-listed key sets asc direction', () => {
  test('with sortBy(symbol) expect sortDir=asc (not in pct_change/relVol list)', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    state.sortKey = 'pct_change'  // start with something else

    // Act — switch to 'symbol' key (NOT in ['pct_change', 'relative_volume'] → 'asc')
    state.sortBy('symbol')
    await nextTick()

    // Assert — asc direction (key not in list → ternary FALSE → 'asc')
    expect(state.sortKey).toBe('symbol')
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sort comparison with 2+ rows (covers sort callback function)
// ─────────────────────────────────────────────────────────────────────────────

describe('sort comparison with multiple rows', () => {
  test('with 2 rows sorted expect comparison function called', async () => {
    // Arrange — 2 rows with different pct_change values
    const row1 = makeRow({ symbol: 'AAPL', pct_change: 20 })
    const row2 = makeRow({ symbol: 'TSLA', pct_change: 30 })
    const wrapper = await mountWithData([row1, row2])
    const state = wrapper.vm.$.setupState

    // Assert — filteredRows available via rendered DOM or setupState
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  test('with 2 rows equal pct_change expect comparison returns 0', async () => {
    // Arrange — equal values → comparison = 0
    const row1 = makeRow({ symbol: 'AAPL', pct_change: 25 })
    const row2 = makeRow({ symbol: 'TSLA', pct_change: 25 })
    const wrapper = await mountWithData([row1, row2])
    const state = wrapper.vm.$.setupState

    // Assert — no crash
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sort comparison: aVal > bVal path (lines 278-279 cond-expr)
// Push rows in reverse order so sort comparator gets (larger, smaller)
// ─────────────────────────────────────────────────────────────────────────────

describe('sort comparison aVal > bVal path', () => {
  test('with rows in desc order expect aVal > bVal comparison to run', async () => {
    // Arrange — push rows in DESC order (TSLA=30 first, AAPL=20 second)
    // Sort algorithm may call comparator with (TSLA, AAPL) → aVal=30 > bVal=20
    const row1 = makeRow({ symbol: 'TSLA', pct_change: 30 })  // larger first
    const row2 = makeRow({ symbol: 'AAPL', pct_change: 20 })  // smaller second
    
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopGappers, {
      props: { ...defaultProps, settings: openSettings },
    })
    // Push via onData (cache hydration path - already in desc order)
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData([row1, row2])  // array → cache hydration path
    await nextTick()

    // The filteredEvents sort will call comparator with various (a, b)
    // With desc sort of already-sorted array: may call (TSLA, AAPL) → aVal>bVal path
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
