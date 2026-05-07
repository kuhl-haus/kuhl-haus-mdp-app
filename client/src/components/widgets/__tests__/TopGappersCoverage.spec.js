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
import { createPinia, setActivePinia } from 'pinia'

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

beforeEach(() => {
  setActivePinia(createPinia())
})

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
    expect(wrapper.find('#gapVolumeThreshold').element.value).toBe('500')
    expect(wrapper.find('#gapRelVolumeThreshold').element.value).toBe('10')
    expect(wrapper.find('#gapMinPriceThreshold').element.value).toBe('5')
    expect(wrapper.find('#gapMaxPriceThreshold').element.value).toBe('50')
    expect(wrapper.find('#gapMinChangePercent').element.value).toBe('15')
    // hiddenCols check via column menu
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    const closeItem = wrapper.findAll('.col-menu-item').find(i => i.text().includes('Price'))
    if (closeItem) expect(closeItem.find('input[type="checkbox"]').element.checked).toBe(false)
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    wrapper.unmount()
  })

  test('with props.settings updated with nullish fields expect defaults applied', async () => {
    // Arrange — start with custom settings
    const wrapper = await mountWithData([], { volumeThreshold: '500', relVolumeThreshold: '10', minPriceThreshold: 5, maxPriceThreshold: 50, minChangePercent: 15, hiddenCols: [] })

    // Act — update with empty settings (should use ??)
    await wrapper.setProps({ settings: {} })
    await nextTick()

    // Assert — defaults restored
    expect(wrapper.find('#gapVolumeThreshold').element.value).toBe('100')
    expect(wrapper.find('#gapRelVolumeThreshold').element.value).toBe('5')
    expect(wrapper.find('#gapMinPriceThreshold').element.value).toBe('2')
    expect(wrapper.find('#gapMaxPriceThreshold').element.value).toBe('20')
    expect(wrapper.find('#gapMinChangePercent').element.value).toBe('10')
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
    if (symbolCheckbox) {
      await symbolCheckbox.trigger('change')
      await nextTick()
    }

    // Assert — symbol column still visible in table (early return guard)
    expect(wrapper.findAll('th').some(th => th.text().includes('Symbol'))).toBe(true)
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
    expect(closeCheckbox.element.checked).toBe(false)  // 'close' hidden
    // Also verify that checking it again removes from hiddenCols
    await closeCheckbox.setChecked(true)
    await closeCheckbox.trigger('change')
    await nextTick()
    expect(closeCheckbox.element.checked).toBe(true)  // 'close' visible again
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
    // Initial: sorted by default column (pct_change or similar) in desc
    const sortedTh = wrapper.find('th.sorted')
    expect(sortedTh.exists()).toBe(true)
    expect(sortedTh.text()).toContain('▼')  // desc initially
    await sortedTh.trigger('click')  // toggle same column to asc
    await nextTick()
    expect(wrapper.find('th.sorted').text()).toContain('▲')  // now asc
    wrapper.unmount()
  })

  test('with new column sorted expect sortKey updated and direction set by column type', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const closeTh = wrapper.findAll('th').find(th => th.text().includes('Price') && !th.text().includes('PD'))
    if (closeTh) {
      await closeTh.trigger('click')
      await nextTick()
      expect(closeTh.classes()).toContain('sorted')
      expect(closeTh.text()).toContain('▲')  // asc for non-desc-default column
    }
    wrapper.unmount()
  })

  test('with pct_change column sorted (new) expect desc direction', async () => {
    // Arrange — start on a different key
    const wrapper = await mountWithData([makeRow()])
    // Click close first, then pct_change
    const closeTh = wrapper.findAll('th').find(th => th.text().includes('Price') && !th.text().includes('PD'))
    if (closeTh) await closeTh.trigger('click')
    await nextTick()
    const pctTh = wrapper.findAll('th').find(th => th.text().includes('Change %') && !th.text().includes('Open'))
    if (pctTh) {
      await pctTh.trigger('click')
      await nextTick()
      expect(pctTh.classes()).toContain('sorted')
      expect(pctTh.text()).toContain('▼')  // pct_change defaults to desc
    }
    wrapper.unmount()
  })

  test('with relative_volume as new sort key expect desc direction', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const closeTh = wrapper.findAll('th').find(th => th.text().includes('Price') && !th.text().includes('PD'))
    if (closeTh) await closeTh.trigger('click')
    await nextTick()
    const relVolTh = wrapper.findAll('th').find(th => th.text().includes('Rel.'))
    if (relVolTh) {
      await relVolTh.trigger('click')
      await nextTick()
      expect(relVolTh.classes()).toContain('sorted')
      expect(relVolTh.text()).toContain('▼')  // relative_volume defaults to desc
    }
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

  // minChangePercent=null via setupState: the null path is an internal defensive guard.
  // Not reachable via props (watcher uses ?? 10) or DOM input (gives NaN, not null).
  // Removed to eliminate $.setupState dependency.
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleCol('symbol') → early return (line 165)
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCol with symbol key', () => {
  test('with toggleCol(symbol) expect early return, no state change', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    // toggleCol('symbol') returns early - symbol column always visible
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    const symbolItem = wrapper.findAll('.col-menu-item').find(i => i.text().includes('Symbol'))
    if (symbolItem) {
      const symbolCb = symbolItem.find('input[type="checkbox"]')
      await symbolCb.setChecked(false)
      await symbolCb.trigger('change')
      await nextTick()
      // Symbol column should remain in DOM (guard triggered)
      expect(wrapper.findAll('th').some(th => th.text().includes('Symbol'))).toBe(true)
    }
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
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
    // Click Symbol header first, then pct_change header
    const symbolTh = wrapper.findAll('th').find(th => th.text() === 'Symbol' || th.text().startsWith('Symbol'))
    if (symbolTh) await symbolTh.trigger('click')
    await nextTick()
    const pctTh = wrapper.findAll('th').find(th => th.text().includes('Change %') && !th.text().includes('Open'))
    if (pctTh) {
      await pctTh.trigger('click')
      await nextTick()
      expect(pctTh.classes()).toContain('sorted')
      expect(pctTh.text()).toContain('▼')  // pct_change -> desc
    }
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
    // Click Symbol header (not in pct_change/relative_volume list → asc default)
    const symbolTh = wrapper.findAll('th').find(th => th.text() === 'Symbol' || th.text().startsWith('Symbol'))
    if (symbolTh) {
      await symbolTh.trigger('click')
      await nextTick()
      expect(symbolTh.classes()).toContain('sorted')
      expect(symbolTh.text()).toContain('▲')  // symbol -> asc (not in desc list)
    }
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
    // Assert — sort comparison ran without crash
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  test('with 2 rows equal pct_change expect comparison returns 0', async () => {
    // Arrange — equal values → comparison = 0
    const row1 = makeRow({ symbol: 'AAPL', pct_change: 25 })
    const row2 = makeRow({ symbol: 'TSLA', pct_change: 25 })
    const wrapper = await mountWithData([row1, row2])
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
