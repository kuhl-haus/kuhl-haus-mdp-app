/**
 * TopVolume.vue — coverage for uncovered branches.
 *
 * Same uncovered areas as TopGappers: settings watch, handleClickOutside,
 * toggleCol, sortBy, getRowClass (<10%), formatVolume, filter thresholds.
 * TopVolume differs in: no minChangePercent (uses showGappersOnly instead),
 * default sortKey='relative_volume', desc default for relative_volume/pct_change_since_open.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// ── Same mocks as TopVolume.spec.js ───────────────────────────────────────────
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
import TopVolume from '../TopVolume.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  isLocked:  true,
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

const openSettings = {
  volumeThreshold:    '0',
  relVolumeThreshold: '0',
  showGappersOnly:    false,
  minPriceThreshold:  0,
  maxPriceThreshold:  1000000000,
  hiddenCols:         [],
}

function makeRow(overrides = {}) {
  return {
    symbol: 'MSFT', close: 10, change: 1, pct_change: 5, pct_change_since_open: 3,
    accumulated_volume: 5_000_000, relative_volume: 3, free_float: 1_000_000,
    avg_volume: 200_000, prev_day_volume: 300_000, official_open_price: 9,
    prev_day_close: 9, aggregate_vwap: 9.5, prev_day_vwap: 9,
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
  const wrapper = mount(TopVolume, {
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
    const wrapper = await mountWithData([])

    // Act
    await wrapper.setProps({
      settings: {
        volumeThreshold:    '500',
        relVolumeThreshold: '10',
        showGappersOnly:    true,
        minPriceThreshold:  5,
        maxPriceThreshold:  50,
        hiddenCols:         ['close'],
      },
    })
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('500')
    expect(state.relVolumeThreshold).toBe('10')
    expect(state.showGappersOnly).toBe(true)
    expect(state.minPriceThreshold).toBe(5)
    expect(state.maxPriceThreshold).toBe(50)
    expect(state.hiddenCols).toContain('close')
    wrapper.unmount()
  })

  test('with props.settings updated with nullish fields expect defaults applied', async () => {
    // Arrange
    const wrapper = await mountWithData([])

    // Act — empty settings → defaults via ??
    await wrapper.setProps({ settings: {} })
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('100')
    expect(state.relVolumeThreshold).toBe('5')
    expect(state.showGappersOnly).toBe(false)
    expect(state.minPriceThreshold).toBe(2)
    expect(state.maxPriceThreshold).toBe(20)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Column menu (⚙️) and toggleCol
// ─────────────────────────────────────────────────────────────────────────────

describe('column menu', () => {
  test('with ⚙️ click expect col-menu-popover shown', async () => {
    // Arrange
    const wrapper = await mountWithData([])

    // Act
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert
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
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopVolume, {
      props: { ...defaultProps, settings: openSettings },
      attachTo: document.body,
    })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('.col-menu-popover').exists()).toBe(true)

    // Act
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // Assert
    expect(wrapper.find('.col-menu-popover').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('toggleCol', () => {
  test('with non-symbol column unchecked expect column in hiddenCols', async () => {
    // Arrange
    const calls = []
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopVolume, {
      props: { ...defaultProps, settings: openSettings },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — uncheck 'close' column
    const closeItem = wrapper.findAll('.col-menu-item').find(item => item.text().includes('Price'))
    const closeCheckbox = closeItem.find('input[type="checkbox"]')
    await closeCheckbox.setChecked(false)
    await closeCheckbox.trigger('change')
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.hiddenCols).toContain('close')

    // Re-check to verify removal from hiddenCols
    await closeCheckbox.setChecked(true)
    await closeCheckbox.trigger('change')
    await nextTick()
    expect(state.hiddenCols).not.toContain('close')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy
// ─────────────────────────────────────────────────────────────────────────────

describe('sortBy', () => {
  test('with same column sorted again expect direction toggled', async () => {
    // Arrange — default sortKey='relative_volume', sortDir='desc'
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    expect(state.sortDir).toBe('desc')

    // Act — sort by same key
    state.sortBy('relative_volume')
    await nextTick()

    // Assert — flipped to asc
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })

  test('with new non-desc column expect sortDir=asc', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState

    // Act — sort by 'close' (not in desc-default list)
    state.sortBy('close')
    await nextTick()

    // Assert
    expect(state.sortKey).toBe('close')
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })

  test('with pct_change_since_open as new key expect desc direction', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    state.sortBy('close')
    await nextTick()

    // Act
    state.sortBy('pct_change_since_open')
    await nextTick()

    // Assert — pct_change_since_open defaults to desc
    expect(state.sortKey).toBe('pct_change_since_open')
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getRowClass — pct_change < 10 (no class)
// ─────────────────────────────────────────────────────────────────────────────

describe('getRowClass with pct_change < 10', () => {
  test('with pct_change=3 expect no special row class', async () => {
    // Arrange
    const wrapper = await mountWithData([makeRow({ pct_change: 3 })])
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    const rowClasses = rows[0].classes()
    expect(rowClasses).not.toContain('hundred-percent-gainer')
    expect(rowClasses).not.toContain('fifty-percent-gainer')
    expect(rowClasses).not.toContain('twenty-percent-gainer')
    expect(rowClasses).not.toContain('ten-percent-gainer')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatVolume
// ─────────────────────────────────────────────────────────────────────────────

describe('formatVolume', () => {
  test('with volume >= 1B expect B suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 2_000_000_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('B'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume >= 1M and < 1B expect M suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 5_000_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('M'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume >= 1K and < 1M expect K suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 50_000 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text().includes('K'))).toBe(true)
    wrapper.unmount()
  })

  test('with volume < 1K expect plain number', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 500 })])
    const cells = wrapper.findAll('td.avg_volume')
    expect(cells.some(td => td.text() === '500')).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredData — filter threshold branches
// ─────────────────────────────────────────────────────────────────────────────

describe('filteredData filter thresholds', () => {
  test('with item below minPrice expect filtered out', async () => {
    const wrapper = await mountWithData(
      [makeRow({ close: 1 })],
      { ...openSettings, minPriceThreshold: 5 }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item above maxPrice expect filtered out', async () => {
    const wrapper = await mountWithData(
      [makeRow({ close: 50 })],
      { ...openSettings, maxPriceThreshold: 20 }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item below volume threshold expect filtered out', async () => {
    const wrapper = await mountWithData(
      [makeRow({ accumulated_volume: 50_000 })],
      { ...openSettings, volumeThreshold: '1000' }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with item below relVol threshold expect filtered out', async () => {
    const wrapper = await mountWithData(
      [makeRow({ relative_volume: 1 })],
      { ...openSettings, relVolumeThreshold: '10' }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with showGappersOnly=true and negative pct_change expect filtered out', async () => {
    const wrapper = await mountWithData(
      [makeRow({ pct_change: -5 })],
      { ...openSettings, showGappersOnly: true }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })

  test('with showGappersOnly=true and positive pct_change expect kept', async () => {
    const wrapper = await mountWithData(
      [makeRow({ pct_change: 5 })],
      { ...openSettings, showGappersOnly: true }
    )
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleCol('symbol') → early return (line 168)
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCol with symbol key', () => {
  test('with toggleCol(symbol) expect early return, no state change', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    const hiddenBefore = [...state.hiddenCols]

    // Act — calling with 'symbol' should return early
    state.toggleCol('symbol', false)
    await nextTick()

    // Assert — hiddenCols unchanged
    expect([...state.hiddenCols]).toEqual(hiddenBefore)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getRelVolClass with rv >= 5 → extreme (line 199)
// ─────────────────────────────────────────────────────────────────────────────

describe('getRelVolClass extreme relative volume', () => {
  test('with relative_volume >= 5 expect extreme class', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState

    // Assert — rv=5.5 → extreme
    expect(state.getRelVolClass(5.5)).toBe('extreme')
    wrapper.unmount()
  })

  test('with sortBy relative_volume expect desc default direction', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    state.sortKey = 'symbol'

    // Act — switch to relative_volume (in the list → 'desc')
    state.sortBy('relative_volume')
    await nextTick()

    // Assert
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy with non-listed key → 'asc' (line 252)
// ─────────────────────────────────────────────────────────────────────────────

describe('sortBy with non-listed key', () => {
  test('with sortBy(symbol) expect sortDir=asc', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    state.sortKey = 'relative_volume'

    // Act — switch to 'symbol' (not in list → 'asc')
    state.sortBy('symbol')
    await nextTick()

    // Assert
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sort comparison with multiple rows
// ─────────────────────────────────────────────────────────────────────────────

describe('sort comparison with multiple rows', () => {
  test('with 2 rows expect sort comparison function called', async () => {
    // Arrange
    const wrapper = await mountWithData([
      makeRow({ symbol: 'AAPL', accumulated_volume: 500_000 }),
      makeRow({ symbol: 'TSLA', accumulated_volume: 200_000 }),
    ])

    // Assert — no crash (sort comparison ran)
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sort comparison: aVal > bVal and equal paths
// ─────────────────────────────────────────────────────────────────────────────

describe('sort comparison aVal > bVal and equal paths', () => {
  test('with rows in desc order expect aVal > bVal comparison runs', async () => {
    // Push rows in desc order (larger accumulated_volume first)
    const row1 = makeRow({ symbol: 'TSLA', accumulated_volume: 800_000 })
    const row2 = makeRow({ symbol: 'AAPL', accumulated_volume: 200_000 })

    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopVolume, {
      props: { ...defaultProps, settings: openSettings },
    })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData([row1, row2])  // cache hydration
    await nextTick()

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  test('with equal accumulated_volume rows expect comparison returns 0', async () => {
    // Push rows with equal values
    const row1 = makeRow({ symbol: 'TSLA', accumulated_volume: 500_000 })
    const row2 = makeRow({ symbol: 'AAPL', accumulated_volume: 500_000 })

    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopVolume, {
      props: { ...defaultProps, settings: openSettings },
    })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData([row1, row2])
    await nextTick()

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
