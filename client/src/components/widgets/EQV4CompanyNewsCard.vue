<template>
  <div class="eqv4-news-card">

    <!-- Card header: label + selector + refresh + X (edit mode) -->
    <div class="eqv4-news-header">
      <span class="eqv4-news-label">Company News</span>
      <div class="eqv4-news-controls">
        <select
          :value="articleCount"
          class="eqv4-news-count-select"
          title="Number of articles"
          @change="onArticleCountChange"
        >
          <option v-for="n in ARTICLE_COUNT_OPTIONS" :key="n" :value="n">{{ n }}</option>
        </select>
        <button
          class="eqv4-news-refresh"
          :class="{ 'eqv4-news-refresh--spinning': loading }"
          title="Refresh news"
          :disabled="loading"
          @click="fetchNews"
        >↻</button>
        <button
          v-if="!isLocked"
          class="eqv4-news-remove"
          title="Remove card"
          @click="emit('remove')"
        >✕</button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="eqv4-news-search-wrap">
      <input
        v-model.trim="searchQuery"
        type="search"
        placeholder="Search headlines…"
        class="eqv4-news-search"
        @keydown.escape="searchQuery = ''"
      />
      <span class="eqv4-news-article-count">
        <template v-if="filteredArticles.length !== articles.length">
          {{ filteredArticles.length }} / {{ articles.length }}
        </template>
        <template v-else>
          {{ articles.length }}
        </template>
      </span>
    </div>

    <!-- Column header — two columns: Time + Headline (matches NewsFeed layout) -->
    <div class="eqv4-news-thead">
      <div
        class="eqv4-nth eqv4-nth-time"
        :class="{ 'eqv4-nth-sorted': sortKey === 'time' }"
        @click="cycleSort('time')"
      >Time<span v-if="sortKey === 'time'" class="eqv4-sort-indicator">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span></div>
      <div
        class="eqv4-nth eqv4-nth-headline"
        :class="{ 'eqv4-nth-sorted': sortKey === 'title' }"
        @click="cycleSort('title')"
      >Headline<span v-if="sortKey === 'title'" class="eqv4-sort-indicator">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span></div>
    </div>

    <!-- States -->
    <div v-if="!ticker" class="eqv4-news-empty">Enter a ticker to load news</div>
    <div v-else-if="error" class="eqv4-news-error">
      {{ error }}
      <button class="eqv4-retry-btn" @click="fetchNews">↻ Retry</button>
    </div>
    <div v-else-if="loading && articles.length === 0" class="eqv4-news-empty">
      <span class="eqv4-news-spinner">↻</span> Loading…
    </div>
    <div v-else-if="!loading && articles.length === 0" class="eqv4-news-empty">
      No news found for {{ ticker }}
    </div>

    <!-- Virtual scroller — same row pattern as NewsFeed.vue -->
    <RecycleScroller
      v-else
      class="eqv4-news-scroller"
      :items="filteredArticles"
      :item-size="22"
      key-field="link"
      v-slot="{ item }"
    >
      <div class="eqv4-news-row" @click="selected = item">
        <div class="eqv4-ntd eqv4-ntd-time">{{ formatTime(item.publishDate) }}</div>
        <div class="eqv4-ntd eqv4-ntd-headline">
          <span :class="['eqv4-sentiment-dot', sentimentClass(item.sentiment)]" :title="item.sentiment"></span>
          <span class="eqv4-news-title">
            {{ item.title }}<span v-if="item.source" class="eqv4-headline-source"> — {{ shortSource(item.source) }}</span>
          </span>
          <!-- Finlight REST API does not populate companies/tickers on ticker queries -->
        </div>
      </div>
    </RecycleScroller>

    <!-- Detail modal — shared NewsArticleModal SFC -->
    <NewsArticleModal :article="selected" @close="selected = null" />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import { useConfig } from '@/composables/useConfig.js'
import NewsArticleModal from './NewsArticleModal.vue'

const ARTICLE_COUNT_OPTIONS = [5, 10, 20, 50, 100]

const props = defineProps({
  ticker:       { type: String,  default: null },
  articleCount: { type: Number,  default: 20 },
  isLocked:     { type: Boolean, default: true },
})

const emit = defineEmits(['update-article-count', 'remove'])

const { config } = useConfig()

