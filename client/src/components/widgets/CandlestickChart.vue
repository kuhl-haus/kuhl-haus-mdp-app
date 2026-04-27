<template>
  <div class="candlestick-chart-widget">
    <!-- Header -->
    <div class="chart-header">
      <div class="ticker-display">
        <span class="ticker-label">{{ tickerLocal || '—' }}</span>
      </div>
      <div class="interval-btns">
        <button
          v-for="iv in INTERVALS"
          :key="iv"
          :class="['interval-btn', intervalLocal === iv ? 'interval-btn--active' : '']"
          :data-testid="`interval-btn-${iv}`"
          @click="setInterval(iv)"
        >{{ iv }}</button>
      </div>
      <button class="col-menu-btn" @click="showSettings = !showSettings" title="Settings">⚙️</button>
    </div>

    <!-- Settings panel -->
    <div v-if="showSettings" class="settings-panel">
      <!-- Ticker source -->
      <div class="settings-row">
        <span class="settings-label">Ticker</span>
        <label class="radio-label">
          <input type="radio" v-model="tickerSourceLocal" value="bus" @change="emitSettings" /> Bus
        </label>
        <label class="radio-label">
          <input type="radio" v-model="tickerSourceLocal" value="manual" @change="emitSettings" /> Manual
        </label>
        <input
          v-if="tickerSourceLocal === 'manual'"
          type="text"
          v-model="manualTickerLocal"
          @change="emitSettings"
          placeholder="Ticker…"
          class="ticker-input"
          data-testid="manual-ticker-input"
        />
      </div>

      <!-- Bar count -->
      <div class="settings-row">
        <span class="settings-label">Bars</span>
        <input
          type="number"
          v-model.number="barCountLocal"
          @change="emitSettings"
          min="1"
          max="50000"
          class="narrow-input"
          data-testid="bar-count-input"
        />
      </div>

      <!-- Auto-refresh -->
      <div class="settings-row">
        <span class="settings-label">Auto-refresh</span>
        <input type="checkbox" v-model="autoRefreshLocal" @change="onAutoRefreshChange" data-testid="auto-refresh-toggle" />
        <select v-if="autoRefreshLocal" v-model="refreshIntervalLocal" @change="onRefreshIntervalChange" class="interval-select" data-testid="refresh-interval-select">
          <option v-for="iv in INTERVALS" :key="iv" :value="iv">{{ iv }}</option>
        </select>
      </div>

      <!-- Overlays -->
      <div class="settings-section-title">Overlays</div>
      <div class="settings-row" v-for="(cfg, idx) in emaLocal" :key="`ema-${idx}`">
        <input type="checkbox" v-model="cfg.enabled" @change="emitSettings" />
        <span class="settings-label">EMA</span>
        <input type="number" v-model.number="cfg.period" @change="emitSettings" min="1" class="narrow-input" />
      </div>
      <div class="settings-row" v-for="(cfg, idx) in smaLocal" :key="`sma-${idx}`">
        <input type="checkbox" v-model="cfg.enabled" @change="emitSettings" />
        <span class="settings-label">SMA</span>
        <input type="number" v-model.number="cfg.period" @change="emitSettings" min="1" class="narrow-input" />
      </div>
      <div class="settings-row">
        <input type="checkbox" v-model="vwapLocal.enabled" @change="emitSettings" />
        <span class="settings-label">VWAP</span>
      </div>

      <!-- Panes -->
      <div class="settings-section-title">Panes</div>
      <div class="settings-row">
        <input type="checkbox" v-model="volumeLocal.enabled" @change="emitSettings" />
        <span class="settings-label">Volume</span>
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

    <!-- No ticker placeholder -->
    <div v-if="!tickerLocal" class="no-ticker" data-testid="no-ticker">
      <span>No ticker selected. {{ tickerSourceLocal === 'bus' ? 'Click a row in a linked scanner.' : 'Enter a ticker in Settings.' }}</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state" data-testid="error-state">
      <span>⚠ {{ error }}</span>
      <button class="retry-btn" data-testid="retry-btn" @click="fetchBars">↻ Retry</button>
    </div>

    <!-- Chart -->
    <div v-else class="chart-container">
      <VChart
        class="chart"
        :option="chartOption"
        :loading="loading"
        :autoresize="true"
        data-testid="vchart"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { use }            from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart as EChartsCandlestick, LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, DataZoomComponent,
  LegendComponent, AxisPointerComponent, TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useScannerLink } from '@/composables/useScannerLink.js'
