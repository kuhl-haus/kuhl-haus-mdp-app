import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Mock lightweight-charts (v5 API) ─────────────────────────────────────────
// chart/series instances must NOT be wrapped in Vue ref() — plain JS vars only.
// v5 series API: chart.addSeries(CandlestickSeries, opts) rather than addCandlestickSeries.
vi.mock('lightweight-charts', () => {
  const makeSeriesMock = () => ({ setData: vi.fn(), applyOptions: vi.fn() })
  const paneSeriesMock  = makeSeriesMock()
  const paneMock = { addSeries: vi.fn(() => paneSeriesMock) }

  const chartMock = {
    addSeries:    vi.fn(() => makeSeriesMock()),
    addPane:      vi.fn(() => paneMock),
    panes:        vi.fn(() => []),
    remove:       vi.fn(),
    applyOptions: vi.fn(),
    timeScale:    vi.fn(() => ({ fitContent: vi.fn(), setOptions: vi.fn() })),
    priceScale:   vi.fn(() => ({ applyOptions: vi.fn() })),
  }

  return {
    createChart:       vi.fn(() => chartMock),
    CandlestickSeries: { seriesType: 'Candlestick' },
    LineSeries:        { seriesType: 'Line' },
    HistogramSeries:   { seriesType: 'Histogram' },
    ColorType:         { Solid: 'solid' },
    CrosshairMode:     { Magnet: 1 },
    // Export chart mock for direct assertion in tests
    __chartMock:       chartMock,
    __paneMock:        paneMock,
  }
})

// ── Mock useConfig ────────────────────────────────────────────────────────────
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ massiveApiKey: 'test-key' }),
      loading: ref(false),
      error:   ref(null),
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

// ── ResizeObserver mock (not in jsdom) ────────────────────────────────────────
const resizeObserverMock = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() }
vi.stubGlobal('ResizeObserver', vi.fn(() => resizeObserverMock))

import { createChart } from 'lightweight-charts'
import { useScannerLink } from '@/composables/useScannerLink.js'
import TVLiteChart from '../TVLiteChart.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  isLocked:  true,
  linkColor: 'blue',
  isMobile:  false,
  settings:  {},
}

function mockFetch(results = [], ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue({ results, status: 'OK' }),
  })
}

