<template>
  <div class="tv-lite-chart-widget">
    <!-- Header: ticker input + interval buttons + gear -->
    <div class="chart-header">
      <div class="ticker-input-wrap">
        <input
          type="text"
          class="header-ticker-input"
          :value="headerTickerInput"
          @input="headerTickerInput = $event.target.value.toUpperCase()"
          @keydown.enter="onGoTicker"
          placeholder="Ticker…"
          data-testid="header-ticker-input"
          autocomplete="off"
          spellcheck="false"
        />
        <button class="go-btn" @click="onGoTicker" title="Go">Go</button>
      </div>
      <div class="interval-btns">
        <button
          v-for="iv in INTERVALS"
          :key="iv"
          :class="['interval-btn', intervalLocal === iv ? 'interval-btn--active' : '']"
          :data-testid="`interval-btn-${iv}`"
          @click="selectInterval(iv)"
        >{{ iv }}</button>
      </div>
      <button class="col-menu-btn" @click="showSettings = !showSettings" title="Settings">⚙️</button>
    </div>

    <!-- Settings panel -->
    <div v-if="showSettings" class="settings-panel">
      <!-- Bar count -->
      <div class="settings-row">
        <span class="settings-label">Bars</span>
        <input type="number" v-model.number="barCountLocal" @change="emitSettings" min="1" max="50000" class="narrow-input" data-testid="bar-count-input" />
      </div>

      <!-- Auto-refresh -->
      <div class="settings-row">
        <span class="settings-label">Auto-refresh</span>
        <input type="checkbox" v-model="autoRefreshLocal" @change="onAutoRefreshChange" data-testid="auto-refresh-toggle" />
        <select v-if="autoRefreshLocal" v-model="refreshIntervalLocal" @change="onRefreshIntervalChange" class="interval-select">
          <option v-for="iv in INTERVALS" :key="iv" :value="iv">{{ iv }}</option>
        </select>
      </div>

      <!-- Overlays -->
      <div class="settings-section-title">Overlays</div>
      <div class="settings-row" v-for="(cfg, idx) in emaLocal" :key="`ema-${idx}`">
        <input type="checkbox" v-model="cfg.enabled" @change="emitSettings" />
        <span class="settings-label">EMA</span>
        <input type="number" v-model.number="cfg.period" @change="emitSettings" min="1" class="narrow-input" />
        <input type="color" v-model="cfg.color" @change="emitSettings" class="color-picker" />
      </div>
      <div class="settings-row" v-for="(cfg, idx) in smaLocal" :key="`sma-${idx}`">
        <input type="checkbox" v-model="cfg.enabled" @change="emitSettings" />
        <span class="settings-label">SMA</span>
        <input type="number" v-model.number="cfg.period" @change="emitSettings" min="1" class="narrow-input" />
        <input type="color" v-model="cfg.color" @change="emitSettings" class="color-picker" />
      </div>
      <div class="settings-row" v-for="(cfg, idx) in vwmaLocal" :key="`vwma-${idx}`">
        <input type="checkbox" v-model="cfg.enabled" @change="emitSettings" />
        <span class="settings-label">VWMA</span>
        <input type="number" v-model.number="cfg.period" @change="emitSettings" min="1" class="narrow-input" />
        <input type="color" v-model="cfg.color" @change="emitSettings" class="color-picker" />
      </div>
      <div class="settings-row">
        <input type="checkbox" v-model="vwapLocal.enabled" @change="emitSettings" />
        <span class="settings-label">VWAP</span>
        <input type="color" v-model="vwapLocal.color" @change="emitSettings" class="color-picker" />
      </div>

      <!-- Panes -->
      <div class="settings-section-title">Panes</div>
      <div class="settings-row">
        <input type="checkbox" v-model="volumeLocal.enabled" @change="emitSettings" />
        <span class="settings-label">Volume</span>
      </div>
      <div class="settings-row" v-if="volumeLocal.enabled">
        <input type="checkbox" v-model="avgVolumeLocal.enabled" @change="emitSettings" />
        <span class="settings-label">Avg Vol</span>
        <input type="number" v-model.number="avgVolumeLocal.period" @change="emitSettings" min="1" class="narrow-input" />
        <input type="color" v-model="avgVolumeLocal.color" @change="emitSettings" class="color-picker" />
      </div>
      <div class="settings-row">
        <input type="checkbox" v-model="macdLocal.enabled" @change="emitSettings" />
        <span class="settings-label">MACD</span>
        <template v-if="macdLocal.enabled">
          <input type="number" v-model.number="macdLocal.fast"   @change="emitSettings" min="1" class="narrow-input" title="Fast" />
          <input type="number" v-model.number="macdLocal.slow"   @change="emitSettings" min="1" class="narrow-input" title="Slow" />
          <input type="number" v-model.number="macdLocal.signal" @change="emitSettings" min="1" class="narrow-input" title="Signal" />
        </template>
      </div>
    </div>

    <!-- Chart container — always in DOM so onMounted can init the chart.
         Overlay states live inside so position:absolute is scoped here,
         not to WidgetWrapper (which would cover its title bar). -->
    <div ref="chartContainer" class="chart-container" data-testid="chart-container">
      <div v-if="!tickerLocal" class="overlay" data-testid="no-ticker">
        <span>No ticker selected. Click a row in a linked scanner or enter a ticker above.</span>
      </div>
      <div v-else-if="error" class="overlay" data-testid="error-state">
        <span>⚠ {{ error }}</span>
        <button class="retry-btn" data-testid="retry-btn" @click="fetchBars">↻ Retry</button>
      </div>
      <div v-else-if="loading && !bars.length" class="overlay" data-testid="loading-state">
        <span>Loading…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  createChart, ColorType, CrosshairMode,
  CandlestickSeries, LineSeries, HistogramSeries,
} from 'lightweight-charts'
import { useScannerLink } from '@/composables/useScannerLink.js'
import { useConfig }      from '@/composables/useConfig.js'
import { useDashboardStore } from '@/stores/useDashboardStore.js'
import {
  calcEMA, calcSMA, calcVWMA, calcVWAP, calcMACD, calcVolumeAvg,
} from '@/utils/chartIndicators.js'

