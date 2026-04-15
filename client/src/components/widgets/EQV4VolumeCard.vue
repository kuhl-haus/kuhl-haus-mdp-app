<template>
  <div class="eqv4-card-body">
    <template v-if="chipsMode">
      <div class="eqv4-chip-row">
        <div class="eqv4-chip"><span class="eqv4-chip-label">Vol</span><span class="eqv4-chip-val">{{ fmtVol(quoteData.accumulated_volume) }}</span></div>
        <div class="eqv4-chip"><span class="eqv4-chip-label">Avg</span><span class="eqv4-chip-val">{{ fmtVol(quoteData.avg_volume) }}</span></div>
        <div class="eqv4-chip"><span class="eqv4-chip-label">Float</span><span class="eqv4-chip-val">{{ fmtVol(floatShares) }}</span></div>
        <div class="eqv4-chip"><span class="eqv4-chip-label">RVol</span><span :class="['eqv4-chip-val', relVolClass]">{{ fmt(quoteData.relative_volume, 2) }}x</span></div>
      </div>
    </template>
    <template v-else>
      <div class="eqv4-kv-list">
        <div class="eqv4-kv"><span class="eqv4-k">Volume</span><span class="eqv4-v">{{ fmtVol(quoteData.accumulated_volume) }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Avg Vol</span><span class="eqv4-v">{{ fmtVol(quoteData.avg_volume) }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Float</span><span class="eqv4-v">{{ fmtVol(floatShares) }}</span></div>
      </div>
      <div class="eqv4-rv-row">
        <span class="eqv4-k">Rel. Vol</span>
        <div class="eqv4-rv-bar-wrap"><div class="eqv4-rv-bar" :style="{ width: rvBarWidth, background: rvBarColor }"></div></div>
        <span :class="['eqv4-rv-val', relVolClass]">{{ fmt(quoteData.relative_volume, 2) }}x</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmt, fmtVol } from './eqv3Utils.js'

const props = defineProps({
  quoteData:  { type: Object,  required: true },
  isLocked:   { type: Boolean, default: true },
  chipsMode:  { type: Boolean, default: false },
})

const floatShares = computed(() =>
  props.quoteData?.free_float ?? props.quoteData?.share_class_shares_outstanding ?? null
)

const relVolClass = computed(() => {
  const rv = parseFloat(props.quoteData?.relative_volume)
  if (rv >= 5) return 'extreme'
  if (rv >= 3) return 'high'
  if (rv >= 2) return 'medium'
  return ''
})

const rvBarWidth = computed(() => {
  const rv = parseFloat(props.quoteData?.relative_volume)
  if (!isFinite(rv)) return '0%'
  return `${Math.min((rv / 5) * 100, 100)}%`
})

const rvBarColor = computed(() => {
  const rv = parseFloat(props.quoteData?.relative_volume)
  if (!isFinite(rv)) return '#22c55e'
  if (rv >= 5) return '#dc2626'
  if (rv >= 3) return '#f97316'
  if (rv >= 2) return '#eab308'
  return '#22c55e'
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
.eqv4-chip-val.extreme { color: #dc2626; }
.eqv4-chip-val.high    { color: #f97316; }
.eqv4-chip-val.medium  { color: #eab308; }
.eqv4-rv-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.eqv4-rv-bar-wrap { flex: 1; height: 6px; background: var(--surface, #141420); border-radius: 3px; overflow: hidden; border: 1px solid var(--border, #2d2d3d); }
.eqv4-rv-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
.eqv4-rv-val { font-family: 'Roboto Mono', monospace; font-size: 12px; color: var(--text-primary, #e2e8f0); min-width: 36px; text-align: right; }
.eqv4-rv-val.extreme { color: #dc2626; }
.eqv4-rv-val.high    { color: #f97316; }
.eqv4-rv-val.medium  { color: #eab308; }
</style>
