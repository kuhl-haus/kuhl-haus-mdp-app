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
import TopVolume from '../TopVolume.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }

const makeWsMock = () => ({
  lastDataAt:   ref(null), isConnected:  ref(true), reconnecting: ref(false),
  feedName:     ref(''), cacheKey:     ref(''),
  wsUrl:        ref('ws://localhost:4202/ws'), authKey:      ref('secret'),
  connect:      vi.fn(), disconnect:   vi.fn(),
  subscribe:    vi.fn(), unsubscribe:  vi.fn(),
  getCache:     vi.fn(), cacheLimit:   ref(1000),
})

function makeRow(overrides = {}) {
  return { symbol: 'X', close: 10, change: 1, pct_change: 5, pct_change_since_open: 3,
    accumulated_volume: 5_000_000, relative_volume: 3, free_float: 1_000_000,
    avg_volume: 200_000, prev_day_volume: 300_000, official_open_price: 9,
    prev_day_close: 9, aggregate_vwap: 9.5, prev_day_vwap: 9, ...overrides }
}

describe('useConfig integration', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear(); vi.mocked(useConfig).mockClear() })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'k', wsEndpoint: 'ws://real:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopVolume, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://real:4202/ws')
    w.unmount()
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'real-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopVolume, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].authKey).toBe('real-key')
    w.unmount()
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // Arrange — defensive baseline
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref(null), loading: ref(true), error: ref(null) })
    // Act
    const w = mount(TopVolume, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://localhost:4202/ws')
    w.unmount()
  })
})

describe('filteredData and getRowClass', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  async function mountWithData(data, settings = {}) {
    const def = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0,
                  maxPriceThreshold: 1000000000, showGappersOnly: false, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const w = mount(TopVolume, { props: { ...defaultProps, settings: { ...def, ...settings } } })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(data)
    await w.vm.$nextTick()
    return w
  }

  test('with empty data expect no rows', async () => {
    const w = await mountWithData([])
    expect(w.findAll('tbody tr').length).toBe(0)
    w.unmount()
  })

  test('with data passing filters expect rows rendered', async () => {
    const w = await mountWithData([makeRow()])
    expect(w.findAll('tbody tr').length).toBe(1)
    w.unmount()
  })

  test('with pct_change >= 100 expect hundred-percent-gainer class', async () => {
    const w = await mountWithData([makeRow({ pct_change: 100 })])
    expect(w.find('tbody tr').classes('hundred-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change in 50-99 expect fifty-percent-gainer class', async () => {
    const w = await mountWithData([makeRow({ pct_change: 75 })])
    expect(w.find('tbody tr').classes('fifty-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change in 20-49 expect twenty-percent-gainer class', async () => {
    const w = await mountWithData([makeRow({ pct_change: 30 })])
    expect(w.find('tbody tr').classes('twenty-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change in 10-19 expect ten-percent-gainer class', async () => {
    const w = await mountWithData([makeRow({ pct_change: 15 })])
    expect(w.find('tbody tr').classes('ten-percent-gainer')).toBe(true)
    w.unmount()
  })

  test('with pct_change < 10 expect no gainer class', async () => {
    const w = await mountWithData([makeRow({ pct_change: 5 })])
    const tr = w.find('tbody tr')
    expect(tr.classes('hundred-percent-gainer')).toBe(false)
    expect(tr.classes('ten-percent-gainer')).toBe(false)
    w.unmount()
  })

  test('with showGappersOnly true expect negative pct_change filtered out', async () => {
    const data = [
      makeRow({ symbol: 'A', pct_change: 5 }),
      makeRow({ symbol: 'B', pct_change: -2 }),
    ]
    const w = await mountWithData(data, { showGappersOnly: true })
    expect(w.findAll('tbody tr').length).toBe(1)
    w.unmount()
  })

  test('with update-settings emit expect emitted when filters change', async () => {
    const calls = []
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const w = mount(TopVolume, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await w.findAll('select')[0].setValue('250')
    await w.vm.$nextTick()
    expect(calls.length).toBeGreaterThan(0)
    w.unmount()
  })
})


// ── column format / cellClass coverage ───────────────────────────────────────

describe('column format and cellClass', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear() })

  async function mountWithAllData(data) {
    const settings = { volumeThreshold: '0', relVolumeThreshold: '0', minPriceThreshold: 0,
                       maxPriceThreshold: 1000000000, showGappersOnly: false, hiddenCols: [] }
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const w = mount(TopVolume, { props: { ...defaultProps, settings } })
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData(data)
    await w.vm.$nextTick()
    return w
  }

  test('with negative pct_change expect negative cellClass in table', async () => {
    const data = [makeRow({ pct_change: -5, change: -0.5, pct_change_since_open: -3 })]
    const w = await mountWithAllData(data)
    const tds = w.findAll('td')
    expect(tds.some(td => td.classes('negative'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume below 2 expect normal relVol class', async () => {
    const data = [makeRow({ relative_volume: 1.5, pct_change: 2, pct_change_since_open: 1 })]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('normal'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume = 2.5 expect medium relVol class', async () => {
    const data = [makeRow({ relative_volume: 2.5, pct_change: 2, pct_change_since_open: 1 })]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('medium'))).toBe(true)
    w.unmount()
  })

  test('with relative_volume = 4 expect high relVol class', async () => {
    const data = [makeRow({ relative_volume: 4, pct_change: 2, pct_change_since_open: 1 })]
    const w = await mountWithAllData(data)
    const relVolTds = w.findAll('td.relative_volume')
    expect(relVolTds.some(td => td.classes('high'))).toBe(true)
    w.unmount()
  })
})