// ── Props / emits ─────────────────────────────────────────────────────────────
const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})
const emit = defineEmits(['update-settings'])

// ── Constants ─────────────────────────────────────────────────────────────────
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']

const INTERVAL_CONFIG = {
  '1m':  { multiplier: 1,  timespan: 'minute', lookbackDays: 5    },
  '5m':  { multiplier: 5,  timespan: 'minute', lookbackDays: 10   },
  '15m': { multiplier: 15, timespan: 'minute', lookbackDays: 30   },
  '1h':  { multiplier: 1,  timespan: 'hour',   lookbackDays: 90   },
  '4h':  { multiplier: 4,  timespan: 'hour',   lookbackDays: 180  },
  '1d':  { multiplier: 1,  timespan: 'day',    lookbackDays: 730  },
  '1w':  { multiplier: 1,  timespan: 'week',   lookbackDays: 1825 },
}

const INTERVAL_MS = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000,
  '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000,
}

const DEFAULT_SETTINGS = {
  ticker:          null,
  interval:        '5m',
  barCount:        5000,
  autoRefresh:     true,
  refreshInterval: '1m',
  ema:   [
    { period: 9,   enabled: true,  color: '#9c9c9c' },
    { period: 21,  enabled: true,  color: '#27a158' },
    { period: 200, enabled: true,  color: '#7a00a3' },
  ],
  sma:   [
    { period: 50,  enabled: false, color: '#8bc476' },
    { period: 200, enabled: true,  color: '#4f7fff' },
  ],
  vwma:  [
    { period: 9,  enabled: false, color: '#b0b0b0' },
    { period: 50, enabled: true,  color: '#02e7fd' },
  ],
  vwap:  { enabled: true,  color: '#ff7400' },
  volume: { enabled: true },
  avgVolume: { enabled: true, period: 20, color: '#0257ff' },
  macd:  { enabled: true, fast: 12, slow: 26, signal: 9 },
}

const config = computed(() => ({ ...DEFAULT_SETTINGS, ...props.settings }))

// ── Config (massiveApiKey) ────────────────────────────────────────────────────
const { config: appConfig } = useConfig()

