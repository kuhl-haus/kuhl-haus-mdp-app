import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── Mock useWebSocketClient ───────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((c) => ({
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
    })),
  }
})

// ── Mock useWidgetBus ─────────────────────────────────────────────────────────
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    useWidgetBus:    vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })),
    getFlameVariant: vi.fn(() => null),
    getFlameTooltip: vi.fn(() => ''),
    newsTimestamps:  reactive({}),
  }
})

// ── Mock useConfig ────────────────────────────────────────────────────────────
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ apiKey: 'mock-api-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import Quote from '../Quote.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }

// Helper: build a default WS mock (override individual fields as needed)
const makeWsMock = (overrides = {}) => ({
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
  ...overrides,
})

// Helper: get the onData callback captured from useWebSocketClient
function getOnData() {
  return vi.mocked(useWebSocketClient).mock.calls[0][0].onData
}

// ── useConfig integration ─────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useConfig integration', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test-server:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://test-server:4202/ws')
    wrapper.unmount()
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'real-api-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].authKey).toBe('real-api-key')
    wrapper.unmount()
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // Arrange — defensive baseline
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://localhost:4202/ws')
    wrapper.unmount()
  })
})

// ── Empty / loading states ──────────────────────────────────────────────────────
describe('empty states', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('with no activeTicker expect empty prompt shown', () => {
    // Arrange / Act
    const wrapper = mount(Quote, { props: defaultProps })
    // Assert
    expect(wrapper.find('.quote-empty').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with activeTicker set but no data expect waiting state', async () => {
    // Arrange
    const subscribeMock = vi.fn()
    const getCacheMock = vi.fn()
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock({ subscribe: subscribeMock, getCache: getCacheMock }))
    const wrapper = mount(Quote, { props: defaultProps })

    // Act — simulate entering a ticker
    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Assert — waiting state shown (no data yet)
    expect(wrapper.find('.quote-empty').exists()).toBe(true)
    expect(wrapper.find('.quote-empty').text()).toContain('AAPL')
    wrapper.unmount()
  })
})

// ── applyInput ───────────────────────────────────────────────────────────────────
describe('applyInput', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('with empty input expect no change', async () => {
    // Arrange
    const wrapper = mount(Quote, { props: defaultProps })
    // Act — click go with empty input
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // Assert — still shows empty prompt (no activeTicker)
    expect(wrapper.find('.quote-empty').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with non-empty input expect manualTicker set uppercased', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })

    // Act
    await wrapper.find('.quote-input').setValue('tsla')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Assert — waiting state shows TSLA (uppercase)
    expect(wrapper.find('.quote-empty').text()).toContain('TSLA')
    wrapper.unmount()
  })

  test('with linkColor and input expect setActiveTicker called', async () => {
    // Arrange
    const { useWidgetBus: mockWidgetBus } = await import('@/composables/useWidgetBus.js')
    const setActiveTickerMock = vi.fn()
    vi.mocked(mockWidgetBus).mockReturnValue({
      activeTickers: {},
      setActiveTicker: setActiveTickerMock,
    })
    const wrapper = mount(Quote, { props: { ...defaultProps, linkColor: 'red' } })

    // Act
    await wrapper.find('.quote-input').setValue('SPY')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Assert
    expect(setActiveTickerMock).toHaveBeenCalledWith('red', 'SPY')
    wrapper.unmount()
  })

  test('with enter keypress expect same behavior as click', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })

    // Act — type and press Enter
    await wrapper.find('.quote-input').setValue('MSFT')
    await wrapper.find('.quote-input').trigger('keyup.enter')
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.quote-empty').text()).toContain('MSFT')
    wrapper.unmount()
  })
})

// ── Quote data rendering ─────────────────────────────────────────────────────
describe('quote data rendering', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  const sampleQuoteData = {
    symbol: 'AAPL',
    close: 175.50,
    change: 2.50,
    pct_change: 1.45,
    pct_change_since_open: 0.80,
    change_since_open: 1.40,
    official_open_price: 174.10,
    aggregate_vwap: 174.80,
    accumulated_volume: 55_000_000,
    relative_volume: 1.8,
    avg_volume: 65_000_000,
    free_float: 15_500_000_000,
    prev_day_open: 172.50,
    prev_day_high: 176.00,
    prev_day_low: 171.80,
    prev_day_close: 173.00,
    prev_day_volume: 68_000_000,
    prev_day_vwap: 173.50,
    end_timestamp: 1746000000000,
  }

  test('with positive change expect positive class applied', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    // Set activeTicker first via input
    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — feed data in
    onData({ ...sampleQuoteData, pct_change: 1.45 })
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.quote-change.positive').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with negative change expect negative class applied', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act
    onData({ ...sampleQuoteData, pct_change: -2.50, change: -4.375 })
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.quote-change.negative').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with extreme relative volume expect extreme class applied', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, relative_volume: 6.0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quote-v.extreme').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with high relative volume expect high class applied', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, relative_volume: 3.5 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quote-v.high').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with medium relative volume expect medium class applied', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, relative_volume: 2.5 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quote-v.medium').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with fmtVol receiving B-scale volume expect B suffix', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, free_float: 15_000_000_000 })
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.quote-body').text()
    expect(text).toContain('B')
    wrapper.unmount()
  })

  test('with fmtVol receiving K-scale volume expect K suffix', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, accumulated_volume: 5_000, avg_volume: 8_000, free_float: 500, prev_day_volume: 6_000 })
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.quote-body').text()
    expect(text).toContain('K')
    wrapper.unmount()
  })

  test('with non-finite fmtVol value expect em-dash', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, accumulated_volume: null, avg_volume: null, free_float: null, prev_day_volume: null })
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.quote-body').text()
    expect(text).toContain('—')
    wrapper.unmount()
  })

  test('with data matching different symbol expect data ignored', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — send data for wrong symbol
    onData({ ...sampleQuoteData, symbol: 'TSLA' })
    await wrapper.vm.$nextTick()

    // Assert — still in waiting state (quoteData not set)
    expect(wrapper.find('.quote-body').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with null data expect ignored', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act
    onData(null)
    await wrapper.vm.$nextTick()

    // Assert — still in waiting state
    expect(wrapper.find('.quote-body').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with end_timestamp expect freshness displayed', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData })
    await wrapper.vm.$nextTick()

    // Assert — freshness section shown with a non-dash value
    expect(wrapper.find('.quote-freshness').text()).not.toContain('—')
    wrapper.unmount()
  })

  test('with no end_timestamp expect em-dash in freshness', async () => {
    // Arrange
    vi.mocked(useWebSocketClient).mockReturnValueOnce(makeWsMock())
    const wrapper = mount(Quote, { props: defaultProps })
    const onData = getOnData()

    await wrapper.find('.quote-input').setValue('AAPL')
    await wrapper.find('.quote-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    onData({ ...sampleQuoteData, end_timestamp: null })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quote-freshness').text()).toContain('—')
    wrapper.unmount()
  })
})
