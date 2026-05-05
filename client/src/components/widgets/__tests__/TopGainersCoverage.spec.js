/**
 * TopGainers.vue — coverage for uncovered branches.
 * Same structure as TopGappersCoverage.spec.js with TopGainers specifics:
 * - default sortKey = 'pct_change_since_open'
 * - desc-default keys: pct_change_since_open, relative_volume
 * - minChangePercent filter uses pct_change_since_open (not pct_change)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return { useWebSocketClient: vi.fn((c) => ({ lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false), connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), getCache: vi.fn(), cacheLimit: ref(1000) })) }
})
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return { useScannerLink: vi.fn(() => ({ activeTicker: ref(null), onRowClick: vi.fn() })) }
})
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return { useWidgetBus: vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })), getFlameVariant: vi.fn(() => null), getFlameTooltip: vi.fn(() => ''), newsTimestamps: reactive({}) }
})
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return { useConfig: vi.fn(() => ({ config: ref({ apiKey: 'k', wsEndpoint: 'ws://x', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })) }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import TopGainers from '../TopGainers.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }
const openSettings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0, maxPriceThreshold: 1000000000, minChangePercent: 0, hiddenCols: [] }

function makeRow(overrides = {}) {
  return { symbol: 'AAPL', close: 5, change: 1, pct_change: 20, pct_change_since_open: 15,
    accumulated_volume: 200_000, relative_volume: 7, free_float: 500_000,
    avg_volume: 50_000, prev_day_volume: 100_000, official_open_price: 4,
    prev_day_close: 4, aggregate_vwap: 4.5, prev_day_vwap: 4, ...overrides }
}
function makeWsMock() {
  return { lastDataAt: ref(null), isConnected: ref(true), reconnecting: ref(false), connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), getCache: vi.fn(), cacheLimit: ref(1000) }
}
async function mountWithData(data, settings = openSettings) {
  vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
  const wrapper = mount(TopGainers, { props: { ...defaultProps, settings } })
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
    const wrapper = await mountWithData([])
    await wrapper.setProps({ settings: { volumeThreshold: '500', relVolumeThreshold: '10', minPriceThreshold: 5, maxPriceThreshold: 50, minChangePercent: 15, hiddenCols: ['close'] } })
    await nextTick()
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('500')
    expect(state.minChangePercent).toBe(15)
    expect(state.hiddenCols).toContain('close')
    wrapper.unmount()
  })
  test('with nullish settings expect defaults applied', async () => {
    const wrapper = await mountWithData([])
    await wrapper.setProps({ settings: {} })
    await nextTick()
    const state = wrapper.vm.$.setupState
    expect(state.volumeThreshold).toBe('100')
    expect(state.minChangePercent).toBe(10)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Column menu + toggleCol
// ─────────────────────────────────────────────────────────────────────────────
describe('column menu', () => {
  test('with ⚙️ click expect popover shown', async () => {
    const wrapper = await mountWithData([])
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('.col-menu-popover').exists()).toBe(true)
    wrapper.unmount()
  })
  test('with click outside expect menu closed', async () => {
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopGainers, { props: { ...defaultProps, settings: openSettings }, attachTo: document.body })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.col-menu-popover').exists()).toBe(false)
    wrapper.unmount()
  })
  test('with non-symbol column unchecked expect column hidden', async () => {
    const calls = []
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(TopGainers, { props: { ...defaultProps, settings: openSettings }, attrs: { 'onUpdate-settings': (s) => calls.push(s) } })
    vi.mocked(useWebSocketClient).mock.calls[0][0].onData([])
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    const closeItem = wrapper.findAll('.col-menu-item').find(item => item.text().includes('Price'))
    const cb = closeItem.find('input[type="checkbox"]')
    await cb.setChecked(false); await cb.trigger('change'); await nextTick()
    expect(wrapper.vm.$.setupState.hiddenCols).toContain('close')
    await cb.setChecked(true); await cb.trigger('change'); await nextTick()
    expect(wrapper.vm.$.setupState.hiddenCols).not.toContain('close')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortBy
// ─────────────────────────────────────────────────────────────────────────────
describe('sortBy', () => {
  test('with same key click expect direction toggled', async () => {
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    expect(state.sortDir).toBe('desc')
    state.sortBy('pct_change_since_open')
    await nextTick()
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })
  test('with new column click expect sortKey updated', async () => {
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    state.sortBy('close')
    await nextTick()
    expect(state.sortKey).toBe('close')
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })
  test('with relative_volume as new key expect desc direction', async () => {
    const wrapper = await mountWithData([makeRow()])
    const state = wrapper.vm.$.setupState
    state.sortBy('close')
    await nextTick()
    state.sortBy('relative_volume')
    await nextTick()
    expect(state.sortKey).toBe('relative_volume')
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
  test('with two rows and asc sort expect correct ordering', async () => {
    const wrapper = await mountWithData([
      makeRow({ symbol: 'A', pct_change_since_open: 5, close: 10 }),
      makeRow({ symbol: 'B', pct_change_since_open: 20, close: 5 }),
    ])
    const state = wrapper.vm.$.setupState
    state.sortBy('pct_change_since_open')  // toggle to asc
    await nextTick()
    expect(state.filteredData[0].symbol).toBe('A')  // 5 < 20
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getRowClass with pct_change < 10
// ─────────────────────────────────────────────────────────────────────────────
describe('getRowClass', () => {
  test('with pct_change=5 expect no special class', async () => {
    const wrapper = await mountWithData([makeRow({ pct_change: 5 })])
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    expect(rows[0].classes()).not.toContain('ten-percent-gainer')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatVolume
// ─────────────────────────────────────────────────────────────────────────────
describe('formatVolume', () => {
  test('with volume >= 1B expect B suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 2_000_000_000 })])
    expect(wrapper.findAll('td.avg_volume').some(td => td.text().includes('B'))).toBe(true)
    wrapper.unmount()
  })
  test('with volume >= 1M expect M suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 5_000_000 })])
    expect(wrapper.findAll('td.avg_volume').some(td => td.text().includes('M'))).toBe(true)
    wrapper.unmount()
  })
  test('with volume >= 1K expect K suffix', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 50_000 })])
    expect(wrapper.findAll('td.avg_volume').some(td => td.text().includes('K'))).toBe(true)
    wrapper.unmount()
  })
  test('with volume < 1K expect plain number', async () => {
    const wrapper = await mountWithData([makeRow({ avg_volume: 500 })])
    expect(wrapper.findAll('td.avg_volume').some(td => td.text() === '500')).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredData thresholds
// ─────────────────────────────────────────────────────────────────────────────
describe('filteredData thresholds', () => {
  test('with close below minPrice expect filtered out', async () => {
    const wrapper = await mountWithData([makeRow({ close: 1 })], { ...openSettings, minPriceThreshold: 5 })
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })
  test('with close above maxPrice expect filtered out', async () => {
    const wrapper = await mountWithData([makeRow({ close: 50 })], { ...openSettings, maxPriceThreshold: 20 })
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })
  test('with volume below threshold expect filtered out', async () => {
    const wrapper = await mountWithData([makeRow({ accumulated_volume: 50_000 })], { ...openSettings, volumeThreshold: '1000' })
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })
  test('with relVol below threshold expect filtered out', async () => {
    const wrapper = await mountWithData([makeRow({ relative_volume: 1 })], { ...openSettings, relVolumeThreshold: '10' })
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })
  test('with pct_change_since_open below minChangePercent expect filtered out', async () => {
    const wrapper = await mountWithData([makeRow({ pct_change_since_open: 3 })], { ...openSettings, minChangePercent: 10 })
    expect(wrapper.findAll('tbody tr').length).toBe(0)
    wrapper.unmount()
  })
  test('with minChangePercent=null via setupState expect no filter', async () => {
    const wrapper = await mountWithData([makeRow({ pct_change_since_open: 1 })])
    wrapper.vm.$.setupState.minChangePercent = null
    await nextTick()
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleCol('symbol') → early return (line 166)
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCol with symbol key', () => {
  test('with toggleCol(symbol) expect early return, no state change', async () => {
    // Arrange
    const wrapper = await mountWithData([])
    const state = wrapper.vm.$.setupState
    const hiddenBefore = [...state.hiddenCols]

    // Act — calling with 'symbol' triggers early return guard
    state.toggleCol('symbol', false)
    await nextTick()

    // Assert — hiddenCols unchanged (symbol guard)
    expect([...state.hiddenCols]).toEqual(hiddenBefore)
    wrapper.unmount()
  })
})
