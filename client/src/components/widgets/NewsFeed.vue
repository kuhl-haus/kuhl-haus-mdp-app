<template>
  <div class="news-feed-widget">

    <!-- Controls -->
    <div class="news-controls">
      <!-- R1: has-tickers toggle -->
      <button
        :class="['filter-btn', hasTickersOnly ? 'filter-btn--active' : '']"
        :title="hasTickersOnly ? 'Showing: tickers only — click to show all' : 'Show only articles with tickers'"
        @click="hasTickersOnly = !hasTickersOnly"
      >🏷 Tickers only</button>

      <!-- Search input -->
      <input
        v-model.trim="searchQuery"
        type="search"
        placeholder="Search headlines…"
        class="search-input"
        @keydown.escape="searchQuery = ''"
      />

      <!-- R2: active ticker filter pill -->
      <span v-if="activeTicker" class="active-ticker-pill">
        {{ activeTicker }}
        <button class="pill-clear" @click="activeTicker = null" title="Clear ticker filter">×</button>
      </span>

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
          <span
            v-for="co in usCompanies(item)"
            :key="co.ticker"
            :class="['ticker-tag', activeTicker === co.ticker ? 'ticker-tag--active' : '']"
            @click.stop="toggleTickerFilter(co.ticker)"
          >{{ co.ticker }}</span>
        </div>
        <div class="news-card-title">
          <span :class="['sentiment-dot', sentimentClass(item.sentiment)]" :title="item.sentiment"></span>
          {{ item.title }}<span v-if="item.source" class="headline-source"> — {{ shortSource(item.source) }}</span>
        </div>
      </div>
      <div v-if="filteredNews.length === 0" class="news-empty">
        {{ newsItems.length === 0 ? 'No articles yet.' : 'No articles match the current filter.' }}
      </div>
    </div>

    <!-- Desktop: table -->
    <div v-else class="news-table-wrap" ref="tableWrap">
      <table class="news-table" :style="tableStyle">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="['col-' + col.key, sortKey === col.key ? 'col-sorted' : '']"
              :style="{ width: colWidthsPx[col.key], cursor: col.sortable ? 'pointer' : 'default' }"
              @click="col.sortable && cycleSort(col.key)"
              :title="col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'Sort descending' : 'Sort ascending') : 'Sort by ' + col.label) : ''"
            >
              {{ col.label }}<span v-if="sortKey === col.key" class="sort-indicator">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
              <!-- Resize handle — only shown when unlocked -->
              <span
                v-if="!isLocked"
                class="col-resize-handle"
                @mousedown.prevent="startResize($event, col.key)"
                title="Drag to resize column"
              ></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in filteredNews"
            :key="idx"
            class="news-row"
            @click="openDetail(item)"
          >
            <td class="col-time">{{ formatTime(item.publishDate) }}</td>
            <td class="col-title">
              <span
                :class="['sentiment-dot', sentimentClass(item.sentiment)]"
                :title="item.sentiment"
              ></span>
              {{ item.title }}<span v-if="item.source" class="headline-source"> — {{ shortSource(item.source) }}</span><span
                v-for="co in usCompanies(item)"
                :key="co.ticker"
                :class="['ticker-tag', activeTicker === co.ticker ? 'ticker-tag--active' : '']"
                :title="activeTicker === co.ticker ? 'Clear filter' : `Filter by ${co.ticker}`"
                @click.stop="toggleTickerFilter(co.ticker)"
              >{{ co.ticker }}</span>
            </td>
          </tr>
          <tr v-if="filteredNews.length === 0">
            <td colspan="2" class="news-empty">
              {{ newsItems.length === 0 ? 'No articles yet.' : 'No articles match the current filter.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div><!-- end desktop table (v-else) -->

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
                <span
                  :class="['ticker-tag', isUsTicker(co) ? (activeTicker === co.ticker ? 'ticker-tag--active' : '') : 'ticker-foreign']"
                  :title="isUsTicker(co) ? (activeTicker === co.ticker ? 'Clear filter' : `Filter by ${co.ticker}`) : co.ticker"
                  @click="isUsTicker(co) && toggleTickerFilter(co.ticker)"
                >{{ co.ticker }}</span>
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
 * NewsFeed widget — subscribes to the WDS news:feed:latest channel.
 *
 * Column widths are resizable when the dashboard is unlocked (isLocked=false).
 * Widths are stored as numbers (px) and persisted via update-col-widths emit
 * which DashboardGrid saves into the layout item.
 *
 * @prop {string}  feedName  - WDS feed to subscribe to
 * @prop {string}  cacheKey  - WDS cache key for initial state
 * @prop {boolean} isLocked  - Dashboard lock state; hides resize handles when true
 * @prop {object}  colWidths - Saved column widths { time, title, source, tickers }
 *
 * @emits ticker-click        - US ticker badge clicked, payload: symbol string
 * @emits update-col-widths   - Column widths changed, payload: { time, title, source, tickers }
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useWidgetBus } from '@/composables/useWidgetBus.js'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  feedName:  { type: String,  default: 'news:feed:latest' },
  cacheKey:  { type: String,  default: 'news:feed:latest' },
  isLocked:  { type: Boolean, default: true },
  colWidths: { type: Object,  default: () => ({}) },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})