// ── Dashboard store (for bidirectional bus writes) ─────────────────────────────
const dashboardStore = useDashboardStore()

// ── Scanner bus ───────────────────────────────────────────────────────────────
const { activeTicker } = useScannerLink(computed(() => props.linkColor))

// ── Local state ───────────────────────────────────────────────────────────────
const bars    = ref([])
const loading = ref(false)
const error   = ref(null)

// Exposed for WidgetWrapper freshness indicator
const lastDataAt   = ref(null)
const isConnected  = ref(true)   // REST widget — always connected
const reconnecting = ref(false)  // REST widget — never reconnecting

const headerTickerInput   = ref(config.value.ticker?.trim().toUpperCase() ?? '')
const intervalLocal       = ref(config.value.interval)
const barCountLocal       = ref(config.value.barCount)
const autoRefreshLocal    = ref(config.value.autoRefresh)
const refreshIntervalLocal = ref(config.value.refreshInterval)
const emaLocal            = ref(config.value.ema.map(e => ({ ...e })))
const smaLocal            = ref(config.value.sma.map(e => ({ ...e })))
const vwmaLocal           = ref(config.value.vwma.map(e => ({ ...e })))
const vwapLocal           = ref({ ...config.value.vwap })
const volumeLocal         = ref({ ...config.value.volume })
const avgVolumeLocal      = ref({ ...config.value.avgVolume })
const macdLocal           = ref({ ...config.value.macd })
const showSettings        = ref(false)

// ── Ticker ────────────────────────────────────────────────────────────────────
// tickerLocal is the COMMITTED ticker — drives fetches and the no-ticker overlay.
// It is only updated on explicit commit (Go/Enter), bus update, or settings sync.
// Keeping it separate from headerTickerInput means keystrokes do NOT trigger fetches.
const tickerLocal = ref(config.value.ticker?.trim().toUpperCase() || null)

// Bus auto-fills the header input and persists the ticker to settings.
// Without emitSettings() here, the ticker lives only in headerTickerInput and is
// lost whenever props.settings is re-applied with a new object reference — which
// vue3-grid-layout-next does on touch/scroll events for widgets that need
// repositioning (typically any chart after the first one at y=0).
watch(activeTicker, (t) => {
  if (!t) return
  headerTickerInput.value = t
  // Guard against self-echo: onGoTicker() calls setActiveTicker() which bounces
  // back through this watcher. If tickerLocal already equals t, settings were
  // already emitted by onGoTicker — skip to avoid a double update-settings event.
  if (t !== tickerLocal.value) {
    tickerLocal.value = t
    emitSettings()
  }
})

const onGoTicker = () => {
  const sym = headerTickerInput.value.trim().toUpperCase()
  headerTickerInput.value = sym
  tickerLocal.value = sym || null
  // Broadcast to bus so other linked widgets (charts, scanners) receive the ticker
  if (props.linkColor && sym) dashboardStore.setActiveTicker(props.linkColor, sym)
  emitSettings()
}

