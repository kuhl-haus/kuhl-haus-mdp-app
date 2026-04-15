<template>
  <div class="eqv4-card-body">
    <div v-if="loading" class="eqv4-muted-msg">Company data loading...</div>
    <div v-else-if="allNull" class="eqv4-muted-msg">Company data unavailable</div>
    <div v-else>
      <div class="eqv4-kv-list">
        <div v-if="companyData.homepage_url" class="eqv4-kv">
          <span class="eqv4-k">Web</span>
          <a :href="companyData.homepage_url" target="_blank" rel="noopener noreferrer" class="eqv4-link">{{ truncateUrl(companyData.homepage_url) }}</a>
        </div>
        <div class="eqv4-kv"><span class="eqv4-k">Exchange</span><span class="eqv4-v">{{ companyData.primary_exchange || '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Mkt Cap</span><span class="eqv4-v">{{ companyData.market_cap != null ? '$' + fmtVol(companyData.market_cap) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Employees</span><span class="eqv4-v">{{ companyData.total_employees != null ? fmtVol(companyData.total_employees) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Listed</span><span class="eqv4-v">{{ companyData.list_date || '—' }}</span></div>
      </div>
      <div v-if="companyData.description" class="eqv4-company-desc-wrap">
        <span class="eqv4-company-desc-text">
          {{ expanded ? companyData.description : truncateDesc(companyData.description) }}
        </span>
        <span v-if="!expanded && truncateDesc(companyData.description) !== companyData.description">
          <span class="eqv4-company-desc-ellipsis">… </span>
          <button class="eqv4-see-more" @click="expanded = true">see more</button>
        </span>
        <button v-if="expanded" class="eqv4-see-more" @click="expanded = false"> less</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { truncateUrl, truncateDesc, fmtVol } from './eqv3Utils.js'

const props = defineProps({
  companyData: { type: Object,  default: () => ({}) },
  loading:     { type: Boolean, default: false },
  isLocked:    { type: Boolean, default: true },
})

const expanded = ref(false)

const allNull = computed(() => {
  const d = props.companyData
  if (!d) return true
  return (
    d.homepage_url == null &&
    d.primary_exchange == null &&
    d.market_cap == null &&
    d.total_employees == null &&
    d.list_date == null &&
    d.name == null &&
    d.sic_description == null &&
    d.description == null
  )
})
</script>

<style scoped>
.eqv4-card-body { height: 100%; overflow: auto; padding: 6px; box-sizing: border-box; }
.eqv4-kv-list { display: flex; flex-direction: column; gap: 2px; }
.eqv4-kv { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid var(--border, #2d2d3d); gap: 8px; }
.eqv4-k { color: var(--text-muted, #64748b); font-size: 13px; font-family: system-ui, sans-serif; flex-shrink: 0; }
.eqv4-v { font-family: 'Roboto Mono', monospace; font-size: 13px; color: var(--text-primary, #e2e8f0); text-align: right; }
.eqv4-link { font-family: 'Roboto Mono', monospace; font-size: 13px; color: var(--accent, #7c3aed); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; text-align: right; }
.eqv4-link:hover { text-decoration: underline; }
.eqv4-company-desc-wrap { margin-top: 6px; font-size: 11px; color: var(--text-muted, #64748b); line-height: 1.4; white-space: normal; }
.eqv4-company-desc-text { font-size: 11px; color: var(--text-muted, #64748b); }
.eqv4-company-desc-ellipsis { color: var(--text-muted, #64748b); }
.eqv4-see-more { background: none; border: none; color: var(--accent, #7c3aed); font-size: 11px; cursor: pointer; padding: 0; font-family: system-ui, sans-serif; text-decoration: underline; text-underline-offset: 2px; }
.eqv4-see-more:hover { opacity: 0.8; }
.eqv4-muted-msg { font-size: 11px; color: var(--text-muted, #64748b); font-style: italic; }
</style>
