<template>
  <div class="news-feed-widget">
    <div class="news-controls">
      <input
        v-model="tickerFilter"
        type="text"
        placeholder="Filter by ticker..."
        class="filter-input"
      />
      <select v-model="maxItems" class="filter-select">
        <option :value="25">25 items</option>
        <option :value="50">50 items</option>
        <option :value="100">100 items</option>
      </select>
    </div>

    <div class="news-list" ref="newsListEl">
      <div
        v-for="(item, idx) in filteredNews"
        :key="idx"
        class="news-item"
      >
        <div class="news-meta">
          <span class="news-time">{{ formatTime(item.published_at || item.publishDate) }}</span>
          <span class="news-source">{{ item.source }}</span>
          <span
            v-for="ticker in (item.tickers || [])"
            :key="ticker"
            class="ticker-tag"
            @click="$emit('ticker-click', ticker)"
          >{{ ticker }}</span>
        </div>
        <a
          class="news-headline"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ item.headline || item.title }}</a>
      </div>
      <div v-if="filteredNews.length === 0" class="news-empty">
        No news articles yet.
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * NewsFeed widget — subscribes to the WDS news feed and displays
 * real-time news headlines with ticker tagging.
 *
 * @prop {string} feedName  - WDS feed to subscribe to (default: news:feed:latest)
 * @prop {string} cacheKey  - WDS cache key for initial state (default: news:feed:latest)
 *
 * @emits ticker-click  - Emitted when a ticker tag is clicked, payload: ticker symbol string
 */
import { ref, computed } from 'vue'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const props = defineProps({
  feedName: { type: String, default: 'news:feed:latest' },
  cacheKey: { type: String, default: 'news:feed:latest' },
})
defineEmits(['ticker-click'])

const appConfig = window.__APP_CONFIG__ || {}

const newsItems = ref([])
const tickerFilter = ref('')
const maxItems = ref(50)
const newsListEl = ref(null)

const MAX_BUFFER = 500

const { lastDataAt, isConnected, reconnecting } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: props.feedName,
  cacheKey: props.cacheKey,
  onData: (data) => {
    // Data may arrive as a single article or an array (cache hydration)
    const incoming = Array.isArray(data) ? data : [data]
    // Prepend newest first; trim buffer to avoid unbounded growth
    newsItems.value = [...incoming, ...newsItems.value].slice(0, MAX_BUFFER)
  },
  autoConnect: true,
})

defineExpose({ lastDataAt, isConnected, reconnecting })

const filteredNews = computed(() => {
  let items = newsItems.value
  const filter = tickerFilter.value.trim().toUpperCase()
  if (filter) {
    items = items.filter(item =>
      (item.tickers || []).some(t => t.toUpperCase().includes(filter))
    )
  }
  return items.slice(0, maxItems.value)
})

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d)) return ts
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.news-feed-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.news-controls {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
}

.filter-input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.filter-select {
  padding: 6px 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
}

.news-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.news-item {
  padding: 8px 12px;
  border-bottom: 1px solid #2a2a2a;
}

.news-item:last-child {
  border-bottom: none;
}

.news-item:hover {
  background: #252525;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.news-time {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.news-source {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

.ticker-tag {
  font-size: 11px;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  padding: 1px 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.ticker-tag:hover {
  background: rgba(139, 92, 246, 0.25);
}

.news-headline {
  display: block;
  font-size: 13px;
  color: #d0d0d0;
  text-decoration: none;
  line-height: 1.4;
}

.news-headline:hover {
  color: #fff;
  text-decoration: underline;
}

.news-empty {
  padding: 24px;
  text-align: center;
  color: #555;
  font-size: 13px;
}
</style>
