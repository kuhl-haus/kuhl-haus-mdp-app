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
// Regular function (not arrow) so it works as a constructor with `new`
vi.stubGlobal('ResizeObserver', function ResizeObserverMock() { return resizeObserverMock })

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
  vi.stubGlobal('ResizeObserver', function ResizeObserverMock() { return resizeObserverMock })
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

// ── Average volume ────────────────────────────────────────────────────────────
// addSeries call order in onMounted: [0]=candle, [1]=volume, [2]=avgVolume, [3]=macdLine, [4]=signal, [5]=histogram

describe('Average volume', () => {
  test('avgVolume setData called after successful fetch', async () => {
    // Arrange
    global.fetch = mockFetch([makeBar()])
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', volume: { enabled: true }, avgVolume: { enabled: true, period: 20 } } },
    })
    await nextTick()
    await nextTick()

    // Act — avgVolume is the 3rd series created in onMounted (index 2)
    const avgVolSeriesMock = vi.mocked(createChart).mock.results[0]?.value?.addSeries.mock.results[2]?.value

    // Assert
    expect(avgVolSeriesMock.setData).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('avgVolume series created with visible: false when volume pane is disabled', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, {
      props: { ...defaultProps, settings: { volume: { enabled: false }, avgVolume: { enabled: true, period: 20 } } },
    })

    // Assert — addSeries call [2] options should have visible: false (vol disabled AND avgVol enabled = false)
    const avgVolAddOptions = vi.mocked(createChart).mock.results[0]?.value?.addSeries.mock.calls[2]?.[1]
    expect(avgVolAddOptions?.visible).toBe(false)
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
    expect(global.fetch.mock.calls.length).toBe(before + 1)
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
    expect(last).toHaveProperty('avgVolume')
    wrapper.unmount()
  })
})

// ── ET timezone in chart localization ───────────────────────────────────────────────────
// Bug: createChart is called without a localization.timeFormatter, so
// lightweight-charts displays timestamps in UTC instead of ET (America/New_York).
//
// Winter fixture: 1705329000 = 2024-01-15T14:30:00Z = 09:30 EST (UTC-5)
// Summer fixture: 1721050200 = 2024-07-15T13:30:00Z = 09:30 EDT (UTC-4)
// A naive UTC-5 offset passes winter but returns 08:30 for the summer fixture.

describe('ET timezone in chart localization', () => {
  const WINTER_UTC_UNIX = 1705329000   // 2024-01-15T14:30:00Z = 09:30 EST
  const WINTER_UTC_HOUR = '14'
  const SUMMER_UTC_UNIX = 1721050200   // 2024-07-15T13:30:00Z = 09:30 EDT
  const SUMMER_UTC_HOUR = '13'

  test('createChart options include localization.timeFormatter', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })

    const callOpts = vi.mocked(createChart).mock.calls[0]?.[1]

    // Assert — localization block with timeFormatter must be present
    expect(callOpts).toHaveProperty('localization')
    expect(typeof callOpts.localization.timeFormatter).toBe('function')
    wrapper.unmount()
  })

  test('winter (EST): timeFormatter returns 09:30, not UTC 14:30', () => {
    // Arrange + Act
    const wrapper = mount(TVLiteChart, { props: defaultProps })
    const formatter = vi.mocked(createChart).mock.calls[0]?.[1]?.localization?.timeFormatter

    expect(typeof formatter).toBe('function')
    const result = formatter(WINTER_UTC_UNIX)

    // Assert — 09:30 ET; not UTC 14:xx
    expect(result).toMatch(/09:30/)
    expect(result).not.toContain(WINTER_UTC_HOUR)
    wrapper.unmount()
  })

  test('summer (EDT): timeFormatter returns 09:30, not UTC 13:30', () => {
    // Arrange + Act
    // A naive UTC-5 fix would produce 08:30 here — wrong for EDT (UTC-4)
    const wrapper = mount(TVLiteChart, { props: defaultProps })
    const formatter = vi.mocked(createChart).mock.calls[0]?.[1]?.localization?.timeFormatter

    expect(typeof formatter).toBe('function')
    const result = formatter(SUMMER_UTC_UNIX)

    // Assert — 09:30 ET; not UTC 13:xx
    expect(result).toMatch(/09:30/)
    expect(result).not.toContain(SUMMER_UTC_HOUR)
    wrapper.unmount()
  })
})