// ── Date range ────────────────────────────────────────────────────────────────
function buildDateRange(interval) {
  const cfg = INTERVAL_CONFIG[interval] || INTERVAL_CONFIG['1d']
  const to   = new Date()
  const from = new Date(to - cfg.lookbackDays * 86_400_000)
  const fmt  = (d) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(to), ...cfg }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchBars() {
  if (!tickerLocal.value) return
  const key = appConfig.value?.massiveApiKey
  const { multiplier, timespan, from, to } = buildDateRange(intervalLocal.value)
  const limit = barCountLocal.value
  const url = `https://api.massive.com/v2/aggs/ticker/${tickerLocal.value}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${key}`

  loading.value = true
  error.value   = null
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    bars.value       = json.results ?? []
    lastDataAt.value = Date.now()
    updateChart()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(tickerLocal, (t) => { if (t) fetchBars() }, { immediate: true })
watch(intervalLocal, () => { fetchBars(); scheduleRefresh() })

// Sync local state when settings prop changes
watch(() => props.settings, (s) => {
  const m = { ...DEFAULT_SETTINGS, ...s }
  const ticker               = m.ticker?.trim().toUpperCase() ?? ''
  headerTickerInput.value    = ticker
  tickerLocal.value          = ticker || null
  intervalLocal.value        = m.interval
  barCountLocal.value        = m.barCount
  autoRefreshLocal.value     = m.autoRefresh
  refreshIntervalLocal.value = m.refreshInterval
  emaLocal.value             = m.ema.map(e => ({ ...e }))
  smaLocal.value             = m.sma.map(e => ({ ...e }))
  vwmaLocal.value            = m.vwma.map(e => ({ ...e }))
  vwapLocal.value            = { ...m.vwap }
  volumeLocal.value          = { ...m.volume }
  avgVolumeLocal.value       = { ...m.avgVolume }
  macdLocal.value            = { ...m.macd }
})

// Re-render chart when any indicator/pane setting changes (no refetch needed)
watch(
  [emaLocal, smaLocal, vwmaLocal, vwapLocal, volumeLocal, avgVolumeLocal, macdLocal],
  () => { updateChart() },
  { deep: true }
)

// ── Auto-refresh ──────────────────────────────────────────────────────────────
let refreshTimer = null

function scheduleRefresh() {
  clearRefresh()
  if (!autoRefreshLocal.value) return
  const ms = INTERVAL_MS[refreshIntervalLocal.value] ?? 60_000
  refreshTimer = setInterval(fetchBars, ms)
}

function clearRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

scheduleRefresh()

function onAutoRefreshChange()    { scheduleRefresh(); emitSettings() }
function onRefreshIntervalChange() { scheduleRefresh(); emitSettings() }
function selectInterval(iv)       { intervalLocal.value = iv; emitSettings() }

// ── Settings emit ─────────────────────────────────────────────────────────────
function emitSettings() {
  emit('update-settings', {
    ticker:          headerTickerInput.value?.trim().toUpperCase() || null,
    interval:        intervalLocal.value,
    barCount:        barCountLocal.value,
    autoRefresh:     autoRefreshLocal.value,
    refreshInterval: refreshIntervalLocal.value,
    ema:             emaLocal.value.map(e => ({ ...e })),
    sma:             smaLocal.value.map(e => ({ ...e })),
    vwma:            vwmaLocal.value.map(e => ({ ...e })),
    vwap:            { ...vwapLocal.value },
    volume:          { ...volumeLocal.value },
    avgVolume:       { ...avgVolumeLocal.value },
    macd:            { ...macdLocal.value },
  })
}

// ── Chart (plain JS vars — NOT Vue refs per TW docs) ─────────────────────────
const chartContainer = ref(null)

// eslint-disable-next-line no-unused-vars
let chart          = null
let candleSeries   = null
let volumeSeriesRef = null
let avgVolumeSeriesRef = null
let overlaySeries  = []
let macdSeriesRef  = { line: null, signal: null, histogram: null }
let resizeObserver = null

// Pane indices
const PANE_MAIN   = 0
const PANE_VOLUME = 1
const PANE_MACD   = 2

const isIntraday = computed(() => ['1m', '5m', '15m', '1h'].includes(intervalLocal.value))

onMounted(() => {
  chart = createChart(chartContainer.value, {
    layout: {
      background: { type: ColorType.Solid, color: '#0f0f0f' },
      textColor:  '#9ca3af',
    },
    grid: {
      vertLines: { color: '#1a1a1a' },
      horzLines: { color: '#1a1a1a' },
    },
    crosshair:       { mode: CrosshairMode.Magnet },
    rightPriceScale: { borderColor: '#333' },
    localization: {
      timeFormatter: (timestamp) =>
        new Date(timestamp * 1000).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month:    '2-digit',
          day:      '2-digit',
          hour:     '2-digit',
          minute:   '2-digit',
          hour12:   false,
        }),
    },
    timeScale: {
      borderColor:       '#333',
      timeVisible:       true,
      secondsVisible:    false,
      tickMarkFormatter: (timestamp, markType) => {
        const d    = new Date(timestamp * 1000)
        const opts = { timeZone: 'America/New_York' }
        // markType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
        if (markType >= 3) return d.toLocaleString('en-US', { ...opts, hour: '2-digit', minute: '2-digit', hour12: false })
        if (markType === 2) return d.toLocaleString('en-US', { ...opts, month: '2-digit', day: '2-digit' })
        if (markType === 1) return d.toLocaleString('en-US', { ...opts, month: 'short' })
        return d.toLocaleString('en-US', { ...opts, year: 'numeric' })
      },
    },
    width:  chartContainer.value.clientWidth  || 300,
    height: chartContainer.value.clientHeight || 300,
  })

  // Candlestick (main pane)
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor:          '#26a69a',
    downColor:        '#ef5350',
    borderUpColor:    '#26a69a',
    borderDownColor:  '#ef5350',
    wickUpColor:      '#26a69a',
    wickDownColor:    '#ef5350',
  }, PANE_MAIN)

  // Volume (pane 1) — always created; visibility controlled in updateChart
  volumeSeriesRef = chart.addSeries(HistogramSeries, {
    priceFormat:  { type: 'volume' },
    priceScaleId: 'volume',
    visible: volumeLocal.value.enabled,
  }, PANE_VOLUME)
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } })

  // Avg Volume line on volume pane — always created, visibility controlled in updateChart
  avgVolumeSeriesRef = chart.addSeries(LineSeries, {
    color:              avgVolumeLocal.value.color ?? '#0257ff',
    lineWidth:          1,
    priceLineVisible:   false,
    lastValueVisible:   false,
    visible:            volumeLocal.value.enabled && avgVolumeLocal.value.enabled,
    priceScaleId:       'volume',
  }, PANE_VOLUME)

  // MACD (pane 2) — always created; visibility controlled in updateChart
  macdSeriesRef.line      = chart.addSeries(LineSeries,      { color: '#3b82f6', lineWidth: 1, visible: macdLocal.value.enabled }, PANE_MACD)
  macdSeriesRef.signal    = chart.addSeries(LineSeries,      { color: '#f59e0b', lineWidth: 1, visible: macdLocal.value.enabled }, PANE_MACD)
  macdSeriesRef.histogram = chart.addSeries(HistogramSeries, { visible: macdLocal.value.enabled }, PANE_MACD)

  // Autoresize
  resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      chart.applyOptions({
        width:  chartContainer.value.clientWidth,
        height: chartContainer.value.clientHeight,
      })
    }
  })
  resizeObserver.observe(chartContainer.value)

  // Render any bars already loaded before mount
  if (bars.value.length) updateChart()
})

