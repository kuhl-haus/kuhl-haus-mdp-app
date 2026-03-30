<template>
  <div class="quote-widget">
    <!-- No ticker linked yet -->
    <div v-if="!activeTicker" class="quote-empty">
      <span class="quote-empty-icon">📊</span>
      <span class="quote-empty-text">Link to a scanner widget and click a row to display a quote</span>
    </div>

    <!-- Ticker linked, waiting for data -->
    <div v-else-if="!quoteData" class="quote-empty">
      <span class="quote-empty-icon">⏳</span>
      <span class="quote-empty-text">Waiting for data for <strong>{{ activeTicker }}</strong>...</span>
    </div>

    <!-- Quote data available -->
    <div v-else class="quote-body">
      <!-- Header: symbol + price + change -->
      <div class="quote-header">
        <div class="quote-symbol">{{ quoteData.symbol }}</div>
        <div class="quote-price">${{ fmt(quoteData.close, 2) }}</div>
        <div :class="['quote-change', changeClass]">
          {{ quoteData.change >= 0 ? '+' : '' }}{{ fmt(quoteData.change, 2) }}
          ({{ quoteData.pct_change >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change, 2) }}%)
        </div>
      </div>

      <!-- From open -->
      <div class="quote-from-open">
        Since open:
        <span :class="['quote-intraday', quoteData.pct_change_since_open >= 0 ? 'positive' : 'negative']">
          {{ quoteData.pct_change_since_open >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change_since_open, 2) }}%
          ({{ quoteData.change_since_open >= 0 ? '+' : '' }}${{ fmt(quoteData.change_since_open, 2) }})
        </span>
      </div>

      <!-- OHLC -->
      <div class="quote-section-label">Today</div>
      <div class="quote-grid">
        <div class="quote-kv"><span class="quote-k">Open</span><span class="quote-v">${{ fmt(quoteData.official_open_price, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">High</span><span class="quote-v">${{ fmt(quoteData.high, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Low</span><span class="quote-v">${{ fmt(quoteData.low, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">VWAP</span><span class="quote-v">${{ fmt(quoteData.aggregate_vwap, 2) }}</span></div>
      </div>

      <!-- Volume -->
      <div class="quote-section-label">Volume</div>
      <div class="quote-grid">
        <div class="quote-kv"><span class="quote-k">Volume</span><span class="quote-v">{{ fmtVol(quoteData.accumulated_volume) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Rel. Vol</span><span :class="['quote-v', relVolClass]">{{ fmt(quoteData.relative_volume, 2) }}x</span></div>
        <div class="quote-kv"><span class="quote-k">Avg Vol</span><span class="quote-v">{{ fmtVol(quoteData.avg_volume) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Float</span><span class="quote-v">{{ fmtVol(quoteData.free_float) }}</span></div>
      </div>

      <!-- Previous day -->
      <div class="quote-section-label">Previous Day</div>
      <div class="quote-grid">
        <div class="quote-kv"><span class="quote-k">PD Close</span><span class="quote-v">${{ fmt(quoteData.prev_day_close, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">PD Volume</span><span class="quote-v">{{ fmtVol(quoteData.prev_day_volume) }}</span></div>
        <div class="quote-kv"><span class="quote-k">PD VWAP</span><span class="quote-v">${{ fmt(quoteData.prev_day_vwap, 2) }}</span></div>
      </div>

      <!-- Freshness -->
      <div class="quote-freshness">
        <span :style="{ color: freshnessColor }">{{ freshnessIcon }}</span>
        Updated {{ dataAge }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useWidgetBus } from '@/composables/useWidgetBus.js'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

defineEmits(['update-settings'])

const appConfig = window.__APP_CONFIG__ || {}
const { activeTickers } = useWidgetBus()

// Ticker driven entirely by the widget bus — not persisted
const activeTicker = computed(() =>
  props.linkColor ? activeTickers[props.linkColor] : null
)

// Quote data
const quoteData = ref(null)
const lastDataAt = ref(null)

// WebSocket client — feed changes dynamically with ticker
const { feedName, isConnected, reconnecting, connect, subscribe, unsubscribe } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: activeTicker.value ? `quote:${activeTicker.value}` : '',
  onData: (data) => {
    quoteData.value = data
    lastDataAt.value = Date.now()
  },
  autoConnect: !!activeTicker.value,
})

// Switch subscription when ticker changes
watch(activeTicker, async (newTicker, oldTicker) => {
  if (oldTicker) {
    unsubscribe()
  }
  quoteData.value = null
  if (newTicker) {
    feedName.value = `quote:${newTicker}`
    if (!isConnected.value) {
      connect()
    } else {
      subscribe()
    }
  }
})

onUnmounted(() => {
  unsubscribe()
})

// Freshness display
const now = ref(Date.now())
const intervalId = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(intervalId))

const dataAge = computed(() => {
  if (!lastDataAt.value) return '—'
  const s = Math.floor((now.value - lastDataAt.value) / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
})

const freshnessIcon = computed(() => {
  if (!lastDataAt.value) return '⚫'
  const s = (now.value - lastDataAt.value) / 1000
  if (s < 5)   return '🟢'
  if (s < 60)  return '🟡'
  return '🔴'
})

const freshnessColor = computed(() => {
  if (!lastDataAt.value) return '#555'
  const s = (now.value - lastDataAt.value) / 1000
  if (s < 5)  return '#22c55e'
  if (s < 60) return '#eab308'
  return '#ef4444'
})

// Formatting helpers
const fmt = (val, decimals = 2) => {
  const n = parseFloat(val)
  return isFinite(n) ? n.toFixed(decimals) : '—'
}

const fmtVol = (val) => {
  const v = parseFloat(val)
  if (!isFinite(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toString()
}

const changeClass = computed(() => {
  if (!quoteData.value) return ''
  return quoteData.value.pct_change >= 0 ? 'positive' : 'negative'
})

const relVolClass = computed(() => {
  if (!quoteData.value) return ''
  const rv = parseFloat(quoteData.value.relative_volume)
  if (rv >= 5) return 'extreme'
  if (rv >= 3) return 'high'
  if (rv >= 2) return 'medium'
  return ''
})

defineExpose({ lastDataAt, isConnected, reconnecting })
</script>

<style scoped>
.quote-widget {
  height: 100%;
  overflow-y: auto;
  background: #1e1e1e;
  color: #e0e0e0;
  font-size: 13px;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.quote-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #555;
  text-align: center;
  padding: 24px;
}
.quote-empty-icon { font-size: 28px; }
.quote-empty-text { font-size: 12px; line-height: 1.5; max-width: 200px; }

.quote-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Header */
.quote-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 8px;
}
.quote-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.quote-price {
  font-size: 20px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  color: #fff;
}
.quote-change {
  font-size: 14px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

/* From open */
.quote-from-open {
  font-size: 12px;
  color: #888;
}
.quote-intraday { font-weight: 600; }

/* Section label */
.quote-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #555;
  margin-top: 4px;
}

/* Key-value grid */
.quote-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 8px;
}
.quote-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #1a1a1a;
}
.quote-k { color: #666; font-size: 12px; }
.quote-v { font-family: 'Courier New', monospace; font-size: 12px; color: #e0e0e0; }

/* Colors */
.positive { color: #4ade80; }
.negative { color: #f87171; }
.extreme  { color: #f97316; font-weight: 700; }
.high     { color: #eab308; font-weight: 600; }
.medium   { color: #a3a3a3; }

/* Freshness */
.quote-freshness {
  margin-top: auto;
  padding-top: 8px;
  font-size: 11px;
  color: #444;
  text-align: right;
}
</style>
