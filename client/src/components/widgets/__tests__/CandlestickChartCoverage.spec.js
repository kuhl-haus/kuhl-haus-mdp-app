/**
 * CandlestickChart.vue — coverage for uncovered branches.
 *
 * Existing spec covers fetch happy-path, interval buttons, ticker input,
 * bus ticker update, ET timezone label, candle colors, default indicator counts.
 *
 * This file adds:
 *  - settings panel open/close (⚙️ button)
 *  - settings panel: bar-count input, auto-refresh toggle,
 *    refresh-interval select, EMA/SMA/VWMA checkboxes, VWAP checkbox,
 *    volume checkbox, avg-volume row when volume enabled, MACD checkbox + params
 *  - fetchBars: HTTP error path (resp.ok=false), no ticker → no fetch
 *  - chartOption: volume pane (showVolume=true), MACD pane (showMACD=true),
 *    avgVolume series, EMA/SMA/VWMA/VWAP overlay series
 *  - auto-refresh: scheduleRefresh, clearRefresh, onAutoRefreshChange,
 *    onRefreshIntervalChange, onUnmounted cleanup
 *  - settings prop watch: props.settings change updates local state
 *  - isIntraday computed (interval = '1m')
 *  - emitSettings via Go button click
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Same mocks as existing spec ───────────────────────────────────────────────
vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div data-testid="vchart" />',
    props: ['option', 'loading', 'autoresize'],
  },
}))
vi.mock('echarts/core', () => ({ use: vi.fn() }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))
vi.mock('echarts/charts', () => ({ CandlestickChart: {}, LineChart: {}, BarChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {}, TooltipComponent: {}, DataZoomComponent: {},
  LegendComponent: {}, AxisPointerComponent: {}, TitleComponent: {},
}))
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
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return {
    useScannerLink: vi.fn(() => ({ activeTicker: ref(null), onRowClick: vi.fn() })),
  }
})
vi.mock('@/utils/chartIndicators.js', () => ({
  calcEMA:       vi.fn(() => [1, 2, 3]),
  calcSMA:       vi.fn(() => [4, 5, 6]),
  calcVWMA:      vi.fn(() => [7, 8, 9]),
  calcVWAP:      vi.fn(() => [10, 11, 12]),
  calcMACD:      vi.fn(() => ({ macdLine: [1], signalLine: [2], histogram: [3] })),
  calcVolumeAvg: vi.fn(() => [100, 200, 300]),
}))

import { calcEMA, calcSMA, calcVWMA, calcVWAP, calcMACD, calcVolumeAvg } from '@/utils/chartIndicators.js'
import CandlestickChart from '../CandlestickChart.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  isLocked:  true,
  linkColor: 'blue',
  isMobile:  false,
  settings:  {},
}

function mockFetch(data = { results: [] }, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(data),
  })
}

const ONE_BAR = { t: 1700000000000, o: 100, h: 110, l: 90, c: 105, v: 1_000_000, vw: 102 }

function mountChart(settingsOverrides = {}, propsOverrides = {}) {
  return mount(CandlestickChart, {
    props: { ...defaultProps, settings: settingsOverrides, ...propsOverrides },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  global.fetch = mockFetch({ results: [ONE_BAR] })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings panel toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('settings panel', () => {
  test('with ⚙️ click expect settings panel shown', async () => {
    // Arrange
    const wrapper = mountChart({ ticker: 'AAPL' })
    await nextTick()

    // Assert — hidden by default
    expect(wrapper.find('.settings-panel').exists()).toBe(false)

    // Act
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert — now visible
    expect(wrapper.find('.settings-panel').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with second ⚙️ click expect settings panel hidden', async () => {
    // Arrange
    const wrapper = mountChart({ ticker: 'AAPL' })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('.settings-panel').exists()).toBe(true)

    // Act
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.settings-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with bar-count input changed expect emitSettings called with new barCount', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — change bar count
    const input = wrapper.find('[data-testid="bar-count-input"]')
    await input.setValue(200)
    await input.trigger('change')
    await nextTick()

    // Assert
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].barCount).toBe(200)
    wrapper.unmount()
  })

  test('with auto-refresh toggled on expect refresh-interval select visible', async () => {
    // Arrange — start with autoRefresh off
    const wrapper = mountChart({ ticker: 'AAPL', autoRefresh: false })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="refresh-interval-select"]').exists()).toBe(false)

    // Act — toggle auto-refresh on
    const checkbox = wrapper.find('[data-testid="auto-refresh-toggle"]')
    await checkbox.setChecked(true)
    await checkbox.trigger('change')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="refresh-interval-select"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with refresh-interval select changed expect emitSettings called', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — change refresh interval
    const select = wrapper.find('[data-testid="refresh-interval-select"]')
    await select.setValue('5m')
    await select.trigger('change')
    await nextTick()

    // Assert
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].refreshInterval).toBe('5m')
    wrapper.unmount()
  })

  test('with EMA checkbox toggled expect emitSettings called', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL' } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — toggle first EMA
    const emaRow = wrapper.find('[data-testid="ema-row-0"]')
    const emaCheckbox = emaRow.find('input[type="checkbox"]')
    const wasChecked = emaCheckbox.element.checked
    await emaCheckbox.setChecked(!wasChecked)
    await emaCheckbox.trigger('change')
    await nextTick()

    // Assert
    expect(calls.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with volume checkbox toggled on expect avg-volume row visible', async () => {
    // Arrange — volume OFF by default
    const wrapper = mountChart({ ticker: 'AAPL', volume: { enabled: false } })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — enable volume
    const volumeCheckboxes = wrapper.findAll('.settings-panel input[type="checkbox"]')
    // Find the volume checkbox by position in panel: find one adjacent to "Volume" label
    const volumeSection = wrapper.findAll('.settings-row').find(r => r.text().includes('Volume'))
    await volumeSection.find('input[type="checkbox"]').setChecked(true)
    await volumeSection.find('input[type="checkbox"]').trigger('change')
    await nextTick()

    // Assert — avg-volume row now visible
    const hasAvgVol = wrapper.findAll('.settings-row').some(r => r.text().includes('Avg Vol'))
    expect(hasAvgVol).toBe(true)
    wrapper.unmount()
  })

  test('with MACD checkbox toggled on expect MACD param inputs visible', async () => {
    // Arrange
    const wrapper = mountChart({ ticker: 'AAPL', macd: { enabled: false, fast: 12, slow: 26, signal: 9 } })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Enable MACD
    const macdRow = wrapper.findAll('.settings-row').find(r => r.text().includes('MACD'))
    const macdCheckbox = macdRow.find('input[type="checkbox"]')
    await macdCheckbox.setChecked(true)
    await macdCheckbox.trigger('change')
    await nextTick()

    // Assert — param inputs visible (Fast, Slow, Signal)
    const macdRowInputs = macdRow.findAll('input[type="number"]')
    expect(macdRowInputs.length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// fetchBars — error path
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchBars', () => {
  test('with HTTP error response expect error state set', async () => {
    // Arrange
    global.fetch = mockFetch({}, false) // ok=false
    const wrapper = mountChart({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert — error message set
    const state = wrapper.vm.$.setupState
    expect(state.error).not.toBeNull()
    wrapper.unmount()
  })

  test('with no ticker expect fetch not called', async () => {
    // Arrange
    global.fetch = vi.fn()
    mountChart() // no ticker in settings
    await nextTick()
    await nextTick()

    // Assert — fetch never called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('with valid ticker expect fetch URL includes ticker symbol', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    mountChart({ ticker: 'TSLA' })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.some(([url]) => url.includes('TSLA'))).toBe(true)
  })

  test('with successful fetch expect lastDataAt updated', async () => {
    // Arrange
    const before = Date.now()
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.vm.lastDataAt).toBeGreaterThanOrEqual(before)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// chartOption — volume pane
// ─────────────────────────────────────────────────────────────────────────────

describe('chartOption with volume enabled', () => {
  test('with volume.enabled=true expect bar series added for volume', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({ ticker: 'AAPL', volume: { enabled: true } })
    await nextTick()
    await nextTick()

    // Assert — volume bar series present
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const volumeSeries = option.series?.filter(s => s.type === 'bar')
    expect(volumeSeries?.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with volume.enabled=true and avgVolume.enabled=true expect avg vol line series', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      volume: { enabled: true },
      avgVolume: { enabled: true, period: 20, color: '#aaa' },
    })
    await nextTick()
    await nextTick()

    // Assert — calcVolumeAvg called
    expect(calcVolumeAvg).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const avgVolSeries = option.series?.find(s => s.name === 'Avg Vol')
    expect(avgVolSeries).toBeDefined()
    wrapper.unmount()
  })

  test('with volume.enabled=false expect no unnamed bar series (volume bars)', async () => {
    // Arrange — also disable MACD so the only bar-type series would be volume
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      volume: { enabled: false },
      macd:   { enabled: false, fast: 12, slow: 26, signal: 9 },
    })
    await nextTick()
    await nextTick()

    // Assert — no unnamed bar series (volume bars have no name; MACD histogram is 'Hist')
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const unnamedBarSeries = option.series?.filter(s => s.type === 'bar' && !s.name)
    expect(unnamedBarSeries?.length ?? 0).toBe(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// chartOption — MACD pane
// ─────────────────────────────────────────────────────────────────────────────

describe('chartOption with MACD enabled', () => {
  test('with macd.enabled=true expect MACD line series added', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
    })
    await nextTick()
    await nextTick()

    // Assert — calcMACD called; MACD series present
    expect(calcMACD).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    const macdSeries = option.series?.find(s => s.name === 'MACD')
    expect(macdSeries).toBeDefined()
    wrapper.unmount()
  })

  test('with macd.enabled=true expect Signal and Histogram series too', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({ ticker: 'AAPL', macd: { enabled: true, fast: 12, slow: 26, signal: 9 } })
    await nextTick()
    await nextTick()

    // Assert
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name === 'Signal')).toBeDefined()
    expect(option.series?.find(s => s.name === 'Hist')).toBeDefined()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// chartOption — overlay series (EMA/SMA/VWMA/VWAP)
// ─────────────────────────────────────────────────────────────────────────────

describe('chartOption overlay series', () => {
  test('with ema[0].enabled=true expect EMA line series added', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      ema: [{ enabled: true, period: 9, color: '#f59e0b' }],
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(calcEMA).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name?.startsWith('EMA'))).toBeDefined()
    wrapper.unmount()
  })

  test('with ema[0].enabled=false expect no EMA series', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      ema: [{ enabled: false, period: 9, color: '#f59e0b' }],
    })
    await nextTick()
    await nextTick()

    // Assert — calcEMA not called for disabled EMA
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name?.startsWith('EMA'))).toBeUndefined()
    wrapper.unmount()
  })

  test('with sma[0].enabled=true expect SMA line series added', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      sma: [{ enabled: true, period: 20, color: '#6b7280' }],
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(calcSMA).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name?.startsWith('SMA'))).toBeDefined()
    wrapper.unmount()
  })

  test('with vwma[0].enabled=true expect VWMA line series added', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      vwma: [{ enabled: true, period: 14, color: '#a78bfa' }],
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(calcVWMA).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name?.startsWith('VWMA'))).toBeDefined()
    wrapper.unmount()
  })

  test('with vwap.enabled=true expect VWAP line series added', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      vwap: { enabled: true, color: '#e879f9' },
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(calcVWAP).toHaveBeenCalled()
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.series?.find(s => s.name === 'VWAP')).toBeDefined()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// chartOption — empty bars (guard)
// ─────────────────────────────────────────────────────────────────────────────

describe('chartOption with no bars', () => {
  test('with ticker set but empty results expect chartOption is empty object (VChart gets {})', async () => {
    // Arrange — ticker set but fetch returns empty results array
    global.fetch = mockFetch({ results: [] })
    const wrapper = mountChart({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // VChart IS rendered (ticker is set, no error), but option is {}
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(Object.keys(option).length).toBe(0)
    wrapper.unmount()
  })

  test('with no ticker expect no-ticker placeholder shown (VChart not rendered)', async () => {
    // Arrange — no ticker → tickerLocal is null
    const wrapper = mountChart() // no ticker
    await nextTick()

    // Assert — no-ticker div shown, VChart absent
    expect(wrapper.find('[data-testid="no-ticker"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Auto-refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('auto-refresh', () => {
  test('with autoRefresh=true and interval=1m expect fetch called periodically', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({ ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' })
    await nextTick()
    await nextTick()
    const callsBefore = global.fetch.mock.calls.length

    // Act — advance by 1 minute
    vi.advanceTimersByTime(60_001)
    await nextTick()

    // Assert — fetch called again
    expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore)
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('with autoRefresh=false expect no periodic fetch', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [] })
    const wrapper = mountChart({ ticker: 'AAPL', autoRefresh: false })
    await nextTick()
    await nextTick()
    const callsBefore = global.fetch.mock.calls.length

    // Act
    vi.advanceTimersByTime(120_000)
    await nextTick()

    // Assert — no additional fetches
    expect(global.fetch.mock.calls.length).toBe(callsBefore)
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('with component unmounted expect refresh timer cleared', async () => {
    // Arrange
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({ ticker: 'AAPL', autoRefresh: true, refreshInterval: '1m' })
    await nextTick()
    await nextTick()

    // Act
    wrapper.unmount()
    const callsAfterUnmount = global.fetch.mock.calls.length
    vi.advanceTimersByTime(120_000)
    await nextTick()

    // Assert — no more fetches after unmount
    expect(global.fetch.mock.calls.length).toBe(callsAfterUnmount)
    vi.useRealTimers()
  })

  test('onAutoRefreshChange schedules refresh and emits settings', async () => {
    // Arrange
    const calls = []
    vi.useFakeTimers()
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', autoRefresh: false } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()

    // Act — enable auto-refresh via checkbox
    const checkbox = wrapper.find('[data-testid="auto-refresh-toggle"]')
    await checkbox.setChecked(true)
    await checkbox.trigger('change')
    await nextTick()

    // Assert — settings emitted with autoRefresh: true
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].autoRefresh).toBe(true)

    wrapper.unmount()
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// settings prop watch
// ─────────────────────────────────────────────────────────────────────────────

describe('settings prop watch', () => {
  test('with settings prop updated expect local state synced', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', interval: '1d' } },
    })
    await nextTick()

    // Act — update settings prop
    await wrapper.setProps({ settings: { ticker: 'TSLA', interval: '5m', barCount: 200 } })
    await nextTick()
    await nextTick()

    // Assert — ticker input updated
    expect(wrapper.find('[data-testid="header-ticker-input"]').element.value).toBe('TSLA')
    wrapper.unmount()
  })

  test('with settings prop updated expect new ticker fetched', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const wrapper = mount(CandlestickChart, {
      props: { ...defaultProps, settings: { ticker: 'AAPL', interval: '1d' } },
    })
    await nextTick()
    await nextTick()
    const callsBefore = global.fetch.mock.calls.length

    // Act — change to TSLA
    await wrapper.setProps({ settings: { ticker: 'TSLA', interval: '1d' } })
    await nextTick()
    await nextTick()

    // Assert — fetch called with TSLA
    expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(global.fetch.mock.calls.some(([url]) => url.includes('TSLA'))).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isIntraday — determines VWAP calculation mode
// ─────────────────────────────────────────────────────────────────────────────

describe('isIntraday computed', () => {
  test('with interval 1m expect VWAP called with isIntraday=true', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      interval: '1m',
      vwap: { enabled: true, color: '#e879f9' },
    })
    await nextTick()
    await nextTick()

    // Assert — calcVWAP called with true for isIntraday
    expect(calcVWAP).toHaveBeenCalledWith(expect.any(Array), true)
    wrapper.unmount()
  })

  test('with interval 1d expect VWAP called with isIntraday=false', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      interval: '1d',
      vwap: { enabled: true, color: '#e879f9' },
    })
    await nextTick()
    await nextTick()

    // Assert
    expect(calcVWAP).toHaveBeenCalledWith(expect.any(Array), false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Go button and emitSettings
// ─────────────────────────────────────────────────────────────────────────────

describe('Go button', () => {
  test('with Go button click expect update-settings emitted with current ticker', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [] })
    const calls = []
    const wrapper = mount(CandlestickChart, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
    })
    await nextTick()

    // Act — type ticker and click Go
    await wrapper.find('[data-testid="header-ticker-input"]').setValue('NVDA')
    await wrapper.find('.go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].ticker).toBe('NVDA')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// chartOption pane heights — both volume AND MACD enabled
// ─────────────────────────────────────────────────────────────────────────────

describe('chartOption pane heights with both volume and MACD', () => {
  test('with both volume and MACD enabled expect 3 grids in chart option', async () => {
    // Arrange
    global.fetch = mockFetch({ results: [ONE_BAR] })
    const wrapper = mountChart({
      ticker: 'AAPL',
      volume: { enabled: true },
      macd:   { enabled: true, fast: 12, slow: 26, signal: 9 },
    })
    await nextTick()
    await nextTick()

    // Assert — 3 grids: main, volume, MACD
    const option = wrapper.findComponent({ name: 'VChart' }).props('option')
    expect(option.grid?.length).toBe(3)
    wrapper.unmount()
  })
})
