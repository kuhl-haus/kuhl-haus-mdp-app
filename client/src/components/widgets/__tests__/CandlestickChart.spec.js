import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// ── Mock vue-echarts and echarts tree-shake imports ───────────────────────────
// VChart uses canvas internally — not available in jsdom. Mock entirely.
vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div data-testid="vchart" />',
    props: ['option', 'loading', 'autoresize'],
  },
}))
vi.mock('echarts/core', () => ({ use: vi.fn() }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))
vi.mock('echarts/charts', () => ({
  CandlestickChart: {},
  LineChart: {},
  BarChart: {},
}))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  DataZoomComponent: {},
  LegendComponent: {},
  AxisPointerComponent: {},
  TitleComponent: {},
}))

// ── Mock useScannerLink ───────────────────────────────────────────────────────
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return {
    useScannerLink: vi.fn(() => ({
      activeTicker: ref(null),
      onRowClick:   vi.fn(),
    })),
  }
})

// ── Mock chartIndicators ──────────────────────────────────────────────────────
vi.mock('@/utils/chartIndicators.js', () => ({
  calcEMA:       vi.fn(() => []),
  calcSMA:       vi.fn(() => []),
  calcVWMA:      vi.fn(() => []),
  calcVWAP:      vi.fn(() => []),
  calcMACD:      vi.fn(() => ({ macdLine: [], signalLine: [], histogram: [] })),
  calcVolumeAvg: vi.fn(() => []),
}))

import { useScannerLink } from '@/composables/useScannerLink.js'
import CandlestickChart from '../CandlestickChart.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  isLocked:  true,
  linkColor: 'blue',
  isMobile:  false,
  settings:  {},
}

function mockFetch(data = { results: [], status: 'OK' }, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(data),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.__APP_CONFIG__ = { massiveApiKey: 'test-key' }
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Rendering', () => {
  test('renders VChart stub', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="vchart"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('shows placeholder when no ticker is configured', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: null } },
    })

    // Assert
    expect(wrapper.find('[data-testid="no-ticker"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ── Data fetching ─────────────────────────────────────────────────────────────

describe('Data fetching', () => {
  test('fetch called on mount with correct URL shape', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [], status: 'OK' })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', interval: '1d' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const url = global.fetch.mock.calls[0]?.[0] ?? ''

    // Assert — URL contains ticker, multiplier/timespan, apiKey, sort=asc
    expect(url).toContain('AAPL')
    expect(url).toContain('day')
    expect(url).toContain('test-key')
    expect(url).toContain('sort=asc')
    wrapper.unmount()
  })

  test('fetch not called when no ticker', async () => {
    // Arrange
    global.fetch = mockFetch()

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: null } },
    })
    await nextTick()

    // Assert
    expect(global.fetch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('loading state shown during fetch', async () => {
    // Arrange — never-resolving fetch
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()

    // Assert
    const vchart = wrapper.find('[data-testid="vchart"]')
    expect(vchart.attributes('loading')).toBe('true')
    wrapper.unmount()
  })

  test('error state shown on HTTP error', async () => {
    // Arrange
    global.fetch = mockFetch({}, false)

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('retry button triggers fetch again', async () => {
    // Arrange
    global.fetch = mockFetch({}, false)
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    await wrapper.find('[data-testid="retry-btn"]').trigger('click')
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  test('ticker change triggers new fetch', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.setProps({ settings: { tickerSource: 'manual', ticker: 'TSLA' } })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    wrapper.unmount()
  })

  test('interval change triggers new fetch', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', interval: '1d' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.setProps({ settings: { tickerSource: 'manual', ticker: 'AAPL', interval: '1h' } })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    wrapper.unmount()
  })
})

// ── Auto-refresh ──────────────────────────────────────────────────────────────

describe('Auto-refresh', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  test('setInterval called with correct ms when autoRefresh is true', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
    })
    await nextTick()

    // Assert
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)
    wrapper.unmount()
  })

  test('setInterval NOT called when autoRefresh is false', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: false } },
    })
    await nextTick()

    // Assert
    expect(setIntervalSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('clearInterval called on unmount', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true } },
    })
    await nextTick()

    // Act
    wrapper.unmount()

    // Assert
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  test('refreshInterval 5m uses 300000ms', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true, refreshInterval: '5m' } },
    })
    await nextTick()

    // Assert
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300_000)
    wrapper.unmount()
  })
})

// ── Ticker source ─────────────────────────────────────────────────────────────

describe('Ticker source', () => {
  test('bus mode: tickerLocal updates when activeTicker changes', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'bus' } },
    })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const fetchBefore = global.fetch.mock.calls.length

    // Act
    activeTicker.value = 'TSLA'
    await nextTick()
    await nextTick()

    // Assert — fetch triggered with new ticker
    expect(global.fetch.mock.calls.length).toBeGreaterThan(fetchBefore)
    expect(global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0]).toContain('TSLA')
    wrapper.unmount()
  })

  test('manual mode: uses settings.ticker, ignores bus', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const fetchBefore = global.fetch.mock.calls.length

    // Act
    activeTicker.value = 'TSLA'
    await nextTick()
    await nextTick()

    // Assert — bus change does NOT trigger additional fetch in manual mode
    expect(global.fetch.mock.calls.length).toBe(fetchBefore)
    wrapper.unmount()
  })
})

// ── Settings ──────────────────────────────────────────────────────────────────

describe('Settings persistence', () => {
  test('emitted settings include all required keys', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const settingsCalls = []
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await nextTick()

    // Act — open settings and change interval to trigger emit
    await wrapper.find('[data-testid="interval-btn-5m"]').trigger('click')
    await nextTick()

    // Assert
    expect(settingsCalls.length).toBeGreaterThan(0)
    const last = settingsCalls[settingsCalls.length - 1]
    expect(last).toHaveProperty('ticker')
    expect(last).toHaveProperty('tickerSource')
    expect(last).toHaveProperty('interval')
    expect(last).toHaveProperty('autoRefresh')
    expect(last).toHaveProperty('refreshInterval')
    wrapper.unmount()
  })
})
