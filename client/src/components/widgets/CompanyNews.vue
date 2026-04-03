<template>
  <div class="company-news-widget">

    <!-- Ticker input bar -->
    <div class="cn-input-bar">
      <input
        v-model="inputTicker"
        class="cn-input"
        placeholder="Enter ticker (e.g. AAPL)"
        maxlength="6"
        spellcheck="false"
        autocomplete="off"
        @keyup.enter="applyInput"
        @keyup.escape="inputTicker = ''"
      />
      <button class="cn-go-btn" @click="applyInput" @touchend.prevent="applyInput" title="Load news">Go</button>
    </div>

    <!-- No ticker yet -->
    <div v-if="!activeTicker" class="cn-empty">
      <div class="cn-empty-icon">🗞️</div>
      <span class="cn-empty-text">Enter a ticker above, or link to a scanner and click a row</span>
    </div>

    <!-- Waiting for data -->
    <div v-else-if="activeTicker && newsItems.length === 0" class="cn-empty">
      <div class="cn-empty-icon">🗞️</div>
      <span class="cn-empty-text">Waiting for news for <strong>{{ activeTicker }}</strong>…</span>
    </div>

    <template v-else>
      <!-- Controls -->
      <div class="news-controls">
        <!-- Search -->
        <input
          v-model.trim="searchQuery"
          type="search"
          placeholder="Search headlines…"
          class="search-input"
          @keydown.escape="searchQuery = ''"
        />

        <!-- Article count -->
        <span class="article-count">
          <template v-if="filteredNews.length !== newsItems.length">
            {{ filteredNews.length }} / {{ newsItems.length }}
          </template>
          <template v-else>
            {{ newsItems.length }}
          </template>
        </span>

        <!-- Max articles selector -->
        <select v-model.number="maxArticles" class="max-articles-select" title="Max articles loaded">
          <option v-for="n in MAX_ARTICLES_OPTIONS" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>

      <!-- Mobile: card list -->
      <div v-if="isMobile" class="news-card-list">
        <div
          v-for="(item, idx) in filteredNews"
          :key="idx"
          class="news-card"
          @click="openDetail(item)"
        >
          <div class="news-card-header">
            <span class="news-card-time">{{ formatTime(item.publishDate) }}</span>
            <span v-for="co in usCompanies(item)" :key="co.ticker" class="ticker-tag">{{ co.ticker }}</span>
          </div>
          <div class="news-card-title">
            <span :class="['sentiment-dot', sentimentClass(item.sentiment)]" :title="item.sentiment"></span>
            {{ item.title }}<span v-if="item.source" class="headline-source"> — {{ shortSource(item.source) }}</span>
          </div>
        </div>
        <div v-if="filteredNews.length === 0" class="news-empty">
          No articles match the current filter.
        </div>
      </div>

      <!-- Desktop: virtual scroller -->
      <div v-else class="news-table-wrap">
        <!-- Sticky sort header -->
        <div class="vs-header" :style="tableStyle">
          <div
            v-for="col in columns"
            :key="col.key"
            :class="['vs-th', 'col-' + col.key, sortKey === col.key ? 'col-sorted' : '']"
            :style="{ width: colWidthsPx[col.key], cursor: col.sortable ? 'pointer' : 'default' }"
            @click="col.sortable && cycleSort(col.key)"
            :title="col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'Sort descending' : 'Sort ascending') : 'Sort by ' + col.label) : ''"
          >
            {{ col.label }}<span v-if="sortKey === col.key" class="sort-indicator">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filteredNews.length === 0" class="news-empty">
          No articles match the current filter.
        </div>

        <!-- Virtual scroll list -->
        <RecycleScroller
          v-else
          class="vs-scroller"
          :items="filteredNews"
          :item-size="22"
          key-field="link"
          v-slot="{ item }"
        >
          <div class="vs-row" :style="tableStyle" @click="openDetail(item)">
            <div class="vs-td col-time">{{ formatTime(item.publishDate) }}</div>
            <div class="vs-td col-title">
              <span
                :class="['sentiment-dot', sentimentClass(item.sentiment)]"
                :title="item.sentiment"
              ></span>
              <span class="vs-headline">{{ item.title }}<span v-if="item.source" class="headline-source"> — {{ shortSource(item.source) }}</span></span>
            <span v-for="co in usCompanies(item)" :key="co.ticker" class="ticker-tag">{{ co.ticker }}</span>
            </div>
          </div>
        </RecycleScroller>
      </div>
    </template>

    <!-- Detail modal -->
    <Teleport to="body">
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
        <div class="modal-card">
          <button class="modal-close" @click="selected = null">✕</button>

          <div v-if="selected.images && selected.images.length" class="modal-images">
            <img
              v-for="(img, i) in selected.images.slice(0, 1)"
              :key="i"
              :src="img"
              class="modal-image"
              alt=""
              @error="$event.target.style.display='none'"
            />
          </div>

          <div class="modal-body">
            <div class="modal-meta">
              <span class="modal-time">{{ formatDateTime(selected.publishDate) }}</span>
              <a :href="selected.source ? 'https://' + selected.source : '#'" target="_blank" rel="noopener" class="modal-source">{{ selected.source }}</a>
              <span :class="['modal-sentiment', sentimentClass(selected.sentiment)]">{{ selected.sentiment }}</span>
            </div>

            <a :href="selected.link" target="_blank" rel="noopener" class="modal-title">{{ selected.title }}</a>

            <p v-if="selected.summary" class="modal-summary">{{ selected.summary }}</p>

            <div v-if="selected.companies && selected.companies.length" class="modal-companies">
              <div
                v-for="co in selected.companies"
                :key="co.companyId || co.ticker"
                class="modal-company"
              >
                <span class="ticker-tag">{{ co.ticker }}</span>
                <span class="company-name">{{ co.name }}</span>
                <span class="company-exchange">{{ co.primaryListing && co.primaryListing.exchangeCode }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
/**
 * CompanyNews widget — per-ticker news from news:ticker:{symbol} cache.
 *
 * Driven by manual ticker entry or widget bus (same pattern as Quote widget).
 * Subscribes to news:ticker:{symbol} and calls getCache() for immediate
 * historical data on symbol change.
 *
 * No tickers-only filter (all articles in the per-ticker cache are already
 * ticker-matched). No active-ticker filter pill (single-ticker view).
 *
 * @prop {string}  linkColor - Widget bus link color
 * @prop {boolean} isMobile  - Mobile layout mode
 * @prop {object}  settings  - Persisted settings { maxArticles }
 *
 * @emits update-settings    - Settings changed, payload: updated settings object
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWidgetBus } from '@/composables/useWidgetBus.js'
import { RecycleScroller } from 'vue-virtual-scroller'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})
const emit = defineEmits(['update-settings'])

const { activeTickers, setActiveTicker } = useWidgetBus()
const appConfig    = window.__APP_CONFIG__ || {}
const US_EXCHANGES = new Set(['XNYS', 'XNAS', 'XASE'])

// ── Ticker input & widget bus ─────────────────────────────────────────────────

const inputTicker  = ref('')
const manualTicker = ref('')

const busTicker = computed(() =>
  props.linkColor ? (activeTickers[props.linkColor] || null) : null
)
const activeTicker = computed(() => busTicker.value || manualTicker.value || null)

const applyInput = () => {
  const t = inputTicker.value.trim().toUpperCase()
  if (!t) return
  manualTicker.value = t
  inputTicker.value  = ''
  if (props.linkColor) setActiveTicker(props.linkColor, t)
}

// When bus fires, clear manual override
watch(busTicker, (t) => { if (t) manualTicker.value = '' })

// ── Column layout (fixed — no resize) ────────────────────────────────────────

const DEFAULT_WIDTHS = { time: 90, title: 0 }
const columns = [
  { key: 'time',  label: 'Time',     sortable: true },
  { key: 'title', label: 'Headline', sortable: true },
]

const sortKey = ref('time')
const sortDir = ref('desc')

const cycleSort = (colKey) => {
  if (sortKey.value === colKey) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = colKey
    sortDir.value = colKey === 'time' ? 'desc' : 'asc'
  }
}

const tableStyle  = computed(() => ({ tableLayout: 'fixed', width: '100%' }))
const colWidthsPx = computed(() => ({
  time:  `${DEFAULT_WIDTHS.time}px`,
  title: 'auto',
}))

// Escape key dismisses open modal
const onKeyUp = (e) => { if (e.key === 'Escape') selected.value = null }
onMounted(()   => document.addEventListener('keyup', onKeyUp))
onUnmounted(() => document.removeEventListener('keyup', onKeyUp))

// ── Article cache & settings ──────────────────────────────────────────────────

const MAX_ARTICLES_OPTIONS = [50, 100, 500, 1000, 2000, 4000, 8000, 10000]
const maxArticles = ref(props.settings.maxArticles ?? 1000)

watch(maxArticles, v => {
  emit('update-settings', { ...props.settings, maxArticles: v })
  cacheLimit.value = v
  newsItems.value = []
  if (activeTicker.value) getCache(v)
})

watch(() => props.settings, (s) => {
  if (s?.maxArticles !== undefined) maxArticles.value = s.maxArticles
}, { deep: true })

// ── WebSocket ─────────────────────────────────────────────────────────────────

const newsItems = ref([])
const selected  = ref(null)
const searchQuery = ref('')

const currentFeed = ref('')

const { feedName, cacheKey, isConnected, reconnecting, lastDataAt, getCache, subscribe, unsubscribe, connect, cacheLimit } = useWebSocketClient({
  wsUrl:     appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey:   appConfig.apiKey || 'secret',
  feedName:  '',
  cacheKey:  '',
  cacheLimit: maxArticles.value,
  onData: (data) => {
    const incoming = (Array.isArray(data) ? data : [data]).filter(item => item && item.title)
    if (!incoming.length) return
    const seen  = new Set(newsItems.value.map(a => a.link))
    const fresh = incoming.filter(a => !seen.has(a.link))
    if (!fresh.length) return
    const combined = [...fresh, ...newsItems.value]
    newsItems.value = combined.slice(0, maxArticles.value)
  },
  autoConnect: false,  // connect manually when ticker is set
})

// Re-subscribe when ticker changes
watch(activeTicker, (newTicker, oldTicker) => {
  if (oldTicker) {
    unsubscribe()
  }
  newsItems.value = []
  if (newTicker) {
    const feed = `news:ticker:${newTicker}`
    currentFeed.value = feed
    feedName.value = feed
    cacheKey.value = feed
    if (!isConnected.value) {
      // Not yet connected — connect now. The composable's internal watcher
      // handles subscribe + getCache once the connection is established.
      connect()
    } else {
      // Already connected — subscribe and fetch immediately
      subscribe()
      getCache()
    }
  }
})

defineExpose({ lastDataAt, isConnected, reconnecting })

// ── Filtering & sorting ───────────────────────────────────────────────────────

const filteredNews = computed(() => {
  let items = newsItems.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(a => (a.title || '').toLowerCase().includes(q))
  }
  return [...items].sort((a, b) => {
    let av, bv
    if (sortKey.value === 'time') {
      av = a.publishDate ? new Date(a.publishDate).getTime() : 0
      bv = b.publishDate ? new Date(b.publishDate).getTime() : 0
    } else {
      av = (a.title || '').toLowerCase()
      bv = (b.title || '').toLowerCase()
    }
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const isUsTicker  = (co) => US_EXCHANGES.has(co.primaryListing?.exchangeCode)
const usCompanies = (item) => item.companies?.filter(isUsTicker) ?? []

const shortSource = (src) => src ? src.replace(/^www\./, '').replace(/\.[^.]+$/, '') : ''

const sentimentClass = (s) => {
  if (s === 'positive') return 'positive'
  if (s === 'negative') return 'negative'
  return 'neutral'
}

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const month = d.getMonth() + 1
  const day   = d.getDate()
  const time  = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${month}/${day} ${time}`
}

const formatDateTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return isNaN(d.getTime()) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const openDetail = (item) => { selected.value = item }
</script>

<style scoped>
.company-news-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  overflow: hidden;
  font-size: 13px;
  color: #e0e0e0;
}

/* ── Ticker input ── */
.cn-input-bar {
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid #2a2a2a;
}
.cn-input {
  flex: 1;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  padding: 4px 8px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
}
.cn-input:focus { outline: none; border-color: #8b5cf6; }
.cn-input::placeholder { color: #444; text-transform: none; }
.cn-go-btn {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  padding: 4px 10px;
  cursor: pointer;
}
.cn-go-btn:hover { background: #3d3d3d; }

/* ── Empty state ── */
.cn-empty {
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
.cn-empty-icon { font-size: 28px; }
.cn-empty-text  { font-size: 13px; color: #555; }

/* ── Controls ── */
.news-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-bottom: 1px solid #2a2a2a;
  flex-wrap: wrap;
  min-height: 28px;
}
.search-input {
  flex: 1;
  min-width: 80px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 3px;
  color: #ccc;
  font-size: 12px;
  padding: 2px 6px;
}
.search-input:focus { outline: none; border-color: #8b5cf6; }
.article-count {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}
.max-articles-select {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 3px;
  color: #ccc;
  font-size: 11px;
  padding: 1px 4px;
}

/* ── Table / virtual scroll (shared with NewsFeed) ── */
.news-table-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.vs-header {
  display: flex;
  background: #252525;
  border-bottom: 1px solid #333;
  user-select: none;
  flex-shrink: 0;
}
.vs-th {
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  position: relative;
  cursor: pointer;
}
.vs-th.col-title { flex: 1; }
.col-sorted { color: #a78bfa; }
.sort-indicator { font-size: 9px; margin-left: 2px; }
.vs-scroller { flex: 1; overflow-y: auto; }
.vs-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #1a1a1a;
  cursor: pointer;
  min-height: 22px;
}
.vs-row:hover { background: #2a2a2a; }
.vs-td {
  padding: 1px 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
}
.vs-td.col-time  { color: #888; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.vs-td.col-title { flex: 1; display: flex; align-items: center; gap: 4px; }
.vs-headline     { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.headline-source { color: #666; font-size: 11px; }

/* ── Sentiment dots ── */
.sentiment-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sentiment-dot.positive { background: #4ade80; }
.sentiment-dot.negative { background: #f87171; }
.sentiment-dot.neutral  { background: #888; }

/* ── Mobile cards ── */
.news-card-list { flex: 1; overflow-y: auto; }
.news-card {
  padding: 6px 8px;
  border-bottom: 1px solid #1a1a1a;
  cursor: pointer;
}
.news-card:hover { background: #2a2a2a; }
.news-card-header {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 2px;
}
.news-card-time  { font-size: 11px; color: #666; }
.news-card-title { font-size: 13px; display: flex; gap: 5px; align-items: flex-start; }

/* ── Empty ── */
.news-empty {
  padding: 16px;
  text-align: center;
  color: #555;
  font-size: 12px;
}

/* ── Modal ── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.modal-card {
  background: #252525;
  border: 1px solid #444;
  border-radius: 8px;
  max-width: 600px; width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}
.modal-close {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none;
  color: #888; font-size: 16px; cursor: pointer;
}
.modal-close:hover { color: #fff; }
.modal-images { margin-bottom: 12px; }
.modal-image  { width: 100%; border-radius: 4px; max-height: 200px; object-fit: cover; }
.modal-meta {
  display: flex; gap: 10px; align-items: center;
  margin-bottom: 8px; font-size: 12px; color: #888;
  flex-wrap: wrap;
}
.modal-source { color: #888; text-decoration: none; }
.modal-source:hover { color: #a78bfa; }
.modal-sentiment { text-transform: capitalize; }
.modal-sentiment.positive { color: #4ade80; }
.modal-sentiment.negative { color: #f87171; }
.modal-title {
  display: block;
  font-size: 15px; font-weight: 600; color: #e0e0e0;
  text-decoration: none; margin-bottom: 10px;
  line-height: 1.4;
}
.modal-title:hover { color: #a78bfa; }
.modal-summary {
  font-size: 13px; color: #aaa; line-height: 1.6;
  margin-bottom: 12px;
}
.modal-companies { display: flex; flex-wrap: wrap; gap: 8px; }
.modal-company   { display: flex; align-items: center; gap: 6px; }
.company-name    { font-size: 12px; color: #999; }
.company-exchange { font-size: 11px; color: #666; }
.ticker-tag {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 3px;
  color: #a78bfa;
  font-size: 11px;
  padding: 1px 5px;
  cursor: default;
  white-space: nowrap;
}
</style>