const emit = defineEmits(['ticker-click', 'update-col-widths', 'update-settings'])

const { setActiveTicker, activeTickers } = useWidgetBus()

const appConfig   = window.__APP_CONFIG__ || {}
const US_EXCHANGES = new Set(['XNYS', 'XNAS', 'XASE'])
const LS_HAS_TICKERS_KEY = 'newsfeed:hasTickersOnly'

// Default widths (px)
const DEFAULT_WIDTHS = { time: 90, title: 0 }
// title=0 means "auto" — fills remaining space via table-layout:fixed percentage trick

const columns = [
  { key: 'time',    label: 'Time',     sortable: true  },
  { key: 'title',   label: 'Headline', sortable: true  },
]

const sortKey = ref('time')
const sortDir = ref('desc')  // newest first by default

const cycleSort = (colKey) => {
  if (sortKey.value === colKey) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = colKey
    sortDir.value = colKey === 'time' ? 'desc' : 'asc'
  }
}

const newsItems      = ref([])
const selected       = ref(null)
const activeTicker   = ref(null)
const searchQuery    = ref('')
const LS_MAX_ARTICLES_KEY = 'newsfeed:maxArticles'
const MAX_ARTICLES_OPTIONS = [50, 100, 500, 1000, 2000, 4000, 8000, 10000]
const maxArticles = ref(props.settings.maxArticles ?? parseInt(localStorage.getItem(LS_MAX_ARTICLES_KEY) || '1000', 10))
watch(maxArticles, v => {
  localStorage.setItem(LS_MAX_ARTICLES_KEY, String(v))
  emit('update-settings', { ...props.settings, maxArticles: v })
  cacheLimit.value = v
  newsItems.value = []
  getCache(v)
})
const hasTickersOnly = ref(props.settings.hasTickersOnly ?? localStorage.getItem(LS_HAS_TICKERS_KEY) === 'true')
const tableWrap      = ref(null)

// Persist R1 toggle
watch(hasTickersOnly, (val) => {
  localStorage.setItem(LS_HAS_TICKERS_KEY, val)
  emit('update-settings', { ...props.settings, hasTickersOnly: val })
})

// Receive ticker from bus when another linked widget broadcasts
watch(
  () => props.linkColor ? activeTickers[props.linkColor] : undefined,
  (incoming) => {
    if (props.linkColor && incoming !== undefined) {
      activeTicker.value = incoming
    }
  }
)

// ── Column width management ────────────────────────────────────────────────────

// Merge saved widths over defaults; title stays 0 (auto) unless explicitly saved
const localWidths = ref({ ...DEFAULT_WIDTHS, ...props.colWidths })

// Recompute if parent passes new colWidths (e.g. layout load)
watch(() => props.colWidths, (v) => {
  if (v && Object.keys(v).length) localWidths.value = { ...DEFAULT_WIDTHS, ...v }
})

// CSS: fixed columns get explicit px; title gets remaining space via auto
// We use table-layout: fixed + col widths as percentages of table width
const tableStyle = computed(() => ({ tableLayout: 'fixed', width: '100%' }))

const colWidthsPx = computed(() => {
  const w = localWidths.value
  return {
    time:    w.time    ? `${w.time}px`    : `${DEFAULT_WIDTHS.time}px`,
    title:   'auto',   // fills remaining space
  }
})

// ── Column resize drag ─────────────────────────────────────────────────────────

let resizeState = null