import {
  calcEMA, calcSMA, calcVWMA, calcVWAP, calcMACD, calcVolumeAvg,
} from '@/utils/chartIndicators.js'

use([
  CanvasRenderer, EChartsCandlestick, LineChart, BarChart,
  GridComponent, TooltipComponent, DataZoomComponent,
  LegendComponent, AxisPointerComponent, TitleComponent,
])

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
  tickerSource:    'bus',
  interval:        '15m',
  barCount:        200,
  autoRefresh:     true,
  refreshInterval: '1m',
  ema:   [
    { period: 9,  enabled: true,  color: '#f59e0b' },
    { period: 21, enabled: true,  color: '#3b82f6' },
  ],
  sma:   [
    { period: 50,  enabled: false, color: '#a78bfa' },
    { period: 200, enabled: false, color: '#f87171' },
  ],
  vwma:  [{ period: 20, enabled: false, color: '#34d399' }],
  vwap:  { enabled: true,  color: '#e879f9' },
  volume:    { enabled: true },
  avgVolume: { enabled: true, period: 20, color: '#6b7280' },
  macd:      { enabled: false, fast: 12, slow: 26, signal: 9 },
}

const config = computed(() => ({ ...DEFAULT_SETTINGS, ...props.settings }))

// ── Scanner bus ───────────────────────────────────────────────────────────────
// CandlestickChart is read-only from the bus — no onRowClick needed
const { activeTicker } = useScannerLink(computed(() => props.linkColor))

// ── Local state ───────────────────────────────────────────────────────────────
const bars    = ref([])
const loading = ref(false)
const error   = ref(null)

const tickerSourceLocal   = ref(config.value.tickerSource)
const manualTickerLocal   = ref(config.value.ticker ?? '')
const intervalLocal       = ref(config.value.interval)
const barCountLocal       = ref(config.value.barCount)
const autoRefreshLocal    = ref(config.value.autoRefresh)
const refreshIntervalLocal = ref(config.value.refreshInterval)
const emaLocal            = ref(config.value.ema.map(e => ({ ...e })))
const smaLocal            = ref(config.value.sma.map(e => ({ ...e })))
const vwapLocal           = ref({ ...config.value.vwap })
const volumeLocal         = ref({ ...config.value.volume })
const macdLocal           = ref({ ...config.value.macd })
const showSettings        = ref(false)

// ── Resolved ticker ───────────────────────────────────────────────────────────
const tickerLocal = computed(() => {
  if (tickerSourceLocal.value === 'manual') {
    return manualTickerLocal.value?.trim().toUpperCase() || null
  }
  return activeTicker.value || null
})

// Follow bus only in bus mode
watch(activeTicker, () => {
  // tickerLocal automatically reflects activeTicker.value in bus mode via computed
})

