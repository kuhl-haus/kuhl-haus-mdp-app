<template>
  <div class="quote-widget">
    <!-- Ticker input bar — always visible -->
    <div class="quote-controls">
      <input
        v-model="inputTicker"
        class="quote-input"
        placeholder="Enter ticker (e.g. AAPL)"
        maxlength="10"
        spellcheck="false"
        @keyup.enter="applyInput"
        @keyup.escape="inputTicker = ''"
      />
      <button class="quote-go-btn" @click="applyInput" @touchend.prevent="applyInput" title="Load quote">Go</button>
    </div>

    <!-- No ticker yet -->
    <div v-if="!activeTicker" class="quote-empty">
      <span class="quote-empty-icon">⚡</span>
      <span class="quote-empty-text">Enter a ticker above, or link to a scanner and click a row</span>
    </div>

    <!-- Ticker set, waiting for data -->
    <div v-else-if="!quoteData" class="quote-empty">
      <span class="quote-empty-icon">⏳</span>
      <span class="quote-empty-text">Waiting for data for <strong>{{ activeTicker }}</strong>...</span>
    </div>

    <!-- Quote data available -->
    <div v-else class="quote-body">
      <!-- Header: symbol + price + change -->
      <div class="quote-header">
        <div class="quote-symbol">
          {{ quoteData.symbol }}
          <img v-if="quoteFlame" :src="quoteFlame.src" :title="quoteFlame.tooltip" class="quote-flame-icon" />
        </div>
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
<!-- TODO: https://github.com/kuhl-haus/kuhl-haus-mdp/issues/53
           Feature: tracke high-of-day and low-of-day prices.
           The high and low in the quote data is from the 1-second aggregate message, not the day.
           They are commented out until this feature is live.
        <div class="quote-kv"><span class="quote-k">High</span><span class="quote-v">${{ fmt(quoteData.high, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Low</span><span class="quote-v">${{ fmt(quoteData.low, 2) }}</span></div>
-->
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
        <div class="quote-kv"><span class="quote-k">Open</span><span class="quote-v">${{ fmt(quoteData.prev_day_open, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">High</span><span class="quote-v">${{ fmt(quoteData.prev_day_high, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Low</span><span class="quote-v">${{ fmt(quoteData.prev_day_low, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Close</span><span class="quote-v">${{ fmt(quoteData.prev_day_close, 2) }}</span></div>
        <div class="quote-kv"><span class="quote-k">Volume</span><span class="quote-v">{{ fmtVol(quoteData.prev_day_volume) }}</span></div>
        <div class="quote-kv"><span class="quote-k">VWAP</span><span class="quote-v">${{ fmt(quoteData.prev_day_vwap, 2) }}</span></div>
      </div>

      <!-- Freshness -->
      <div class="quote-freshness">
        As of {{ dataAge }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useWidgetBus, getFlameVariant, getFlameTooltip } from '@/composables/useWidgetBus.js'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig }          from '@/composables/useConfig.js'

const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

defineEmits(['update-settings'])

const { config: appConfig } = useConfig()
const { activeTickers, setActiveTicker } = useWidgetBus()

// ── Flame freshness icon ──────────────────────────────────────────────────────
const FLAME_SRCS = {
  red:    new URL('@/assets/icons/flame-red.svg',    import.meta.url).href,
  orange: new URL('@/assets/icons/flame-orange.svg', import.meta.url).href,
  yellow: new URL('@/assets/icons/flame-yellow.svg', import.meta.url).href,
  white:  new URL('@/assets/icons/flame-white.svg',  import.meta.url).href,
  blue:   new URL('@/assets/icons/flame-blue.svg',   import.meta.url).href,
  dark:   new URL('@/assets/icons/flame-dark.svg',   import.meta.url).href,
}
const quoteFlame = computed(() => {
  if (!activeTicker.value) return null
  const variant = getFlameVariant(activeTicker.value)
  if (!variant) return null
  return { src: FLAME_SRCS[variant], tooltip: getFlameTooltip(activeTicker.value) }
})

// Manual entry — not persisted, ephemeral
const inputTicker = ref('')

// Active ticker: widget bus takes precedence when linked; manual entry otherwise
// Widget bus updates reset manual input; manual entry overrides bus for that ticker
const busTicker = computed(() =>
  props.linkColor ? (activeTickers[props.linkColor] || null) : null
)
const manualTicker = ref('')
const activeTicker = computed(() => busTicker.value || manualTicker.value || null)

const applyInput = () => {
  const t = inputTicker.value.trim().toUpperCase()
  if (!t) return
  manualTicker.value = t
  inputTicker.value = ''
  // Broadcast to widget bus so linked widgets (news feed, etc.) also update
  if (props.linkColor) {
    setActiveTicker(props.linkColor, t)
  }
}

// When bus fires, clear manual override so bus drives
watch(busTicker, (t) => {
  if (t) manualTicker.value = ''
})

// Quote data
const quoteData = ref(null)
const lastDataAt = ref(null)

// WebSocket client — always-on connection, swap feed on ticker change
const currentFeed = ref('')

const { feedName, cacheKey, isConnected, reconnecting, getCache, subscribe, unsubscribe } = useWebSocketClient({
  wsUrl: appConfig.value?.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.value?.apiKey || 'secret',
  feedName: '',
  cacheKey: '',
  onData: (data) => {
    // Only accept data for the current ticker
    if (!data || (data.symbol && data.symbol !== activeTicker.value)) return
    quoteData.value = data
    lastDataAt.value = Date.now()
  },
  autoConnect: true,
})

// Switch subscription whenever activeTicker changes
watch(activeTicker, (newTicker, oldTicker) => {
  // Unsubscribe previous feed
  if (currentFeed.value) {
    feedName.value = currentFeed.value
    cacheKey.value = ''
    unsubscribe()
    currentFeed.value = ''
  }
  quoteData.value = null
  if (newTicker) {
    const feed = `quote:${newTicker}`
    feedName.value = feed
    cacheKey.value = feed
    currentFeed.value = feed
    if (isConnected.value) {
      subscribe()
      getCache()  // immediately fetch cached data (3-day TTL)
    }
  }
})

// When connection is established and we have a pending ticker, subscribe + fetch cache
watch(isConnected, (connected) => {
  if (connected && currentFeed.value) {
    feedName.value = currentFeed.value
    cacheKey.value = currentFeed.value
    subscribe()
    getCache()
  }
})

// Freshness display — end_timestamp from the agg event (Unix milliseconds)
const dataAge = computed(() => {
  const ts = quoteData.value?.end_timestamp
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
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
  font-size: 14px;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Ticker input */
.quote-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}
.quote-input {
  flex: 1;
  background: #121212;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  padding: 4px 8px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  outline: none;
}
.quote-input:focus { border-color: #8b5cf6; }
.quote-input::placeholder { color: #444; text-transform: none; }
.quote-go-btn {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  padding: 4px 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.quote-go-btn:hover { background: #3d3d3d; }

/* Empty states */
.quote-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #555;
  text-align: center;
  padding: 16px;
}
.quote-empty-icon { font-size: 28px; }
.quote-empty-text { font-size: 12px; line-height: 1.5; max-width: 200px; }

/* Quote body */
.quote-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quote-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 6px;
}
.quote-symbol { font-size: 18px; font-weight: 700; color: #fff; }
.quote-price  { font-size: 20px; font-weight: 600; font-family: 'Courier New', monospace; color: #fff; }
.quote-change { font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace; }
.quote-flame-icon { width: 14px; height: 14px; vertical-align: middle; margin-left: 4px; position: relative; top: -2px; }

.quote-from-open { font-size: 14px; color: #aaa; }
.quote-intraday  { font-weight: 600; }

.quote-section-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-top: 2px;
}

.quote-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
}
.quote-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #1a1a1a;
}
.quote-k { color: #aaa; font-size: 15px; }
.quote-v { font-family: 'Courier New', monospace; font-size: 15px; color: #e0e0e0; }

.positive { color: #4ade80; }
.negative { color: #f87171; }
.extreme  { color: #f97316; font-weight: 700; }
.high     { color: #eab308; font-weight: 600; }
.medium   { color: #a3a3a3; }

.quote-freshness {
  margin-top: auto;
  padding-top: 6px;
  font-size: 13px;
  color: #888;
  text-align: right;
}
</style>