onUnmounted(() => {
  clearRefresh()
  resizeObserver?.disconnect()
  if (chart) { chart.remove(); chart = null }
})

// ── Chart update ──────────────────────────────────────────────────────────────
function updateChart() {
  if (!chart || !candleSeries || !bars.value.length) return

  // Map Massive API (ms) → lightweight-charts (seconds)
  const mapped = bars.value.map(b => ({
    time:  b.t / 1000,
    open:  b.o,
    high:  b.h,
    low:   b.l,
    close: b.c,
  }))
  candleSeries.setData(mapped)

  // Volume — update visibility and data
  if (volumeSeriesRef) {
    const showVol = volumeLocal.value.enabled
    volumeSeriesRef.applyOptions({ visible: showVol })
    if (showVol) {
      volumeSeriesRef.setData(bars.value.map(b => ({
        time:  b.t / 1000,
        value: b.v,
        color: b.c >= b.o ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      })))
    }
  }

  // Avg Volume line — visibility tied to both volume pane AND avgVolume toggle
  if (avgVolumeSeriesRef) {
    const showAvgVol = volumeLocal.value.enabled && avgVolumeLocal.value.enabled
    avgVolumeSeriesRef.applyOptions({ visible: showAvgVol, color: avgVolumeLocal.value.color ?? '#0257ff' })
    if (showAvgVol) {
      const vals = calcVolumeAvg(bars.value, avgVolumeLocal.value.period ?? 20)
      avgVolumeSeriesRef.setData(vals.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
    }
  }

  // Overlays — remove stale series then rebuild
  overlaySeries.forEach(s => { try { chart.removeSeries(s) } catch (_) {} })
  overlaySeries = []

  for (const cfg of emaLocal.value) {
    if (!cfg.enabled) continue
    const s = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, PANE_MAIN)
    const vals = calcEMA(bars.value, cfg.period)
    s.setData(vals.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
    overlaySeries.push(s)
  }
  for (const cfg of smaLocal.value) {
    if (!cfg.enabled) continue
    const s = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, PANE_MAIN)
    const vals = calcSMA(bars.value, cfg.period)
    s.setData(vals.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
    overlaySeries.push(s)
  }
  for (const cfg of vwmaLocal.value) {
    if (!cfg.enabled) continue
    const s = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, PANE_MAIN)
    const vals = calcVWMA(bars.value, cfg.period)
    s.setData(vals.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
    overlaySeries.push(s)
  }
  if (vwapLocal.value.enabled) {
    const s = chart.addSeries(LineSeries, { color: vwapLocal.value.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, PANE_MAIN)
    const vals = calcVWAP(bars.value, isIntraday.value)
    s.setData(vals.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
    overlaySeries.push(s)
  }

  // MACD — update visibility and data
  if (macdSeriesRef.line) {
    const showMACD = macdLocal.value.enabled
    macdSeriesRef.line.applyOptions({ visible: showMACD })
    macdSeriesRef.signal.applyOptions({ visible: showMACD })
    macdSeriesRef.histogram.applyOptions({ visible: showMACD })
    if (showMACD) {
      const { macdLine, signalLine, histogram } = calcMACD(bars.value, macdLocal.value.fast, macdLocal.value.slow, macdLocal.value.signal)
      macdSeriesRef.line.setData(macdLine.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
      macdSeriesRef.signal.setData(signalLine.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v }).filter(Boolean))
      macdSeriesRef.histogram.setData(histogram.map((v, i) => v === null ? null : { time: bars.value[i].t / 1000, value: v, color: v >= 0 ? '#26a69a' : '#ef5350' }).filter(Boolean))
    }
  }
}

defineExpose({ lastDataAt, isConnected, reconnecting })
</script>

<style scoped>
.tv-lite-chart-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f0f0f;
  color: #e0e0e0;
  font-size: 13px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  gap: 6px;
  flex-shrink: 0;
}

.ticker-input-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.header-ticker-input {
  width: 72px;
  padding: 2px 6px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
}
.header-ticker-input:focus { outline: none; border-color: #8b5cf6; }
.header-ticker-input::placeholder { color: #555; font-weight: normal; }

.go-btn {
  padding: 2px 7px;
  background: rgba(139,92,246,0.15);
  border: 1px solid rgba(139,92,246,0.4);
  border-radius: 3px;
  color: #a78bfa;
  font-size: 11px;
  cursor: pointer;
}
.go-btn:hover { background: rgba(139,92,246,0.25); }

.interval-btns { display: flex; gap: 2px; flex: 1; }

.interval-btn {
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #888;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}
.interval-btn--active {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.5);
  color: #a78bfa;
}

.col-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 2px 4px;
}

.settings-panel {
  padding: 8px 12px;
  background: #111;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
}

.settings-label { color: #999; min-width: 40px; }
.settings-section-title {
  font-size: 11px; color: #555; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 5px 0 2px;
  border-top: 1px solid #1f1f1f; margin-top: 3px;
}

.narrow-input {
  width: 55px; padding: 2px 4px; background: #1a1a1a;
  border: 1px solid #333; border-radius: 3px; color: #e0e0e0; font-size: 12px;
}

.interval-select {
  padding: 2px 4px; background: #1a1a1a; border: 1px solid #333;
  border-radius: 3px; color: #e0e0e0; font-size: 12px;
}

.color-picker {
  width: 24px; height: 20px; padding: 0;
  border: 1px solid #444; border-radius: 3px;
  background: none; cursor: pointer; flex-shrink: 0;
}

.chart-container { flex: 1; min-height: 0; position: relative; }

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #555;
  font-size: 13px;
  padding: 24px;
  text-align: center;
  background: #0f0f0f;
  z-index: 10;
}

.retry-btn {
  background: #1a1a1a; border: 1px solid #444; border-radius: 3px;
  color: #ccc; padding: 4px 12px; cursor: pointer; font-size: 12px;
}
</style>
