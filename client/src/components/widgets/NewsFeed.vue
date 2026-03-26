<template>
  <div class="news-feed-widget">

    <!-- Controls -->
    <div class="news-controls">
      <input
        v-model="tickerFilter"
        type="text"
        placeholder="Filter by ticker…"
        class="filter-input"
      />
      <select v-model="maxItems" class="filter-select">
        <option :value="25">25</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </div>

    <!-- Table -->
    <div class="news-table-wrap">
      <table class="news-table">
        <thead>
          <tr>
            <th class="col-time">Time</th>
            <th class="col-title">Headline</th>
            <th class="col-source">Source</th>
            <th class="col-tickers">Tickers</th>
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
              {{ item.title }}
            </td>
            <td class="col-source">{{ shortSource(item.source) }}</td>
            <td class="col-tickers">
              <span
                v-for="co in usCompanies(item)"
                :key="co.ticker"
                class="ticker-tag"
                @click.stop="$emit('ticker-click', co.ticker)"
              >{{ co.ticker }}</span>
            </td>
          </tr>
          <tr v-if="filteredNews.length === 0">
            <td colspan="4" class="news-empty">No articles yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
        <div class="modal-card">
          <button class="modal-close" @click="selected = null">✕</button>

          <!-- Images -->
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

            <!-- Companies -->
            <div v-if="selected.companies && selected.companies.length" class="modal-companies">
              <div
                v-for="co in selected.companies"
                :key="co.companyId || co.ticker"
                class="modal-company"
              >
                <span
                  :class="['ticker-tag', isUsTicker(co) ? '' : 'ticker-foreign']"
                  @click="isUsTicker(co) && $emit('ticker-click', co.ticker)"
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
 * NewsFeed widget — subscribes to the WDS news:feed:latest channel and
 * displays Enhanced Finlight articles in a table layout with a detail modal.
 *
 * Assumes Enhanced WebSocket messages with companies/entities present.
 *
 * @prop {string} feedName  - WDS feed to subscribe to
 * @prop {string} cacheKey  - WDS cache key for initial state
 *
 * @emits ticker-click  - Emitted when a US ticker tag is clicked, payload: symbol string
 */
import { ref, computed } from 'vue'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  feedName: { type: String, default: 'news:feed:latest' },
  cacheKey: { type: String, default: 'news:feed:latest' },
})
defineEmits(['ticker-click'])

const appConfig = window.__APP_CONFIG__ || {}
const MAX_BUFFER = 500
const US_EXCHANGES = new Set(['XNYS', 'XNAS', 'XASE'])

const newsItems = ref([])
const tickerFilter = ref('')
const maxItems = ref(50)
const selected = ref(null)

const { lastDataAt, isConnected, reconnecting } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: props.feedName,
  cacheKey: props.cacheKey,
  onData: (data) => {
    const incoming = Array.isArray(data) ? data : [data]
    newsItems.value = [...incoming, ...newsItems.value].slice(0, MAX_BUFFER)
  },
  autoConnect: true,
})

defineExpose({ lastDataAt, isConnected, reconnecting })

// Helpers
const isUsTicker = (co) => {
  const code = co.primaryListing && co.primaryListing.exchangeCode
  return US_EXCHANGES.has(code)
}

const usCompanies = (item) => {
  if (!item.companies) return []
  return item.companies.filter(isUsTicker)
}

const shortSource = (src) => {
  if (!src) return ''
  return src.replace(/^www\./, '').replace(/\.[^.]+$/, '')
}

const sentimentClass = (s) => {
  if (!s) return 'neutral'
  if (s === 'positive') return 'positive'
  if (s === 'negative') return 'negative'
  return 'neutral'
}

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const openDetail = (item) => { selected.value = item }

// Filter: match ticker filter against US company tickers in the article
const filteredNews = computed(() => {
  let items = newsItems.value
  const filter = tickerFilter.value.trim().toUpperCase()
  if (filter) {
    items = items.filter(item =>
      usCompanies(item).some(co => co.ticker.toUpperCase().includes(filter))
    )
  }
  return items.slice(0, maxItems.value)
})
</script>

<style scoped>
.news-feed-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 13px;
}

/* ── Controls ── */
.news-controls {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  background: #222;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.filter-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
}

.filter-input:focus { outline: none; border-color: #8b5cf6; }

.filter-select {
  padding: 4px 6px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
}

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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid #333;
  user-select: none;
}

.col-time    { width: 52px; }
.col-title   { width: auto; }
.col-source  { width: 90px; }
.col-tickers { width: 110px; }

.news-row {
  cursor: pointer;
  border-bottom: 1px solid #1e1e1e;
}

.news-row:hover { background: #252525; }

.news-row td {
  padding: 6px 8px;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-time  { color: #666; font-size: 11px; font-variant-numeric: tabular-nums; }
.col-title { color: #ccc; max-width: 0; }  /* max-width:0 makes text-overflow work in table */
.col-source { color: #666; font-size: 11px; }
.col-tickers { white-space: normal; }

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
  margin: 1px 2px 1px 0;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
}
.ticker-tag:hover { background: rgba(139, 92, 246, 0.28); }
.ticker-tag.ticker-foreign { color: #666; background: transparent; border-color: #333; cursor: default; }

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

.modal-body {
  padding: 14px 16px 18px;
}

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
.modal-sentiment.neutral  { color: #888; background: rgba(255,255,255,0.05); }

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

.modal-company {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-name     { font-size: 12px; color: #999; flex: 1; }
.company-exchange { font-size: 10px; color: #555; }
</style>
