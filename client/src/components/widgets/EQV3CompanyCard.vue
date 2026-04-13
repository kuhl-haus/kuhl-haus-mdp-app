<template>
  <div class="eqv3-company-card-body">
  <div v-if="loading" class="eqv3-muted-msg">Company data loading...</div>
  <div v-else-if="allNull" class="eqv3-muted-msg">Company data unavailable</div>
  <div v-else>
    <div class="eqv3-kv-list">
      <div v-if="data.homepage_url" class="eqv3-kv">
        <span class="eqv3-k">Web</span>
        <a :href="data.homepage_url" target="_blank" rel="noopener noreferrer" class="eqv3-link">{{ truncateUrl(data.homepage_url) }}</a>
      </div>
      <div class="eqv3-kv"><span class="eqv3-k">Exchange</span><span class="eqv3-v">{{ data.primary_exchange || '—' }}</span></div>
      <div class="eqv3-kv"><span class="eqv3-k">Mkt Cap</span><span class="eqv3-v">{{ data.market_cap != null ? '$' + fmtVol(data.market_cap) : '—' }}</span></div>
      <div class="eqv3-kv"><span class="eqv3-k">Employees</span><span class="eqv3-v">{{ data.total_employees != null ? fmtVol(data.total_employees) : '—' }}</span></div>
      <div class="eqv3-kv"><span class="eqv3-k">Listed</span><span class="eqv3-v">{{ data.list_date || '—' }}</span></div>
    </div>
    <div v-if="data.description" class="eqv3-company-desc-wrap">
      <span class="eqv3-company-desc-text">
        {{ expanded ? data.description : truncateDesc(data.description) }}
      </span>
      <span v-if="!expanded && truncateDesc(data.description) !== data.description">
        <span class="eqv3-company-desc-ellipsis">… </span>
        <button class="eqv3-see-more" @click="onExpand">see more</button>
      </span>
      <button v-if="expanded" class="eqv3-see-more" @click="onCollapse"> less</button>
    </div>
  </div>
  </div>
</template>

<style scoped>
.eqv3-company-card-body {
  display: contents; /* transparent wrapper — does not affect layout */
}
.eqv3-kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv3-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}
.eqv3-k {
  color: var(--text-muted);
  font-size: 13px;
  font-family: system-ui, sans-serif;
  flex-shrink: 0;
}
.eqv3-v {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
}
.eqv3-link {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
  text-align: right;
}
.eqv3-link:hover { text-decoration: underline; }
.eqv3-company-desc-wrap {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  white-space: normal;
  max-width: 80ch;
}
.eqv3-company-desc-text {
  font-size: 11px;
  color: var(--text-muted);
}
.eqv3-company-desc-ellipsis {
  color: var(--text-muted);
}
.eqv3-see-more {
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
.eqv3-see-more:hover { opacity: 0.8; }
.eqv3-muted-msg {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
</style>

<script setup>
import { truncateUrl, truncateDesc, fmtVol } from './eqv3Utils.js'

defineProps({
  loading: { type: Boolean, default: false },
  allNull: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
  expanded: { type: Boolean, default: false },
})

const emit = defineEmits(['expand', 'collapse'])
const onExpand = () => emit('expand')
const onCollapse = () => emit('collapse')
</script>