function makeBar(i = 0) {
  return { t: (1_700_000_000 + i * 60) * 1000, o: 100, h: 105, l: 95, c: 102, v: 1e6, vw: 101 }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('ResizeObserver', vi.fn(() => resizeObserverMock))
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Rendering', () => {
  test('chart container div renders', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="chart-container"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('createChart called on mount', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Assert
    expect(createChart).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('no ticker → placeholder shown', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="no-ticker"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('header ticker input always visible', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="header-ticker-input"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ── Data fetching ─────────────────────────────────────────────────────────────

describe('Data fetching', () => {
  test('fetch called on mount with ticker', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const url = global.fetch.mock.calls[0]?.[0] ?? ''

    // Assert
    expect(url).toContain('AAPL')
    expect(url).toContain('test-key')
    expect(url).toContain('sort=asc')
    wrapper.unmount()
  })

  test('fetch NOT called when no ticker', async () => {
    // Arrange
    global.fetch = mockFetch()

    // Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })
    await nextTick()

    // Assert
    expect(global.fetch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('loading state shown during fetch', async () => {
    // Arrange
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    // Act
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('error state shown on HTTP error + retry button present', async () => {
    // Arrange
    global.fetch = mockFetch([], false)
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act
    const errorState = wrapper.find('[data-testid="error-state"]')
    const retryBtn   = wrapper.find('[data-testid="retry-btn"]')

    // Assert
    expect(errorState.exists()).toBe(true)
    expect(retryBtn.exists()).toBe(true)
    wrapper.unmount()
  })

  test('retry button triggers another fetch', async () => {
    // Arrange
    global.fetch = mockFetch([], false)
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.find('[data-testid="retry-btn"]').trigger('click')
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBe(before + 1)
    wrapper.unmount()
  })

  test('ticker change triggers new fetch', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.setProps({ settings: { ticker: 'TSLA' } })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBe(before + 1)
    expect(global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0]).toContain('TSLA')
    wrapper.unmount()
  })

  test('interval change triggers new fetch', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', interval: '1d' } },
    })
    await nextTick()
    await nextTick()
    const before = global.fetch.mock.calls.length

    // Act
    await wrapper.setProps({ settings: { ticker: 'AAPL', interval: '1h' } })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBe(before + 1)
    wrapper.unmount()
  })

  test('bars mapped to seconds: setData called with time = t/1000', async () => {
    // Arrange
    const bar = makeBar()
    global.fetch = mockFetch([bar])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
    })
    await nextTick()
    await nextTick()

    // Act — get the series mock from the first addSeries call on the chart
    const candleSeriesMock = vi.mocked(createChart).mock.results[0]?.value?.addSeries.mock.results[0]?.value

    // Assert — setData was called and time was converted from ms to seconds
    expect(candleSeriesMock.setData).toHaveBeenCalled()
    const calledData = candleSeriesMock.setData.mock.calls[0][0]
    expect(calledData[0].time).toBe(bar.t / 1000)
    wrapper.unmount()
  })
})

// ── Ticker source (bus + header input) ────────────────────────────────────────

describe('Ticker source', () => {
  test('bus activeTicker updates header input and triggers exactly one fetch', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(TVLiteChart, { props: defaultProps })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const fetchBefore = global.fetch.mock.calls.length

    // Act
    activeTicker.value = 'MSFT'
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="header-ticker-input"]').element.value).toBe('MSFT')
    expect(global.fetch.mock.calls.length).toBe(fetchBefore + 1)
    wrapper.unmount()
  })

  test('pressing Enter in header input triggers fetch with that ticker', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, { props: defaultProps })
    await nextTick()

    // Act
    await wrapper.find('[data-testid="header-ticker-input"]').setValue('NVDA')
    await wrapper.find('[data-testid="header-ticker-input"]').trigger('keydown.enter')
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.some(c => c[0].includes('NVDA'))).toBe(true)
    wrapper.unmount()
  })
})

// ── Auto-refresh ──────────────────────────────────────────────────────────────

describe('Auto-refresh', () => {
  test('advancing time by refreshInterval triggers additional fetch', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
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

  test('autoRefresh false: no extra fetch after time advances', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', autoRefresh: false } },
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
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
    })
    await nextTick()
    await nextTick()

    // Act
    wrapper.unmount()
    const countAfterUnmount = global.fetch.mock.calls.length
    vi.advanceTimersByTime(120_000)
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBe(countAfterUnmount)
    vi.useRealTimers()
  })
})

// ── Lifecycle cleanup ─────────────────────────────────────────────────────────

describe('Lifecycle cleanup', () => {
  test('chart.remove() called on unmount', () => {
    // Arrange
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Act
    wrapper.unmount()

    // Assert — the chart returned from createChart should have had remove() called
    expect(vi.mocked(createChart).mock.results[0]?.value?.remove).toHaveBeenCalled()
  })

  test('ResizeObserver.disconnect() called on unmount', () => {
    // Arrange
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    // Act
    wrapper.unmount()

    // Assert
    expect(resizeObserverMock.disconnect).toHaveBeenCalled()
  })
})

// ── Settings persistence ──────────────────────────────────────────────────────

describe('Settings persistence', () => {
  test('emitted settings include required keys', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const settingsCalls = []
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
      attrs: { 'onUpdate-settings': s => settingsCalls.push(s) },
    })
    await nextTick()

    // Act — trigger emit via interval button
    await wrapper.find('[data-testid="interval-btn-5m"]').trigger('click')
    await nextTick()

    // Assert
    expect(settingsCalls.length).toBeGreaterThan(0)
    const last = settingsCalls[settingsCalls.length - 1]
    expect(last).toHaveProperty('ticker')
    expect(last).toHaveProperty('interval')
    expect(last).toHaveProperty('autoRefresh')
    expect(last).toHaveProperty('refreshInterval')
    expect(last).toHaveProperty('ema')
    wrapper.unmount()
  })
})