const startResize = (e, colKey) => {
  if (props.isLocked) return
  // title column is auto — we compute its current px width from DOM
  let startWidth
  if (colKey === 'title' && tableWrap.value) {
    const th = tableWrap.value.querySelector('th.col-title')
    startWidth = th ? th.offsetWidth : 300
  } else {
    startWidth = localWidths.value[colKey] || DEFAULT_WIDTHS[colKey] || 100
  }

  resizeState = { colKey, startX: e.clientX, startWidth }

  const onMove = (me) => {
    if (!resizeState) return
    const delta = me.clientX - resizeState.startX
    const newWidth = Math.max(40, resizeState.startWidth + delta)
    localWidths.value = { ...localWidths.value, [resizeState.colKey]: newWidth }
  }

  const onUp = () => {
    resizeState = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    // Persist: emit to DashboardGrid for layout save
    emit('update-col-widths', { ...localWidths.value })
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

onUnmounted(() => {
  // Safety cleanup if component unmounts mid-drag
  resizeState = null
})

// ── WebSocket ──────────────────────────────────────────────────────────────────

const { lastDataAt, isConnected, reconnecting, getCache, cacheLimit } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: props.feedName,
  cacheKey: props.cacheKey,
  cacheLimit: maxArticles.value,
  onData: (data) => {
    const incoming = (Array.isArray(data) ? data : [data]).filter(item => item && item.title)
    if (!incoming.length) return
    // Dedup by link — prevents duplicates from cache load + live pub/sub overlap
    const seen = new Set(newsItems.value.map(a => a.link))
    const fresh = incoming.filter(a => !seen.has(a.link))
    if (!fresh.length) return
    const combined = [...fresh, ...newsItems.value]
    newsItems.value = combined.slice(0, maxArticles.value)
  },
  autoConnect: true,
})

defineExpose({ lastDataAt, isConnected, reconnecting })

// ── Helpers ────────────────────────────────────────────────────────────────────

const isUsTicker = (co) => US_EXCHANGES.has(co.primaryListing?.exchangeCode)
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
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return isNaN(d.getTime()) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const openDetail = (item) => { selected.value = item }

const toggleTickerFilter = (ticker) => {
  const next = activeTicker.value === ticker ? null : ticker
  activeTicker.value = next
  // Broadcast to linked widgets if this widget has a link color
  if (props.linkColor) {
    setActiveTicker(props.linkColor, next)
  }
}

// ── Filtered view ──────────────────────────────────────────────────────────────

const filteredNews = computed(() => {
  let items = newsItems.value
  if (hasTickersOnly.value) items = items.filter(item => usCompanies(item).length > 0)
  if (activeTicker.value) {
    const t = activeTicker.value
    items = items.filter(item => usCompanies(item).some(co => co.ticker === t))
  }

  // Search: filter by headline, source, or ticker symbol
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(item =>
      item.title?.toLowerCase().includes(q) ||
      item.source?.toLowerCase().includes(q) ||
      usCompanies(item).some(co => co.ticker.toLowerCase().includes(q))
    )
  }

  // Sort
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  items = [...items].sort((a, b) => {
    let av, bv
    if (key === 'time') {
      av = a.publishDate ? new Date(a.publishDate).getTime() : 0
      bv = b.publishDate ? new Date(b.publishDate).getTime() : 0
    } else if (key === 'title') {
      av = (a.title || '').toLowerCase()
      bv = (b.title || '').toLowerCase()
    } else if (key === 'tickers') {
      av = (usCompanies(a)[0]?.ticker || '').toLowerCase()
      bv = (usCompanies(b)[0]?.ticker || '').toLowerCase()
    } else {
      return 0
    }
    if (av < bv) return -1 * dir
    if (av > bv) return  1 * dir
    return 0
  })

  return items
})
</script>

<style scoped>
.news-feed-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 14px;
}

/* ── Controls ── */
.news-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #222;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 4px 10px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.filter-btn:hover { background: #1a1a1a; color: #aaa; }

