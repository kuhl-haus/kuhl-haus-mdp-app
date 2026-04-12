<template>
  <div class="eqv2-widget">
    <!-- Ticker input bar — always visible -->
    <div class="eqv2-controls">
      <input
        v-model="inputTicker"
        class="eqv2-input"
        placeholder="Enter ticker (e.g. AAPL)"
        maxlength="10"
        spellcheck="false"
        @keyup.enter="applyInput"
        @keyup.escape="inputTicker = ''"
      />
      <button class="eqv2-go-btn" @click="applyInput" @touchend.prevent="applyInput" title="Load quote">Go</button>
    </div>

    <!-- No ticker yet -->
    <div v-if="!activeTicker" class="eqv2-empty">
      <span class="eqv2-empty-icon">⚡</span>
      <span class="eqv2-empty-text">Enter a ticker above, or link to a scanner and click a row</span>
    </div>

    <!-- Ticker set, waiting for data -->
    <div v-else-if="!quoteData" class="eqv2-empty">
      <span class="eqv2-empty-icon">⏳</span>
      <span class="eqv2-empty-text">Waiting for data for <strong>{{ activeTicker }}</strong>...</span>
    </div>

    <!-- Quote data available -->
    <div v-else class="eqv2-body">
      <!-- Price Hero -->
      <div class="eqv2-hero">
        <div class="eqv2-hero-left">
          <div class="eqv2-hero-identity">
            <img
              v-if="activeTicker && !logoError"
              :src="`/api/market_data/logo/${activeTicker}`"
              class="eqv2-hero-logo"
              :alt="companyData.name || activeTicker"
              @error="logoError = true"
            />
            <span class="eqv2-symbol">{{ quoteData.symbol }}</span>
            <img v-if="quoteFlame" :src="quoteFlame.src" :title="quoteFlame.tooltip" class="eqv2-flame-icon" />
          </div>
          <div v-if="companyData.name || companyData.sic_description" class="eqv2-hero-company">
            <span v-if="companyData.name" class="eqv2-hero-company-name">{{ companyData.name }}</span>
            <span v-if="companyData.sic_description" class="eqv2-hero-sic"> · {{ companyData.sic_description }}</span>
          </div>
        </div>
        <div class="eqv2-hero-right">
          <span class="eqv2-price">${{ fmt(quoteData.close, 2) }}</span>
          <span :class="['eqv2-change-badge', changeClass]">
            {{ quoteData.change >= 0 ? '+' : '' }}{{ fmt(quoteData.change, 2) }}
            ({{ quoteData.pct_change >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change, 2) }}%)
          </span>
          <div class="eqv2-since-open">
            since open
            <span :class="quoteData.pct_change_since_open >= 0 ? 'eqv2-pos' : 'eqv2-neg'">
              {{ quoteData.pct_change_since_open >= 0 ? '+' : '' }}{{ fmt(quoteData.pct_change_since_open, 2) }}%
              <span v-if="quoteData.change_since_open != null">
                ({{ quoteData.change_since_open >= 0 ? '+' : '-' }}${{ fmt(Math.abs(quoteData.change_since_open), 2) }})
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Adaptive sections: flex columns at wide/full, single col at narrow -->
      <div class="eqv2-sections">
        <!-- Col 1: Session H/L, Today, Volume (narrow: all cards stack here) -->
        <div class="eqv2-col eqv2-col-1">
          <!-- Session H/L card — chip style at all widths -->
          <div class="eqv2-card eqv2-session-card">
            <div class="eqv2-card-label">Session H/L</div>
            <div class="eqv2-session-chips">
              <div class="eqv2-session-chip">
                <span class="eqv2-chip-label">PRE</span>
                <div v-if="quoteData.pre_market_high != null || quoteData.pre_market_low != null" class="eqv2-session-chip-vals">
                  <span>H: ${{ fmt(quoteData.pre_market_high, 2) }}</span>
                  <span>L: ${{ fmt(quoteData.pre_market_low, 2) }}</span>
                </div>
                <div v-else class="eqv2-session-chip-vals eqv2-muted-val">—</div>
              </div>
              <div class="eqv2-session-chip">
                <span class="eqv2-chip-label">REG</span>
                <div v-if="quoteData.regular_session_high != null || quoteData.regular_session_low != null" class="eqv2-session-chip-vals">
                  <span>H: ${{ fmt(quoteData.regular_session_high, 2) }}</span>
                  <span>L: ${{ fmt(quoteData.regular_session_low, 2) }}</span>
                </div>
                <div v-else class="eqv2-session-chip-vals eqv2-muted-val">—</div>
              </div>
              <div class="eqv2-session-chip">
                <span class="eqv2-chip-label">AH</span>
                <div v-if="quoteData.after_hours_high != null || quoteData.after_hours_low != null" class="eqv2-session-chip-vals">
                  <span>H: ${{ fmt(quoteData.after_hours_high, 2) }}</span>
                  <span>L: ${{ fmt(quoteData.after_hours_low, 2) }}</span>
                </div>
                <div v-else class="eqv2-session-chip-vals eqv2-muted-val">—</div>
              </div>
            </div>
          </div>

          <!-- Today card -->
          <div class="eqv2-card eqv2-today-card">
            <div class="eqv2-card-label">Today</div>
            <div class="eqv2-kv-list">
              <div class="eqv2-kv"><span class="eqv2-k">Open</span><span class="eqv2-v">${{ fmt(quoteData.official_open_price, 2) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">VWAP</span><span class="eqv2-v">${{ fmt(quoteData.aggregate_vwap, 2) }}</span></div>
            </div>
          </div>

          <!-- Volume card -->
          <div class="eqv2-card eqv2-volume-card">
            <div class="eqv2-card-label">Volume</div>
            <div class="eqv2-kv-list">
              <div class="eqv2-kv"><span class="eqv2-k">Volume</span><span class="eqv2-v">{{ fmtVol(quoteData.accumulated_volume) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Avg Vol</span><span class="eqv2-v">{{ fmtVol(quoteData.avg_volume) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Float</span><span class="eqv2-v">{{ fmtVol(floatShares) }}</span></div>
            </div>
            <!-- Relative Volume bar -->
            <div class="eqv2-rv-row">
              <span class="eqv2-k">Rel. Vol</span>
              <div class="eqv2-rv-bar-wrap">
                <div class="eqv2-rv-bar" :style="{ width: rvBarWidth, background: rvBarColor }"></div>
              </div>
              <span :class="['eqv2-rv-val', relVolClass]">{{ fmt(quoteData.relative_volume, 2) }}x</span>
            </div>
          </div>

          <!-- Narrow-only: Short Interest (in col-1 when single column) -->
          <div class="eqv2-card eqv2-short-card eqv2-narrow-only">
            <div class="eqv2-card-label">Short Interest</div>
            <div v-if="shortInterestLoading" class="eqv2-muted-msg">Short interest data loading...</div>
            <div v-else-if="allShortNull" class="eqv2-muted-msg">Short interest data unavailable</div>
            <div v-else class="eqv2-kv-list">
              <div class="eqv2-kv"><span class="eqv2-k">Short Int.</span><span class="eqv2-v">{{ fmtVol(shortInterestData.short_interest) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Days to Cover</span><span class="eqv2-v">{{ fmt(shortInterestData.days_to_cover, 1) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Short Vol Ratio</span><span class="eqv2-v">{{ fmt(shortInterestData.short_volume_ratio, 1) }}%</span></div>
            </div>
          </div>

          <!-- Narrow-only: Company card -->
          <div class="eqv2-card eqv2-company-card eqv2-narrow-only">
            <div class="eqv2-card-label">Company</div>
            <div v-if="companyLoading" class="eqv2-muted-msg">Company data loading...</div>
            <div v-else-if="allCompanyNull" class="eqv2-muted-msg">Company data unavailable</div>
            <div v-else>
              <div class="eqv2-kv-list">
                <div v-if="companyData.homepage_url" class="eqv2-kv">
                  <span class="eqv2-k">Web</span>
                  <a :href="companyData.homepage_url" target="_blank" rel="noopener noreferrer" class="eqv2-link">{{ truncateUrl(companyData.homepage_url) }}</a>
                </div>
                <div class="eqv2-kv"><span class="eqv2-k">Exchange</span><span class="eqv2-v">{{ companyData.primary_exchange || '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Mkt Cap</span><span class="eqv2-v">{{ companyData.market_cap != null ? '$' + fmtVol(companyData.market_cap) : '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Employees</span><span class="eqv2-v">{{ companyData.total_employees != null ? fmtVol(companyData.total_employees) : '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Listed</span><span class="eqv2-v">{{ companyData.list_date || '—' }}</span></div>
              </div>
              <div v-if="companyData.description" class="eqv2-company-desc-wrap">
                <span class="eqv2-company-desc-text">
                  {{ descExpanded ? companyData.description : truncateDesc(companyData.description) }}
                </span>
                <span v-if="!descExpanded && truncateDesc(companyData.description) !== companyData.description">
                  <span class="eqv2-company-desc-ellipsis">… </span>
                  <button class="eqv2-see-more" @click="descExpanded = true">see more</button>
                </span>
                <button v-if="descExpanded" class="eqv2-see-more" @click="descExpanded = false"> less</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 2: Short Interest + Company (wide/full mode) -->
        <div class="eqv2-col eqv2-col-2">
          <!-- Short Interest -->
          <div class="eqv2-card eqv2-short-card">
            <div class="eqv2-card-label">Short Interest</div>
            <div v-if="shortInterestLoading" class="eqv2-muted-msg">Short interest data loading...</div>
            <div v-else-if="allShortNull" class="eqv2-muted-msg">Short interest data unavailable</div>
            <div v-else class="eqv2-kv-list">
              <div class="eqv2-kv"><span class="eqv2-k">Short Int.</span><span class="eqv2-v">{{ fmtVol(shortInterestData.short_interest) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Days to Cover</span><span class="eqv2-v">{{ fmt(shortInterestData.days_to_cover, 1) }}</span></div>
              <div class="eqv2-kv"><span class="eqv2-k">Short Vol Ratio</span><span class="eqv2-v">{{ fmt(shortInterestData.short_volume_ratio, 1) }}%</span></div>
            </div>
          </div>

          <!-- Company card -->
          <div class="eqv2-card eqv2-company-card">
            <div class="eqv2-card-label">Company</div>
            <div v-if="companyLoading" class="eqv2-muted-msg">Company data loading...</div>
            <div v-else-if="allCompanyNull" class="eqv2-muted-msg">Company data unavailable</div>
            <div v-else>
              <div class="eqv2-kv-list">
                <div v-if="companyData.homepage_url" class="eqv2-kv">
                  <span class="eqv2-k">Web</span>
                  <a :href="companyData.homepage_url" target="_blank" rel="noopener noreferrer" class="eqv2-link">{{ truncateUrl(companyData.homepage_url) }}</a>
                </div>
                <div class="eqv2-kv"><span class="eqv2-k">Exchange</span><span class="eqv2-v">{{ companyData.primary_exchange || '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Mkt Cap</span><span class="eqv2-v">{{ companyData.market_cap != null ? '$' + fmtVol(companyData.market_cap) : '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Employees</span><span class="eqv2-v">{{ companyData.total_employees != null ? fmtVol(companyData.total_employees) : '—' }}</span></div>
                <div class="eqv2-kv"><span class="eqv2-k">Listed</span><span class="eqv2-v">{{ companyData.list_date || '—' }}</span></div>
              </div>
              <div v-if="companyData.description" class="eqv2-company-desc-wrap">
                <span class="eqv2-company-desc-text">
                  {{ descExpanded ? companyData.description : truncateDesc(companyData.description) }}
                </span>
                <span v-if="!descExpanded && truncateDesc(companyData.description) !== companyData.description">
                  <span class="eqv2-company-desc-ellipsis">… </span>
                  <button class="eqv2-see-more" @click="descExpanded = true">see more</button>
                </span>
                <button v-if="descExpanded" class="eqv2-see-more" @click="descExpanded = false"> less</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Previous Day: always full-width at bottom -->
        <div class="eqv2-prev-row">
          <div class="eqv2-card eqv2-prev-card">
            <div class="eqv2-card-label">Previous Day</div>
            <div class="eqv2-prev-chips">
              <div class="eqv2-chip"><span class="eqv2-chip-label">O</span><span class="eqv2-chip-val">${{ fmt(quoteData.prev_day_open, 2) }}</span></div>
              <div class="eqv2-chip"><span class="eqv2-chip-label">H</span><span class="eqv2-chip-val">${{ fmt(quoteData.prev_day_high, 2) }}</span></div>
              <div class="eqv2-chip"><span class="eqv2-chip-label">L</span><span class="eqv2-chip-val">${{ fmt(quoteData.prev_day_low, 2) }}</span></div>
              <div class="eqv2-chip"><span class="eqv2-chip-label">C</span><span class="eqv2-chip-val">${{ fmt(quoteData.prev_day_close, 2) }}</span></div>
              <div class="eqv2-chip"><span class="eqv2-chip-label">Vol</span><span class="eqv2-chip-val">{{ fmtVol(quoteData.prev_day_volume) }}</span></div>
              <div class="eqv2-chip"><span class="eqv2-chip-label">VWAP</span><span class="eqv2-chip-val">${{ fmt(quoteData.prev_day_vwap, 2) }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Splits -->
      <template v-if="quoteData.splits && quoteData.splits.length > 0">
        <div class="eqv2-card eqv2-splits-card">
          <div class="eqv2-card-label">Recent Splits</div>
          <div class="eqv2-splits">
            <div v-for="(split, i) in quoteData.splits" :key="i" class="eqv2-split-row">
              {{ split.split_to }}-for-{{ split.split_from }} on {{ split.execution_date }}
            </div>
          </div>
        </div>
      </template>

      <!-- Freshness -->
      <div class="eqv2-freshness">As of {{ dataAge }}</div>
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

// Logo error state — reset on ticker change
const logoError = ref(false)

// Company enrichment — fetched via REST on ticker change
const companyData = ref({})
const companyLoading = ref(false)
const descExpanded = ref(false)

const shortInterestData = ref({})
const shortInterestLoading = ref(false)

const fetchShortInterest = async (symbol) => {
  if (!symbol) return
  shortInterestLoading.value = true
  shortInterestData.value = {}
  try {
    const [siResp, svResp] = await Promise.all([
      fetch(`/api/market_data/short_interest/${symbol}`),
      fetch(`/api/market_data/short_volume/${symbol}`),
    ])
    const siJson = siResp.ok ? await siResp.json() : {}
    const svJson = svResp.ok ? await svResp.json() : {}
    shortInterestData.value = {
      short_interest: siJson.data?.short_interest ?? null,
      days_to_cover: siJson.data?.days_to_cover ?? null,
      short_volume_ratio: svJson.data?.short_volume_ratio ?? null,
    }
  } catch (e) {
    console.warn(`[EnhancedQuoteV2] short interest fetch failed for ${symbol}:`, e)
  } finally {
    shortInterestLoading.value = false
  }
}

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
    console.warn(`[EnhancedQuoteV2] company fetch failed for ${symbol}:`, e)
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
  shortInterestData.value = {}
  descExpanded.value = false
  logoError.value = false
  if (newTicker) {
    fetchCompany(newTicker)
    fetchShortInterest(newTicker)
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
  const d = shortInterestData.value
  if (!d) return true
  return d.short_interest == null &&
         d.days_to_cover == null &&
         d.short_volume_ratio == null
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

const truncateDesc = (text, maxLen = 50) => {
  if (!text || text.length <= maxLen) return text
  const cut = text.lastIndexOf(' ', maxLen)
  return cut > 0 ? text.slice(0, cut) : text.slice(0, maxLen)
}

// Relative volume bar
const rvBarWidth = computed(() => {
  const rv = parseFloat(quoteData.value?.relative_volume)
  if (!isFinite(rv)) return '0%'
  return `${Math.min((rv / 5) * 100, 100)}%`
})

const rvBarColor = computed(() => {
  const rv = parseFloat(quoteData.value?.relative_volume)
  if (!isFinite(rv)) return '#22c55e'
  if (rv >= 5) return '#dc2626'
  if (rv >= 3) return '#f97316'
  if (rv >= 2) return '#eab308'
  return '#22c55e'
})

defineExpose({ lastDataAt, isConnected, reconnecting, quoteData, manualTicker, companyData, companyLoading, shortInterestData, shortInterestLoading, logoError })
</script>

<style scoped>
/* ── CSS custom properties (Phantom Dark theme) ── */
.eqv2-widget {
  --bg: #0d0d12;
  --surface: #141420;
  --border: #1e1e2e;
  --text-primary: #e2e2f0;
  --text-muted: #5a5a7a;
  --accent: #7c3aed;
  --positive: #22c55e;
  --negative: #ef4444;

  container-type: inline-size;
  height: 100%;
  overflow-y: auto;
  background: var(--bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: system-ui, sans-serif;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Ticker input ── */
.eqv2-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}
.eqv2-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 4px 8px;
  font-family: 'Roboto Mono', monospace;
  text-transform: uppercase;
  outline: none;
}
.eqv2-input:focus { border-color: var(--accent); }
.eqv2-input::placeholder { color: var(--text-muted); text-transform: none; }
.eqv2-go-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 4px 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.eqv2-go-btn:hover { border-color: var(--accent); color: #fff; }

/* ── Empty / waiting states ── */
.eqv2-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px;
}
.eqv2-empty-icon { font-size: 28px; }
.eqv2-empty-text { font-size: 12px; line-height: 1.5; max-width: 200px; }

/* ── Quote body ── */
.eqv2-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Price Hero ── */
.eqv2-hero {
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.eqv2-hero-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.eqv2-hero-identity {
  display: flex;
  align-items: center;
  gap: 6px;
}

.eqv2-hero-logo {
  width: 22px;
  height: 22px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
  background: rgba(255,255,255,0.05);
}

.eqv2-hero-company {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eqv2-hero-company-name {
  color: var(--text-primary);
  font-weight: 500;
}

.eqv2-hero-sic {
  color: var(--text-muted);
}

.eqv2-hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.eqv2-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-family: system-ui, sans-serif;
}

.eqv2-price {
  font-size: 22px;
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
  color: #fff;
}

.eqv2-change-badge {
  font-size: 13px;
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
  padding: 2px 8px;
  border-radius: 12px;
  white-space: nowrap;
}
.eqv2-change-badge.positive {
  background: rgba(34, 197, 94, 0.2);
  color: var(--positive);
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.eqv2-change-badge.negative {
  background: rgba(239, 68, 68, 0.2);
  color: var(--negative);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.eqv2-since-open {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}
.eqv2-pos { color: var(--positive); font-weight: 600; }
.eqv2-neg { color: var(--negative); font-weight: 600; }

.eqv2-flame-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-left: 2px;
  position: relative;
  top: -2px;
}

/* ── Section cards ── */
.eqv2-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
}

.eqv2-card-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  padding-left: 6px;
  border-left: 3px solid var(--accent);
  margin-bottom: 6px;
  font-family: system-ui, sans-serif;
}

/* ── Key-value rows ── */
.eqv2-kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv2-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}
.eqv2-k {
  color: var(--text-muted);
  font-size: 12px;
  font-family: system-ui, sans-serif;
  flex-shrink: 0;
}
.eqv2-v {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
}
.eqv2-link {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
  text-align: right;
}
.eqv2-link:hover { text-decoration: underline; }

/* ── Company description see-more ── */
.eqv2-company-desc-wrap {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.eqv2-company-desc-text {
  font-size: 11px;
  color: var(--text-muted);
}
.eqv2-company-desc-ellipsis {
  color: var(--text-muted);
}
.eqv2-see-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  font-family: system-ui, sans-serif;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.eqv2-see-more:hover { opacity: 0.8; }

.eqv2-muted-msg {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
.eqv2-muted-val {
  color: var(--text-muted);
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
}

/* ── Session H/L chips (all widths) ── */
.eqv2-session-chips {
  display: flex;
  flex-direction: column;   /* narrow: stack vertically */
  gap: 6px;
}
.eqv2-session-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  gap: 2px;
  flex: 1;
}
.eqv2-session-chip-vals {
  display: flex;
  flex-direction: column;
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  gap: 1px;
}

/* ── Relative Volume bar ── */
.eqv2-rv-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}
.eqv2-rv-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}
.eqv2-rv-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.eqv2-rv-val {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}
.eqv2-rv-val.extreme { color: #dc2626; font-weight: 700; }
.eqv2-rv-val.high    { color: #f97316; font-weight: 600; }
.eqv2-rv-val.medium  { color: #eab308; }

/* ── Previous Day chips ── */
.eqv2-prev-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.eqv2-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  min-width: 48px;
  flex: 1;
}
.eqv2-chip-label {
  font-size: 9px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
  font-family: system-ui, sans-serif;
  letter-spacing: 0.06em;
}
.eqv2-chip-val {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
}

/* ── Splits ── */
.eqv2-splits {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv2-split-row {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  padding: 2px 0;
  border-bottom: 1px solid var(--border);
}

/* ── Freshness ── */
.eqv2-freshness {
  margin-top: auto;
  padding-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
  font-family: system-ui, sans-serif;
}

/* ── Sections: narrow (< 480px) — single flex column ── */
/* Breakpoint constants — must match BREAKPOINTS in PR C JS: WIDE=480, FULL=680 */
.eqv2-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eqv2-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Col-2 hidden at narrow; shown at WIDE+ */
.eqv2-col-2 { display: none; }

/* Previous Day always full width */
.eqv2-prev-row { width: 100%; }

/* In narrow mode, show Short + Company inside col-1 via .eqv2-narrow-only */
/* At wide+, hide .eqv2-narrow-only; col-2 takes over */
.eqv2-narrow-only { display: flex; flex-direction: column; }

/* ── WIDE mode (480px+): two flex columns ── */
@container (min-width: 480px) {   /* BREAKPOINTS.WIDE */
  .eqv2-symbol { font-size: 20px; }
  .eqv2-price  { font-size: 26px; }

  /* Session chips go horizontal */
  .eqv2-session-chips { flex-direction: row; }

  /* Two-column flex layout */
  .eqv2-sections {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .eqv2-col-1 { flex: 1; }
  .eqv2-col-2 { display: flex; flex: 1; }
  .eqv2-prev-row { flex-basis: 100%; }

  /* Hide narrow-only duplicates */
  .eqv2-narrow-only { display: none !important; }
}

/* ── FULL mode (680px+): three columns — col-2 splits into today+short / company ── */
/* Note: with two columns, company is already in col-2. At full width col-2 is wide */
/* enough that it doesn't need a third column split — keep 2-col but allow more room */
@container (min-width: 680px) {   /* BREAKPOINTS.FULL */
  .eqv2-symbol { font-size: 22px; }
  .eqv2-price  { font-size: 30px; }
}
</style>
