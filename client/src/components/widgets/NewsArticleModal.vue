<template>
  <Teleport to="body">
    <div v-if="article" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card">
        <button class="modal-close" @click="emit('close')">✕</button>

        <div v-if="article.images && article.images.length" class="modal-images">
          <img
            v-for="(img, i) in article.images.slice(0, 1)"
            :key="i"
            :src="img"
            class="modal-image"
            alt=""
            @error="$event.target.style.display='none'"
          />
        </div>

        <div class="modal-body">
          <div class="modal-meta">
            <span class="modal-time">{{ formatDateTime(article.publishDate) }}</span>
            <a
              :href="article.source ? 'https://' + article.source : '#'"
              target="_blank"
              rel="noopener"
              class="modal-source"
            >{{ article.source }}</a>
            <span :class="['modal-sentiment', sentimentClass(article.sentiment)]">{{ article.sentiment }}</span>
          </div>

          <a :href="article.link" target="_blank" rel="noopener" class="modal-title">{{ article.title }}</a>

          <p v-if="article.summary" class="modal-summary">{{ article.summary }}</p>

          <div v-if="article.companies && article.companies.length" class="modal-companies">
            <div
              v-for="co in article.companies"
              :key="co.companyId || co.ticker"
              class="modal-company"
            >
              <span
                :class="['ticker-tag', isUsTicker(co) ? '' : 'ticker-foreign']"
              >{{ co.ticker }}</span>
              <span class="company-name">{{ co.name }}</span>
              <span class="company-exchange">{{ co.primaryListing?.exchangeCode }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * NewsArticleModal — shared detail modal for news article widgets.
 *
 * Used by EQV4CompanyNewsCard. Intended for future adoption by NewsFeed,
 * NewsFeedV2, and CompanyNews once validated in EQv4.
 *
 * @prop {object|null} article - Article object to display. null = hidden.
 * @emits close                - User dismissed the modal.
 */
const US_EXCHANGES = new Set(['XNYS', 'XNAS', 'XASE'])

defineProps({
  article: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const isUsTicker = (co) => US_EXCHANGES.has(co.primaryListing?.exchangeCode)

const sentimentClass = (s) =>
  s === 'positive' ? 'positive' : s === 'negative' ? 'negative' : 'neutral'

const formatDateTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
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
.modal-company    { display: flex; align-items: center; gap: 8px; }
.company-name     { font-size: 12px; color: #999; flex: 1; }
.company-exchange { font-size: 10px; color: #555; }
.ticker-tag {
  font-size: 10px;
  font-family: 'Roboto Mono', monospace;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 3px;
  padding: 0 4px;
  color: #999;
  white-space: nowrap;
}
.ticker-foreign { opacity: 0.5; }
</style>
