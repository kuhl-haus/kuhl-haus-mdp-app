<template>
  <div class="eq-widget">
    <!-- Ticker input bar — always visible -->
    <div class="eq-controls">
      <input
        v-model="inputTicker"
        class="eq-input"
        placeholder="Enter ticker (e.g. AAPL)"
        maxlength="10"
        spellcheck="false"
        @keyup.enter="applyInput"
        @keyup.escape="inputTicker = ''"
      />
      <button class="eq-go-btn" @click="applyInput" @touchend.prevent="applyInput" title="Load quote">Go</button>
    </div>

    <!-- No ticker yet -->
    <div v-if="!activeTicker" class="eq-empty">
      <span class="eq-empty-icon">⚡</span>
      <span class="eq-empty-text">Enter a ticker above, or link to a scanner and click a row</span>
    </div>

    <!-- Ticker set, waiting for data -->
    <div v-else-if="!quoteData" class="eq-empty">
      <span class="eq-empty-icon">⏳</span>
      <span class="eq-empty-text">Waiting for data for <strong>{{ activeTicker }}</strong>...</span>
    </div>

    <!-- Quote data available -->
    <div v-else class="eq-body">
      <!-- Header: symbol + price + change -->
      <div class="eq-header">
        <div class="eq-symbol">
          {{ quoteData.symbol }}
          <img v-if="quoteFlame" :src="quoteFlame.src" :title="quoteFlame.tooltip" class="eq-flame-icon" />
        </div>
        <div class="eq-price">${{ fmt(quoteData.close, 2) }}</div>
        <div :class="['eq-change', changeClass]">
          {{ quoteData.change >= 0 ? '+' : '' }}{{ fmt(quoteData.change, 2) }}
          ({{ quoteData.pct_change >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change, 2) }}%)
        </div>
      </div>

      <!-- From open -->
      <div class="eq-from-open">
        Since open:
        <span :class="['eq-intraday', quoteData.pct_change_since_open >= 0 ? 'positive' : 'negative']">
          {{ quoteData.pct_change_since_open >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change_since_open, 2) }}%
          ({{ quoteData.change_since_open >= 0 ? '+' : '' }}${{ fmt(quoteData.change_since_open, 2) }})
        </span>
      </div>

      <!-- Company — populated via REST /api/market_data/company/{symbol} -->
      <div class="eq-section-label">Company</div>
      <div v-if="companyLoading" class="eq-company-loading">Company data loading...</div>
      <div v-else-if="allCompanyNull" class="eq-company-loading">Company data unavailable</div>
      <div v-else class="eq-grid eq-grid--full">
        <div class="eq-kv"><span class="eq-k">Name</span><span class="eq-v">{{ companyData.name || '—' }}</span></div>
        <div class="eq-kv"><span class="eq-k">Exchange</span><span class="eq-v">{{ companyData.primary_exchange || '—' }}</span></div>
        <div class="eq-kv"><span class="eq-k">Sector</span><span class="eq-v">{{ companyData.sic_description || '—' }}</span></div>
        <div class="eq-kv"><span class="eq-k">Market Cap</span><span class="eq-v">{{ companyData.market_cap != null ? '$' + fmtVol(companyData.market_cap) : '—' }}</span></div>
        <div class="eq-kv"><span class="eq-k">Employees</span><span class="eq-v">{{ companyData.total_employees != null ? fmtVol(companyData.total_employees) : '—' }}</span></div>
        <div class="eq-kv"><span class="eq-k">Listed</span><span class="eq-v">{{ companyData.list_date || '—' }}</span></div>
        <div v-if="companyData.homepage_url" class="eq-kv eq-kv--full">
          <span class="eq-k">Website</span>
          <a :href="companyData.homepage_url" target="_blank" rel="noopener noreferrer" class="eq-link">{{ truncateUrl(companyData.homepage_url) }}</a>
        </div>
        <div v-else class="eq-kv"><span class="eq-k">Website</span><span class="eq-v">—</span></div>
      </div>

      <!-- Today -->
      <div class="eq-section-label">Today</div>
      <div class="eq-grid">
        <div class="eq-kv"><span class="eq-k">Open</span><span class="eq-v">${{ fmt(quoteData.official_open_price, 2) }}</span></div>
        <div class="eq-kv"><span class="eq-k">VWAP</span><span class="eq-v">${{ fmt(quoteData.aggregate_vwap, 2) }}</span></div>
      </div>

      <!-- Session H/L -->
      <div class="eq-section-label">Session H/L</div>
      <div class="eq-session-hl">
        <div class="eq-session-row">
          <span class="eq-session-label">Pre-Market</span>
          <span class="eq-session-val">
            <span v-if="quoteData.pre_market_high != null || quoteData.pre_market_low != null">
              H: ${{ fmt(quoteData.pre_market_high, 2) }}&nbsp;&nbsp;L: ${{ fmt(quoteData.pre_market_low, 2) }}
            </span>
            <span v-else>—</span>
          </span>
        </div>
        <div class="eq-session-row">
          <span class="eq-session-label">Regular</span>
          <span class="eq-session-val">
            <span v-if="quoteData.regular_session_high != null || quoteData.regular_session_low != null">
              H: ${{ fmt(quoteData.regular_session_high, 2) }}&nbsp;&nbsp;L: ${{ fmt(quoteData.regular_session_low, 2) }}
            </span>
            <span v-else>—</span>
          </span>
        </div>
        <div class="eq-session-row">
          <span class="eq-session-label">After-Hours</span>
          <span class="eq-session-val">
            <span v-if="quoteData.after_hours_high != null || quoteData.after_hours_low != null">
              H: ${{ fmt(quoteData.after_hours_high, 2) }}&nbsp;&nbsp;L: ${{ fmt(quoteData.after_hours_low, 2) }}
            </span>
            <span v-else>—</span>
          </span>
        </div>
      </div>
      
      <!-- Short Interest -->
      <div class="eq-section-label">Short Interest</div>
      <div v-if="allShortNull" class="eq-short-loading">Short interest data loading...</div>
      <div v-else class="eq-grid">
        <div class="eq-kv"><span class="eq-k">Short Int.</span><span class="eq-v">{{ fmtVol(quoteData.short_interest) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Days to Cover</span><span class="eq-v">{{ fmt(quoteData.days_to_cover, 1) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Short Vol Ratio</span><span class="eq-v">{{ fmt(quoteData.short_volume_ratio, 1) }}%</span></div>
      </div>

      <!-- Volume -->
      <div class="eq-section-label">Volume</div>
      <div class="eq-grid">
        <div class="eq-kv"><span class="eq-k">Volume</span><span class="eq-v">{{ fmtVol(quoteData.accumulated_volume) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Rel. Vol</span><span :class="['eq-v', relVolClass]">{{ fmt(quoteData.relative_volume, 2) }}x</span></div>
        <div class="eq-kv"><span class="eq-k">Avg Vol</span><span class="eq-v">{{ fmtVol(quoteData.avg_volume) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Float</span><span class="eq-v">{{ fmtVol(floatShares) }}</span></div>
      </div>


      <!-- Previous Day -->
      <div class="eq-section-label">Previous Day</div>
      <div class="eq-grid">
        <div class="eq-kv"><span class="eq-k">Open</span><span class="eq-v">${{ fmt(quoteData.prev_day_open, 2) }}</span></div>
        <div class="eq-kv"><span class="eq-k">High</span><span class="eq-v">${{ fmt(quoteData.prev_day_high, 2) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Low</span><span class="eq-v">${{ fmt(quoteData.prev_day_low, 2) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Close</span><span class="eq-v">${{ fmt(quoteData.prev_day_close, 2) }}</span></div>
        <div class="eq-kv"><span class="eq-k">Volume</span><span class="eq-v">{{ fmtVol(quoteData.prev_day_volume) }}</span></div>
        <div class="eq-kv"><span class="eq-k">VWAP</span><span class="eq-v">${{ fmt(quoteData.prev_day_vwap, 2) }}</span></div>
      </div>

      <!-- Splits -->
      <template v-if="quoteData.splits && quoteData.splits.length > 0">
        <div class="eq-section-label">Recent Splits</div>
        <div class="eq-splits">
          <div v-for="(split, i) in quoteData.splits" :key="i" class="eq-split-row">
            {{ split.split_to }}-for-{{ split.split_from }} on {{ split.execution_date }}
          </div>
        </div>
      </template>

      <!-- Freshness -->
      <div class="eq-freshness">
        As of {{ dataAge }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWidgetBus, getFlameVariant, getFlameTooltip } from '@/composables/useWidgetBus.js'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

defineEmits(['update-settings'])

const appConfig = window.__APP_CONFIG__ || {}
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
  // Broadcast to widget bus so linked widgets also update
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

// Company enrichment — fetched via REST on ticker change
const companyData = ref({})
const companyLoading = ref(false)

const fetchCompany = async (symbol) => {
  if (!symbol) return
  companyLoading.value = true
  companyData.value = {}
  try {
    const resp = await fetch(`/api/market_data/company/${symbol}`)
    if (resp.ok) {
      const json = await resp.json()
      companyData.value = json.data || {}
    }
  } catch (e) {
    // Network error — leave companyData empty, UI shows unavailable
    console.warn(`[EnhancedQuote] company fetch failed for ${symbol}:`, e)
  } finally {
    companyLoading.value = false
  }
}

// WebSocket client — always-on connection, swap feed on ticker change
const currentFeed = ref('')

const { feedName, cacheKey, isConnected, reconnecting, getCache, subscribe, unsubscribe } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: '',
  cacheKey: '',
  onData: (data) => {
    if (!data || (data.symbol && data.symbol !== activeTicker.value)) return
    quoteData.value = data
    lastDataAt.value = Date.now()
  },
  autoConnect: true,
})

// Switch subscription whenever activeTicker changes
watch(activeTicker, (newTicker) => {
  if (currentFeed.value) {
    feedName.value = currentFeed.value
    cacheKey.value = ''
    unsubscribe()
    currentFeed.value = ''
  }
  quoteData.value = null
  companyData.value = {}
  if (newTicker) {
    fetchCompany(newTicker)
    const feed = `daily_range:${newTicker}`
    feedName.value = feed
    cacheKey.value = feed
    currentFeed.value = feed
    if (isConnected.value) {
      subscribe()
      getCache()
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

// Freshness display
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

// Float shares: prefer free_float, fall back to share_class_shares_outstanding
const floatShares = computed(() => {
  if (!quoteData.value) return null
  return quoteData.value.free_float ?? quoteData.value.share_class_shares_outstanding ?? null
})

// Short interest: null if all three fields are null
const allShortNull = computed(() => {
  if (!quoteData.value) return true
  return quoteData.value.short_interest == null &&
         quoteData.value.days_to_cover == null &&
         quoteData.value.short_volume_ratio == null
})

// Company: null if all company fields are null
const allCompanyNull = computed(() => {
  const d = companyData.value
  if (!d) return true
  return d.name == null &&
         d.primary_exchange == null &&
         d.sic_description == null &&
         d.market_cap == null &&
         d.total_employees == null &&
         d.list_date == null &&
         d.homepage_url == null
})

const truncateUrl = (url) => {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)
}

defineExpose({ lastDataAt, isConnected, reconnecting, quoteData, manualTicker, companyData, companyLoading })
</script>

<style scoped>
.eq-widget {
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
.eq-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}
.eq-input {
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
.eq-input:focus { border-color: #8b5cf6; }
.eq-input::placeholder { color: #444; text-transform: none; }
.eq-go-btn {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  padding: 4px 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.eq-go-btn:hover { background: #3d3d3d; }

/* Empty states */
.eq-empty {
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
.eq-empty-icon { font-size: 28px; }
.eq-empty-text { font-size: 12px; line-height: 1.5; max-width: 200px; }

/* Quote body */
.eq-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eq-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 6px;
}
.eq-symbol { font-size: 18px; font-weight: 700; color: #fff; }
.eq-price  { font-size: 20px; font-weight: 600; font-family: 'Courier New', monospace; color: #fff; }
.eq-change { font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace; }
.eq-flame-icon { width: 14px; height: 14px; vertical-align: middle; margin-left: 4px; position: relative; top: -2px; }

.eq-from-open { font-size: 14px; color: #aaa; }
.eq-intraday  { font-weight: 600; }

.eq-section-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-top: 2px;
}

/* Session H/L */
.eq-session-hl {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eq-session-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #1a1a1a;
  font-size: 14px;
}
.eq-session-label { color: #aaa; }
.eq-session-val { font-family: 'Courier New', monospace; color: #e0e0e0; }

.eq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
}
.eq-grid--full {
  grid-template-columns: 1fr;
}
.eq-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #1a1a1a;
}
.eq-kv--full { grid-column: 1 / -1; }
.eq-k { color: #aaa; font-size: 15px; }
.eq-v { font-family: 'Courier New', monospace; font-size: 15px; color: #e0e0e0; }

.eq-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #8b5cf6;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.eq-link:hover { text-decoration: underline; }

.eq-short-loading,
.eq-company-loading {
  font-size: 12px;
  color: #555;
  font-style: italic;
  padding: 2px 0;
}

/* Splits */
.eq-splits {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eq-split-row {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #e0e0e0;
  padding: 2px 0;
  border-bottom: 1px solid #1a1a1a;
}

.positive { color: #4ade80; }
.negative { color: #f87171; }
.extreme  { color: #f97316; font-weight: 700; }
.high     { color: #eab308; font-weight: 600; }
.medium   { color: #a3a3a3; }

.eq-freshness {
  margin-top: auto;
  padding-top: 6px;
  font-size: 13px;
  color: #888;
  text-align: right;
}
</style>