// ── State ─────────────────────────────────────────────────────────────────────
const articles    = ref([])
const loading     = ref(false)
const error       = ref(null)
const selected    = ref(null)
const searchQuery = ref('')
const sortKey     = ref('time')
const sortDir     = ref('desc')

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchNews = async () => {
  if (!props.ticker) return
  if (!config.value?.finlightApiKey) {
    error.value = 'Finlight API key not configured'
    return
  }
  loading.value = true
  error.value = null
  articles.value = []
  try {
    const resp = await fetch('https://api.finlight.me/v2/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.value.finlightApiKey,
      },
      body: JSON.stringify({
        query: `ticker:${props.ticker}`,
        pageSize: props.articleCount,
        page: 1,
        language: 'en',
      }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    articles.value = json.articles ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(() => props.ticker, (t) => { if (t) fetchNews() }, { immediate: true })
watch(() => props.articleCount, () => { if (props.ticker) fetchNews() })

// ── Controls ──────────────────────────────────────────────────────────────────
const onArticleCountChange = (e) => {
  emit('update-article-count', parseInt(e.target.value, 10))
}

const cycleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'time' ? 'desc' : 'asc'
  }
}

// ── Filtered + sorted articles ────────────────────────────────────────────────
const filteredArticles = computed(() => {
  let items = articles.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(a => a.title?.toLowerCase().includes(q))
  }
  return [...items].sort((a, b) => {
    if (sortKey.value === 'time') {
      const diff = new Date(a.publishDate) - new Date(b.publishDate)
      return sortDir.value === 'asc' ? diff : -diff
    }
    if (sortKey.value === 'title') {
      const cmp = (a.title ?? '').localeCompare(b.title ?? '')
      return sortDir.value === 'asc' ? cmp : -cmp
    }
    return 0
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const shortSource = (src) => src ? src.replace(/^www\./, '').replace(/\.[^.]+$/, '') : ''
const sentimentClass = (s) => s === 'positive' ? 'positive' : s === 'negative' ? 'negative' : 'neutral'

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// ── Expose ────────────────────────────────────────────────────────────────────
defineExpose({ articles, filteredArticles, loading, error, selected, fetchNews })
</script>

<style scoped>
.eqv4-news-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg, #0d0d12);
  color: var(--text-primary, #e2e8f0);
  font-family: system-ui, sans-serif;
}

/* ── Header ── */
.eqv4-news-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border, #2d2d3d);
  background: var(--bg, #0d0d12);
  flex-shrink: 0;
}
.eqv4-news-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.eqv4-news-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.eqv4-news-count-select {
  background: var(--surface, #141420);
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 3px;
  color: var(--text-muted, #64748b);
  font-size: 13px;
  padding: 1px 3px;
  cursor: pointer;
}
.eqv4-news-refresh {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s;
}
.eqv4-news-refresh:hover { color: var(--pd-accent, #7c3aed); }
.eqv4-news-refresh--spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.eqv4-news-remove {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
}
.eqv4-news-remove:hover { color: #ef4444; }

/* ── Search ── */
.eqv4-news-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border, #2d2d3d);
  flex-shrink: 0;
}
.eqv4-news-search {
  flex: 1;
  background: var(--surface, #141420);
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 3px;
  color: var(--text-primary, #e2e8f0);
  font-size: 13px;
  padding: 2px 6px;
  outline: none;
}
.eqv4-news-search:focus { border-color: var(--pd-accent, #7c3aed); }
.eqv4-news-article-count {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Column header — two columns, matches NewsFeed ── */
.eqv4-news-thead {
  display: flex;
  border-bottom: 1px solid var(--border, #2d2d3d);
  flex-shrink: 0;
  background: var(--bg, #0d0d12);
}
.eqv4-nth {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 4px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
}
.eqv4-nth-time    { width: 90px; flex-shrink: 0; }
.eqv4-nth-headline { flex: 1; min-width: 0; }
.eqv4-nth-sorted  { color: var(--pd-accent, #7c3aed); }
.eqv4-sort-indicator { font-size: 8px; }

/* ── Empty / error states ── */
.eqv4-news-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-muted, #64748b);
  font-style: italic;
  padding: 8px;
  text-align: center;
}
.eqv4-news-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: #ef4444;
  padding: 8px;
}
.eqv4-retry-btn {
  background: none;
  border: 1px solid #ef4444;
  border-radius: 3px;
  color: #ef4444;
  font-size: 10px;
  padding: 1px 5px;
  cursor: pointer;
}
.eqv4-news-spinner {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Virtual scroller ── */
.eqv4-news-scroller {
  flex: 1;
  min-height: 0;
}
.eqv4-news-row {
  display: flex;
  align-items: center;
  height: 22px;
  cursor: pointer;
  border-bottom: 1px solid var(--border, #2d2d3d);
}
.eqv4-news-row:hover { background: var(--surface, #141420); }
.eqv4-ntd {
  font-size: 13px;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-ntd-time    { width: 90px; flex-shrink: 0; color: var(--text-muted, #64748b); }
.eqv4-ntd-headline {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}
.eqv4-news-title  {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.eqv4-headline-source {
  color: var(--text-muted, #64748b);
  font-size: 10px;
}

/* ── Sentiment dot ── */
.eqv4-sentiment-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}
.eqv4-sentiment-dot.positive { background: #22c55e; }
.eqv4-sentiment-dot.negative { background: #ef4444; }
.eqv4-sentiment-dot.neutral  { background: #64748b; }

/* Ticker tags removed — Finlight REST API does not populate companies on ticker queries */
</style>
