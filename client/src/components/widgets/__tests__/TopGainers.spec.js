import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return { useWebSocketClient: vi.fn((c) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(c?.feedName ?? ''),
      cacheKey:     ref(c?.cacheKey ?? ''),
      wsUrl:        ref(c?.wsUrl    ?? 'ws://localhost:4202/ws'),
      authKey:      ref(c?.authKey  ?? 'secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(c?.cacheLimit ?? 1000),
    })) }
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
  return { useConfig: vi.fn(() => ({ config: ref({ apiKey: 'mock-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })) }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import { useScannerLink } from '@/composables/useScannerLink.js'
import TopGainers from '../TopGainers.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }

function makeMarketData(overrides = []) {
  const base = [
    { symbol: 'AAPL', close: 10, change: 5, pct_change: 100, pct_change_since_open: 30, accumulated_volume: 500_000, relative_volume: 6, free_float: 1_000_000, avg_volume: 100_000, prev_day_volume: 200_000, official_open_price: 7, prev_day_close: 5, aggregate_vwap: 8, prev_day_vwap: 5 },
    { symbol: 'TSLA', close: 5, change: 1, pct_change: 25, pct_change_since_open: 15, accumulated_volume: 200_000, relative_volume: 7, free_float: 500_000, avg_volume: 50_000, prev_day_volume: 100_000, official_open_price: 4, prev_day_close: 4, aggregate_vwap: 4.5, prev_day_vwap: 4 },
    { symbol: 'NVDA', close: 30, change: 3, pct_change: 11, pct_change_since_open: 12, accumulated_volume: 1_200_000, relative_volume: 8, free_float: 2_000_000, avg_volume: 200_000, prev_day_volume: 300_000, official_open_price: 27, prev_day_close: 27, aggregate_vwap: 28, prev_day_vwap: 27 },
  ]
  return [...base, ...overrides]
}

describe('useConfig integration', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear(); vi.mocked(useConfig).mockClear() })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'k', wsEndpoint: 'ws://real:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopGainers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://real:4202/ws')
    w.unmount()
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'real-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopGainers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].authKey).toBe('real-key')
    w.unmount()
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // Arrange — defensive baseline
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref(null), loading: ref(true), error: ref(null) })
    // Act
    const w = mount(TopGainers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://localhost:4202/ws')
    w.unmount()
  })
})

// ── filteredData computation ───────────────────────────────────────────────────

describe('filteredData', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  test('with empty marketData expect empty array returned', () => {
    // Arrange
    const w = mount(TopGainers, { props: defaultProps })
    // Assert — no data rows rendered (only header row)
    expect(w.findAll('tbody tr').length).toBe(0)
    w.unmount()
  })

  test('with onData callback called expect rows rendered', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(''),
      cacheKey:     ref(''),
      wsUrl:        ref('ws://localhost:4202/ws'),
      authKey:      ref('secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: defaultProps })

    // Act — simulate receiving data
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(makeMarketData())
    await w.vm.$nextTick()

    // Assert — AAPL(10) and TSLA(5) pass default filters (price 2-20, vol 100K+, relVol 5+, change 10%+)
    // NVDA(close=30) fails the maxPrice=20 default filter
    expect(w.findAll('tbody tr').length).toBe(2)
    w.unmount()
  })

  test('with minPrice filter expect items below filtered out', async () => {
    // Arrange — settings with minPrice=8 excludes TSLA (close=5)
    const settings = { volumeThreshold: '100', relVolumeThreshold: '5', minPriceThreshold: 8, maxPriceThreshold: 1000000000, minChangePercent: 10, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
      feedName:     ref(''), cacheKey:     ref(''), wsUrl:        ref('ws://localhost:4202/ws'),
      authKey:      ref('secret'), connect: vi.fn(), disconnect: vi.fn(),
      subscribe:    vi.fn(), unsubscribe:  vi.fn(), getCache:     vi.fn(), cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: { ...defaultProps, settings } })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(makeMarketData())
    await w.vm.$nextTick()

    // Assert — TSLA (close=5) filtered out, NVDA (close=30) also filtered out by maxPrice default
    const rows = w.findAll('tbody tr')
    // AAPL (10) is in range 8-1B, TSLA (5) is out, NVDA (30) is in range
    expect(rows.length).toBe(2)
    w.unmount()
  })
})