.search-input {
  flex: 1;
  min-width: 80px;
  max-width: 200px;
  padding: 4px 8px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
}
.search-input:focus { outline: none; border-color: #8b5cf6; }
.search-input::placeholder { color: #555; }

.max-articles-select {
  padding: 3px 6px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #666;
  font-size: 11px;
  cursor: pointer;
}
.max-articles-select:focus { outline: none; border-color: #8b5cf6; }
.filter-btn--active {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.5);
  color: #a78bfa;
}

.article-count {
  margin-left: auto;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
  padding: 2px 6px;
}

.active-ticker-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 10px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 12px;
  color: #a78bfa;
  font-size: 12px;
  font-weight: 700;
}
.pill-clear {
  background: none;
  border: none;
  color: #a78bfa;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 1px;
  opacity: 0.7;
}
.pill-clear:hover { opacity: 1; }

/* ── Table ── */
.news-table-wrap {
  flex: 1;
  overflow-y: auto;
}

.news-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.news-table thead th {
  position: sticky;
  top: 0;
  background: #1a1a1a;
  color: #888;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  text-align: left;
  border-bottom: 1px solid #333;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  /* Reserve space for resize handle */
  position: relative;
}

/* Resize handle */
.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.1s;
  z-index: 1;
}
.col-resize-handle:hover,
.col-resize-handle:active {
  background: rgba(139, 92, 246, 0.5);
}

.news-row {
  cursor: pointer;
  border-bottom: 1px solid #1c1c1c;
}
.news-row:hover { background: #252525; }

.news-row td {
  padding: 2px 8px;
  vertical-align: top;
  /* wrap instead of truncate */
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
}

.col-time   { color: #888; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }

.col-sorted { color: #a78bfa !important; }

.sort-indicator {
  font-size: 10px;
  margin-left: 2px;
  color: #a78bfa;
  pointer-events: none;
}
.col-title  { color: #ddd; font-size: 16px; line-height: 1.4; }

/* Sentiment dot */
.sentiment-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
  vertical-align: middle;
  position: relative;
  top: -1px;
}
.sentiment-dot.positive { background: #22c55e; }
.sentiment-dot.negative { background: #ef4444; }
.sentiment-dot.neutral  { background: #555; }

/* Inline source in headline */
.headline-source {
  color: #555;
  font-size: 13px;
  font-weight: 400;
  margin-left: 2px;
}

/* Ticker tags */
.ticker-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 3px;
  padding: 1px 4px;
  margin: 0 0 0 4px;
  vertical-align: middle;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s;
}
.ticker-tag:hover { background: rgba(139, 92, 246, 0.28); }
.ticker-tag--active {
  background: rgba(139, 92, 246, 0.35);
  border-color: rgba(139, 92, 246, 0.7);
  color: #fff;
}
.ticker-foreign { color: #666; background: transparent; border-color: #333; cursor: default; }

.news-empty {
  padding: 24px;
  text-align: center;
  color: #444;
  font-size: 12px;
}

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-card {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}
.modal-close {
  position: sticky;
  top: 8px;
  float: right;
  margin: 8px 8px 0 0;
  background: #333;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 14px;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.modal-close:hover { background: #444; color: #fff; }
.modal-images {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  border-radius: 6px 6px 0 0;
}
.modal-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}
.modal-body { padding: 14px 16px 18px; }
.modal-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.modal-time   { font-size: 11px; color: #666; }
.modal-source { font-size: 11px; color: #888; text-decoration: none; }
.modal-source:hover { color: #aaa; text-decoration: underline; }
.modal-sentiment {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 3px;
}
.modal-sentiment.positive { color: #22c55e; background: rgba(34,197,94,0.1); }
.modal-sentiment.negative { color: #ef4444; background: rgba(239,68,68,0.1); }
.modal-sentiment.neutral  { color: #888;    background: rgba(255,255,255,0.05); }
.modal-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  text-decoration: none;
  line-height: 1.4;
  margin-bottom: 10px;
}
.modal-title:hover { color: #fff; text-decoration: underline; }
.modal-summary {
  font-size: 13px;
  color: #aaa;
  line-height: 1.6;
  margin: 0 0 14px;
}
.modal-companies {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 10px;
  border-top: 1px solid #2a2a2a;
}
.modal-company { display: flex; align-items: center; gap: 8px; }
.company-name     { font-size: 12px; color: #999; flex: 1; }
.company-exchange { font-size: 10px; color: #555; }

/* ── Mobile card layout ── */
.news-card-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.news-card {
  padding: 7px 8px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  cursor: pointer;
}
.news-card:hover { background: #222; }

.news-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.news-card-time {
  font-size: 11px;
  color: #666;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.news-card-title {
  font-size: 13px;
  color: #ddd;
  line-height: 1.4;
}
</style>
