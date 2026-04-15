<template>
  <div class="eqv4-card-body">
    <template v-if="chipsMode">
      <div v-if="loading" class="eqv4-muted-msg">Short interest data loading...</div>
      <div v-else-if="allNull" class="eqv4-muted-msg">Short interest data unavailable</div>
      <div v-else class="eqv4-chip-row">
        <div class="eqv4-chip"><span class="eqv4-chip-label">SI</span><span class="eqv4-chip-val">{{ fmtVol(shortInterestData.short_interest) }}</span></div>
        <div class="eqv4-chip"><span class="eqv4-chip-label">DTC</span><span class="eqv4-chip-val">{{ fmt(shortInterestData.days_to_cover, 1) }}</span></div>
        <div class="eqv4-chip"><span class="eqv4-chip-label">SVR</span><span class="eqv4-chip-val">{{ fmt(shortInterestData.short_volume_ratio, 1) }}%</span></div>
      </div>
    </template>
    <template v-else>
      <div v-if="loading" class="eqv4-muted-msg">Short interest data loading...</div>
      <div v-else-if="allNull" class="eqv4-muted-msg">Short interest data unavailable</div>
      <div v-else class="eqv4-kv-list">
        <div class="eqv4-kv"><span class="eqv4-k">Short Int.</span><span class="eqv4-v">{{ fmtVol(shortInterestData.short_interest) }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Days to Cover</span><span class="eqv4-v">{{ fmt(shortInterestData.days_to_cover, 1) }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Short Vol Ratio</span><span class="eqv4-v">{{ fmt(shortInterestData.short_volume_ratio, 1) }}%</span></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtVol } from './eqv3Utils.js'

const props = defineProps({
  shortInterestData: { type: Object,  default: () => ({}) },
  loading:           { type: Boolean, default: false },
  isLocked:          { type: Boolean, default: true },
  chipsMode:         { type: Boolean, default: false },
})

const fmt = (val, decimals = 2) => {
  const n = parseFloat(val)
  return isFinite(n) ? n.toFixed(decimals) : '—'
}

const allNull = computed(() => {
  const d = props.shortInterestData
  if (!d) return true
  return d.short_interest == null && d.days_to_cover == null && d.short_volume_ratio == null
})
</script>

<style scoped>
.eqv4-card-body { height: 100%; overflow: auto; padding: 6px; box-sizing: border-box; }
.eqv4-kv-list { display: flex; flex-direction: column; gap: 2px; }
.eqv4-kv { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid var(--border, #2d2d3d); gap: 8px; }
.eqv4-k { color: var(--text-muted, #64748b); font-size: 13px; font-family: system-ui, sans-serif; flex-shrink: 0; }
.eqv4-v { font-family: 'Roboto Mono', monospace; font-size: 13px; color: var(--text-primary, #e2e8f0); text-align: right; }
.eqv4-chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
.eqv4-chip { display: flex; flex-direction: column; align-items: center; background: var(--surface, #141420); border: 1px solid var(--border, #2d2d3d); border-radius: 4px; padding: 3px 6px; min-width: 44px; }
.eqv4-chip-label { font-size: 9px; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.05em; }
.eqv4-chip-val { font-family: 'Roboto Mono', monospace; font-size: 12px; color: var(--text-primary, #e2e8f0); }
.eqv4-muted-msg { font-size: 11px; color: var(--text-muted, #64748b); font-style: italic; }
</style>