// ── Date range helper ─────────────────────────────────────────────────────────
function buildDateRange(interval) {
  const cfg = INTERVAL_CONFIG[interval] || INTERVAL_CONFIG['1d']
  const to = new Date()
  const from = new Date(to - cfg.lookbackDays * 24 * 60 * 60 * 1000)
  const fmt = (d) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(to), ...cfg }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchBars() {
  if (!tickerLocal.value) return
  const appConfig = window.__APP_CONFIG__ || {}
  const key = appConfig.massiveApiKey
  const { multiplier, timespan, from, to } = buildDateRange(intervalLocal.value)
  const limit = barCountLocal.value
  const url = `https://api.massive.com/v2/aggs/ticker/${tickerLocal.value}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${key}`

  loading.value = true
  error.value   = null
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    bars.value = json.results ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(tickerLocal, (t) => { if (t) fetchBars() }, { immediate: true })
watch(intervalLocal, () => { fetchBars(); scheduleRefresh() })

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
onUnmounted(() => clearRefresh())

function onAutoRefreshChange() {
  scheduleRefresh()
  emitSettings()
}

function onRefreshIntervalChange() {
  scheduleRefresh()
  emitSettings()
}

// ── Interval button ───────────────────────────────────────────────────────────
function setInterval(iv) {
  intervalLocal.value = iv
  emitSettings()
}

// ── Settings ──────────────────────────────────────────────────────────────────
function emitSettings() {
  emit('update-settings', {
    ticker:          manualTickerLocal.value?.trim().toUpperCase() || null,
    tickerSource:    tickerSourceLocal.value,
    interval:        intervalLocal.value,
    barCount:        barCountLocal.value,
    autoRefresh:     autoRefreshLocal.value,
    refreshInterval: refreshIntervalLocal.value,
    ema:             emaLocal.value.map(e => ({ ...e })),
    sma:             smaLocal.value.map(e => ({ ...e })),
    vwma:            [],  // reserved for future
    vwap:            { ...vwapLocal.value },
    volume:          { ...volumeLocal.value },
    avgVolume:       { enabled: true, period: 20 },
    macd:            { ...macdLocal.value },
  })
}

watch(() => props.settings, (s) => {
  const m = { ...DEFAULT_SETTINGS, ...s }
  tickerSourceLocal.value    = m.tickerSource
  manualTickerLocal.value    = m.ticker ?? ''
  intervalLocal.value        = m.interval
  barCountLocal.value        = m.barCount
  autoRefreshLocal.value     = m.autoRefresh
  refreshIntervalLocal.value = m.refreshInterval
  emaLocal.value             = m.ema.map(e => ({ ...e }))
  smaLocal.value             = m.sma.map(e => ({ ...e }))
  vwapLocal.value            = { ...m.vwap }
  volumeLocal.value          = { ...m.volume }
  macdLocal.value            = { ...m.macd }
})

// ── ECharts option ────────────────────────────────────────────────────────────
const isIntraday = computed(() => ['1m', '5m', '15m', '1h'].includes(intervalLocal.value))

const chartOption = computed(() => {
  if (!bars.value.length) return {}

  const times    = bars.value.map(b => new Date(b.t).toISOString())
  const candles  = bars.value.map(b => [b.o, b.c, b.l, b.h])
  const volumes  = bars.value.map((b, i) => ({
    value: b.v,
    itemStyle: { color: b.c >= b.o ? '#26a69a' : '#ef5350' },
  }))

  const showVolume = volumeLocal.value.enabled
  const showMACD   = macdLocal.value.enabled

  // Pane heights
  const mainH   = showVolume && showMACD ? '50%' : showVolume || showMACD ? '60%' : '85%'
  const volTop  = showVolume ? (showMACD ? '55%' : '65%') : null
  const macdTop = showMACD  ? '78%' : null

  const grids = [{ left: '8%', right: '4%', top: '8%', height: mainH }]
  const xAxes = [{ type: 'category', data: times, scale: true, boundaryGap: false, splitLine: { show: false }, axisLine: { onZero: false }, gridIndex: 0 }]
  const yAxes = [{ scale: true, splitArea: { show: true }, gridIndex: 0 }]
  const series = []
  let xAxisCount = 1

  if (showVolume) {
    grids.push({ left: '8%', right: '4%', top: volTop, height: '18%' })
    xAxes.push({ type: 'category', data: times, scale: true, boundaryGap: false, splitLine: { show: false }, axisLabel: { show: false }, gridIndex: xAxisCount })
    yAxes.push({ scale: true, gridIndex: xAxisCount, splitNumber: 2, axisLabel: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v } })
    series.push({ type: 'bar', data: volumes, xAxisIndex: xAxisCount, yAxisIndex: xAxisCount, barMaxWidth: 10 })
    xAxisCount++
  }

  if (showMACD) {
    const { macdLine, signalLine, histogram } = calcMACD(bars.value, macdLocal.value.fast, macdLocal.value.slow, macdLocal.value.signal)
    grids.push({ left: '8%', right: '4%', top: macdTop, height: '18%' })
    xAxes.push({ type: 'category', data: times, scale: true, boundaryGap: false, splitLine: { show: false }, axisLabel: { show: false }, gridIndex: xAxisCount })
    yAxes.push({ scale: true, gridIndex: xAxisCount, splitNumber: 2 })
    series.push(
      { name: 'MACD',   type: 'line', data: macdLine,   smooth: false, symbol: 'none', lineStyle: { color: '#3b82f6' }, xAxisIndex: xAxisCount, yAxisIndex: xAxisCount },
      { name: 'Signal', type: 'line', data: signalLine, smooth: false, symbol: 'none', lineStyle: { color: '#f59e0b' }, xAxisIndex: xAxisCount, yAxisIndex: xAxisCount },
      { name: 'Hist',   type: 'bar',  data: histogram,  xAxisIndex: xAxisCount, yAxisIndex: xAxisCount, itemStyle: { color: (p) => p.data >= 0 ? '#26a69a' : '#ef5350' } },
    )
  }

  // Candlestick
  series.unshift({
    type: 'candlestick',
    data: candles,
    xAxisIndex: 0,
    yAxisIndex: 0,
    itemStyle: { color: '#ef5350', color0: '#26a69a', borderColor: '#ef5350', borderColor0: '#26a69a' },
  })

  // Overlays
  for (const cfg of emaLocal.value) {
    if (!cfg.enabled) continue
    series.push({ name: `EMA${cfg.period}`, type: 'line', data: calcEMA(bars.value, cfg.period), smooth: false, symbol: 'none', lineStyle: { color: cfg.color, width: 1 }, xAxisIndex: 0, yAxisIndex: 0 })
  }
  for (const cfg of smaLocal.value) {
    if (!cfg.enabled) continue
    series.push({ name: `SMA${cfg.period}`, type: 'line', data: calcSMA(bars.value, cfg.period), smooth: false, symbol: 'none', lineStyle: { color: cfg.color, width: 1 }, xAxisIndex: 0, yAxisIndex: 0 })
  }
  if (vwapLocal.value.enabled) {
    series.push({ name: 'VWAP', type: 'line', data: calcVWAP(bars.value, isIntraday.value), smooth: false, symbol: 'none', lineStyle: { color: vwapLocal.value.color ?? '#e879f9', width: 1 }, xAxisIndex: 0, yAxisIndex: 0 })
  }

  const dataZoomXIdx = Array.from({ length: xAxisCount + (showMACD ? 1 : 0) }, (_, i) => i)

  return {
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    dataZoom: [
      { type: 'inside', xAxisIndex: dataZoomXIdx, start: 70, end: 100 },
      { show: true, xAxisIndex: dataZoomXIdx, type: 'slider', bottom: '2%', start: 70, end: 100 },
    ],
    series,
  }
})
</script>

<style scoped>
.candlestick-chart-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 13px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.ticker-label {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  min-width: 50px;
}

.interval-btns {
  display: flex;
  gap: 2px;
  flex: 1;
}

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
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.5);
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
  background: #222;
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

.settings-label {
  color: #999;
  min-width: 60px;
}

.settings-section-title {
  font-size: 11px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 0 2px;
  border-top: 1px solid #2a2a2a;
  margin-top: 4px;
}

.narrow-input {
  width: 60px;
  padding: 2px 4px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
}

.ticker-input {
  padding: 2px 6px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  width: 80px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}

.interval-select {
  padding: 2px 4px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
}

.chart-container {
  flex: 1;
  min-height: 0;
}

.chart {
  width: 100%;
  height: 100%;
}

.no-ticker, .error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #555;
  font-size: 13px;
  padding: 24px;
  text-align: center;
}

.retry-btn {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 3px;
  color: #ccc;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
}
.retry-btn:hover { background: #333; }
</style>