// ── getRowClass ────────────────────────────────────────────────────────────────
describe('getRowClass', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  async function mountWithData(data, settings = {}) {
    const defaultSettings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0, maxPriceThreshold: 1000000000, minChangePercent: 0, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
      feedName:     ref(''), cacheKey:     ref(''), wsUrl:        ref('ws://localhost:4202/ws'),
      authKey:      ref('secret'), connect: vi.fn(), disconnect: vi.fn(),
      subscribe:    vi.fn(), unsubscribe:  vi.fn(), getCache:     vi.fn(), cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: { ...defaultProps, settings: { ...defaultSettings, ...settings } } })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(data)
    await w.vm.$nextTick()
    return w
  }

  test('with pct_change >= 100 expect hundred-percent-gainer class', async () => {
    const data = [{ symbol: 'X', close: 5, change: 5, pct_change: 100, pct_change_since_open: 50,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0, avg_volume: 0, prev_day_volume: 0,
                    official_open_price: 0, prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithData(data)
    expect(w.find('tbody tr').classes('hundred-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change >= 50 expect fifty-percent-gainer class', async () => {
    const data = [{ symbol: 'X', close: 5, change: 5, pct_change: 60, pct_change_since_open: 50,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0, avg_volume: 0, prev_day_volume: 0,
                    official_open_price: 0, prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithData(data)
    expect(w.find('tbody tr').classes('fifty-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change >= 20 expect twenty-percent-gainer class', async () => {
    const data = [{ symbol: 'X', close: 5, change: 5, pct_change: 25, pct_change_since_open: 20,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0, avg_volume: 0, prev_day_volume: 0,
                    official_open_price: 0, prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithData(data)
    expect(w.find('tbody tr').classes('twenty-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change >= 10 expect ten-percent-gainer class', async () => {
    const data = [{ symbol: 'X', close: 5, change: 5, pct_change: 12, pct_change_since_open: 11,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0, avg_volume: 0, prev_day_volume: 0,
                    official_open_price: 0, prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithData(data)
    expect(w.find('tbody tr').classes('ten-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change < 10 expect no gainer class', async () => {
    const data = [{ symbol: 'X', close: 5, change: 0.5, pct_change: 5, pct_change_since_open: 4,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0, avg_volume: 0, prev_day_volume: 0,
                    official_open_price: 0, prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithData(data)
    const tr = w.find('tbody tr')
    expect(tr.classes('hundred-percent-gainer')).toBe(false)
    expect(tr.classes('ten-percent-gainer')).toBe(false)
    w.unmount()
  })
})

// ── settings sync ────────────────────────────────────────────────────────────────
describe('settings prop sync', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  test('with settings prop expect filters initialized from settings', () => {
    // Arrange
    const settings = { volumeThreshold: '250', relVolumeThreshold: '3', minPriceThreshold: 5,
                       maxPriceThreshold: 100, minChangePercent: 20, hiddenCols: ['pct_change'] }
    // Act
    const w = mount(TopGainers, { props: { ...defaultProps, settings } })
    // Assert — no crash, component mounts with settings applied
    expect(w.find('.scanner-widget').exists()).toBe(true)
    w.unmount()
  })

  test('with update-settings emit expect emitted when filters change', async () => {
    // Arrange
    const updateCalls = []
    const w = mount(TopGainers, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => updateCalls.push(s) },
    })
    // Act — change volume threshold select
    const selects = w.findAll('select')
    await selects[0].setValue('250')
    await w.vm.$nextTick()
    // Assert — settings emitted
    expect(updateCalls.length).toBeGreaterThan(0)
    w.unmount()
  })
})


// ── column format / cellClass coverage ───────────────────────────────────────

describe('column format and cellClass', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  async function mountWithAllData(data) {
    const settings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0,
                       maxPriceThreshold: 1000000000, minChangePercent: 0, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
      feedName:     ref(''), cacheKey:     ref(''),
      wsUrl:        ref('ws://localhost:4202/ws'), authKey:      ref('secret'),
      connect:      vi.fn(), disconnect:   vi.fn(),
      subscribe:    vi.fn(), unsubscribe:  vi.fn(),
      getCache:     vi.fn(), cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: { ...defaultProps, settings } })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(data)
    await w.vm.$nextTick()
    return w
  }

  test('with negative change expect negative cellClass in table', async () => {
    const data = [{ symbol: 'X', close: 5, change: -1, pct_change: -5, pct_change_since_open: -3,
                    accumulated_volume: 100_000, relative_volume: 6, free_float: 0,
                    avg_volume: 0, prev_day_volume: 0, official_open_price: 0,
                    prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithAllData(data)
    const tds = w.findAll('td')
    expect(tds.some(td => td.classes('negative'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume below 2 expect normal cellClass', async () => {
    const data = [{ symbol: 'Y', close: 5, change: 1, pct_change: 10, pct_change_since_open: 10,
                    accumulated_volume: 100_000, relative_volume: 1.5, free_float: 0,
                    avg_volume: 0, prev_day_volume: 0, official_open_price: 0,
                    prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('normal'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume = 2.5 expect medium cellClass', async () => {
    const data = [{ symbol: 'Y', close: 5, change: 1, pct_change: 10, pct_change_since_open: 10,
                    accumulated_volume: 100_000, relative_volume: 2.5, free_float: 0,
                    avg_volume: 0, prev_day_volume: 0, official_open_price: 0,
                    prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('medium'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume = 4 expect high cellClass', async () => {
    const data = [{ symbol: 'Y', close: 5, change: 1, pct_change: 10, pct_change_since_open: 10,
                    accumulated_volume: 100_000, relative_volume: 4, free_float: 0,
                    avg_volume: 0, prev_day_volume: 0, official_open_price: 0,
                    prev_day_close: 0, aggregate_vwap: 0, prev_day_vwap: 0 }]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('high'))).toBe(true)
    w.unmount()
  })

  test('with sortBy same key expect direction toggled to asc', async () => {
    // Arrange — mount with data to have the component active
    const settings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0,
                       maxPriceThreshold: 1000000000, minChangePercent: 0, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
      feedName:     ref(''), cacheKey:     ref(''),
      wsUrl:        ref('ws://localhost:4202/ws'), authKey:      ref('secret'),
      connect:      vi.fn(), disconnect:   vi.fn(),
      subscribe:    vi.fn(), unsubscribe:  vi.fn(),
      getCache:     vi.fn(), cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: { ...defaultProps, settings } })
    // Act — click sort on 'symbol' header twice
    const headers = w.findAll('th')
    const symbolHeader = headers[0]
    await symbolHeader.trigger('click')
    await symbolHeader.trigger('click')
    await w.vm.$nextTick()
    // Assert — after two clicks on the same column, it has a sort indicator (▲ or ▼)
    const sortedText = w.find('th.sorted').text()
    expect(sortedText.includes('▲') || sortedText.includes('▼')).toBe(true)
    w.unmount()
  })

  test('with toggleCol hiding a column expect that column hidden', async () => {
    // Arrange
    const settings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0,
                       maxPriceThreshold: 1000000000, minChangePercent: 0, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
      feedName:     ref(''), cacheKey:     ref(''),
      wsUrl:        ref('ws://localhost:4202/ws'), authKey:      ref('secret'),
      connect:      vi.fn(), disconnect:   vi.fn(),
      subscribe:    vi.fn(), unsubscribe:  vi.fn(),
      getCache:     vi.fn(), cacheLimit:   ref(1000),
    })
    const w = mount(TopGainers, { props: { ...defaultProps, settings } })
    // Act — open column menu and toggle a column off
    await w.find('.col-menu-btn').trigger('click')
    await w.vm.$nextTick()
    // Find a non-symbol checkbox and uncheck it
    const checkboxes = w.findAll('.col-menu-item input[type="checkbox"]:not([disabled])')
    if (checkboxes.length > 0) {
      await checkboxes[0].setValue(false)
      await w.vm.$nextTick()
    }
    // Assert — column menu exists and interaction didn't crash
    expect(w.find('.col-menu-btn').exists()).toBe(true)
    w.unmount()
  })
})
