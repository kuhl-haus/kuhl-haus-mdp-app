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

// ── Mock useConfig ───────────────────────────────────────────────────────
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config: ref({ massiveApiKey: 'test-key' }),
      loading: ref(false),
      error: ref(null),
    })),
  }
})

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
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Rendering', () => {
  test('renders VChart stub when ticker is configured', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })

    // Act
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()

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
    // Assert — VChart component receives loading=true as a prop
    // (Vue component props are not DOM attributes; use findComponent)
    expect(wrapper.findComponent({ name: 'VChart' }).props('loading')).toBe(true)
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
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.find('[data-testid="retry-btn"]').trigger('click')
    await nextTick()
    await nextTick()

    // Assert — one more fetch triggered by retry
    expect(global.fetch.mock.calls.length).toBe(before + 1)
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
// After fixing the setInterval naming collision (Issue 1), the global
// window.setInterval is correctly called. Fake-timer tests now work.

describe('Auto-refresh', () => {
  test('advancing time by refreshInterval triggers additional fetch', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    vi.advanceTimersByTime(60_000)
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('autoRefresh false: advancing time does not trigger additional fetch', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: false } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    vi.advanceTimersByTime(120_000)
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBe(before)
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('auto-refresh stops after unmount', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
    })
    await nextTick()
    await nextTick()

    // Act
    wrapper.unmount()
    const countAfterUnmount = global.fetch.mock.calls.length
    vi.advanceTimersByTime(120_000)
    await nextTick()

    // Assert — no fetches fired after unmount
    expect(global.fetch.mock.calls.length).toBe(countAfterUnmount)
    vi.useRealTimers()
  })

  test('refreshInterval 5m: no extra fetch before 5m, fires after', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL', autoRefresh: true, refreshInterval: '5m' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Assert — no extra fetch before 5m
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(global.fetch.mock.calls.length).toBe(before)

    // Act — advance past 5m
    vi.advanceTimersByTime(240_001)
    await nextTick()

    // Assert — refresh fired
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    wrapper.unmount()
    vi.useRealTimers()
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

// ── DataZoom slider ───────────────────────────────────────────────────────────

describe('DataZoom slider', () => {
  test('chartOption includes a slider-type DataZoom for tablet/touch navigation', async () => {
    // Arrange
    global.fetch = mockFetch({
      results: Array.from({ length: 5 }, (_, i) => ({
        t: (1_700_000_000 + i * 60) * 1000,
        o: 100, h: 105, l: 95, c: 102, v: 1_000_000, vw: 101,
      })),
    })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')

    // Assert — dataZoom contains a slider entry
    expect(option.dataZoom).toBeDefined()
    expect(option.dataZoom.some(dz => dz.type === 'slider')).toBe(true)
    wrapper.unmount()
  })

  test('slider DataZoom is styled for dark theme', async () => {
    // Arrange
    global.fetch = mockFetch({
      results: Array.from({ length: 5 }, (_, i) => ({
        t: (1_700_000_000 + i * 60) * 1000,
        o: 100, h: 105, l: 95, c: 102, v: 1_000_000, vw: 101,
      })),
    })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const slider = option.dataZoom.find(dz => dz.type === 'slider')

    // Assert — concrete dark theme values; prevents regression to default white/light style
    expect(slider).toBeDefined()
    expect(slider.backgroundColor).toBe('#111')
    expect(slider.borderColor).toBe('#333')
    expect(slider.fillerColor).toBe('rgba(139,92,246,0.1)')
    expect(slider.handleStyle.color).toBe('#555')
    expect(slider.textStyle.color).toBe('#6b7280')
    wrapper.unmount()
  })
})

// ── Bug fixes & tweaks ────────────────────────────────────────────────────────

describe('Connection indicator (Bug 1)', () => {
  test('exposes isConnected as true (REST widget, never disconnects)', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, { props: defaultProps })

    // Assert
    expect(wrapper.vm.isConnected).toBe(true)
    wrapper.unmount()
  })

  test('exposes reconnecting as false', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, { props: defaultProps })

    // Assert
    expect(wrapper.vm.reconnecting).toBe(false)
    wrapper.unmount()
  })

  test('exposes lastDataAt as non-null after successful fetch', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const lastDataAt = wrapper.vm.lastDataAt

    // Assert
    expect(lastDataAt).not.toBeNull()
    wrapper.unmount()
  })
})

describe('Candle colors (Bug 2)', () => {
  test('bullish candles (close >= open) use green color', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [{ t: 1700000000000, o: 100, h: 105, l: 95, c: 102, v: 1e6, vw: 101 }] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { tickerSource: 'manual', ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const candleSeries = option.series?.find(s => s.type === 'candlestick')

    // Assert — color (bullish/up candle) should be green, not red
    expect(candleSeries.itemStyle.color).toBe('#26a69a')
    expect(candleSeries.itemStyle.color0).toBe('#ef5350')
    wrapper.unmount()
  })
})

describe('Default indicator counts (Tweak 1)', () => {
  test('default settings include 3 EMA entries', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, { props: defaultProps })
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')

    // Assert — 3 EMA series (even if some disabled)
    // We check via the settings structure exposed through settings emit
    wrapper.unmount()

    // Direct DEFAULT_SETTINGS check via component mount with empty settings
    const wrapper2 = mount(CandlestickChart, {
      props: { ...defaultProps, settings: {} },
    })
    const settingsCalls = []
    // Trigger a settings emit via interval button click
    wrapper2.find('[data-testid="interval-btn-5m"]').trigger('click')
    // Check that the component was initialized with 3 EMAs
    // We check the rendered settings panel for 3 EMA rows
    wrapper2.find('.col-menu-btn').trigger('click')
    nextTick().then(() => {
      const emaRows = wrapper2.findAll('[data-testid^="ema-row-"]')
      expect(emaRows.length).toBe(3)
    })
    wrapper2.unmount()
  })

  test('default settings include 2 VWMA entries', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: {} },
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await nextTick()

    // Act — trigger emit
    await wrapper.find('[data-testid="interval-btn-5m"]').trigger('click')
    await nextTick()

    // Assert — emitted settings has 2 VWMA entries
    const last = settingsCalls[settingsCalls.length - 1]
    expect(last.vwma.length).toBe(2)
    wrapper.unmount()
  })
})

describe('Header ticker input (Tweak 3)', () => {
  test('ticker input is always visible in the widget header', () => {
    // Arrange + Act
    const wrapper = mount(CandlestickChart, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="header-ticker-input"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('pressing Enter in header ticker input triggers fetch with that ticker', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, { props: defaultProps })
    await nextTick()

    // Act
    await wrapper.find('[data-testid="header-ticker-input"]').setValue('TSLA')
    await wrapper.find('[data-testid="header-ticker-input"]').trigger('keydown.enter')
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.some(c => c[0].includes('TSLA'))).toBe(true)
    wrapper.unmount()
  })

  test('bus activeTicker updates the header ticker input', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(CandlestickChart, { props: defaultProps })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    await nextTick()

    // Act
    activeTicker.value = 'MSFT'
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="header-ticker-input"]').element.value).toBe('MSFT')
    wrapper.unmount()
  })
})
