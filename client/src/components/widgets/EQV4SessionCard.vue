<template>
  <div class="eqv4-card-body">
    <template v-if="chipsMode">
      <div class="eqv4-session-chips">
        <div class="eqv4-session-chip">
          <span class="eqv4-chip-label">PRE</span>
          <div v-if="quoteData.pre_market_high != null || quoteData.pre_market_low != null" class="eqv4-session-chip-vals">
            <span>H: ${{ fmt(quoteData.pre_market_high, 2) }}</span>
            <span>L: ${{ fmt(quoteData.pre_market_low, 2) }}</span>
          </div>
          <div v-else class="eqv4-session-chip-vals eqv4-muted-val">—</div>
        </div>
        <div class="eqv4-session-chip">
          <span class="eqv4-chip-label">REG</span>
          <div v-if="quoteData.regular_session_high != null || quoteData.regular_session_low != null" class="eqv4-session-chip-vals">
            <span>H: ${{ fmt(quoteData.regular_session_high, 2) }}</span>
            <span>L: ${{ fmt(quoteData.regular_session_low, 2) }}</span>
          </div>
          <div v-else class="eqv4-session-chip-vals eqv4-muted-val">—</div>
        </div>
        <div class="eqv4-session-chip">
          <span class="eqv4-chip-label">AH</span>
          <div v-if="quoteData.after_hours_high != null || quoteData.after_hours_low != null" class="eqv4-session-chip-vals">
            <span>H: ${{ fmt(quoteData.after_hours_high, 2) }}</span>
            <span>L: ${{ fmt(quoteData.after_hours_low, 2) }}</span>
          </div>
          <div v-else class="eqv4-session-chip-vals eqv4-muted-val">—</div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="eqv4-kv-list">
        <div class="eqv4-kv"><span class="eqv4-k">Pre High</span><span class="eqv4-v">{{ quoteData.pre_market_high != null ? '$' + fmt(quoteData.pre_market_high, 2) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Pre Low</span><span class="eqv4-v">{{ quoteData.pre_market_low != null ? '$' + fmt(quoteData.pre_market_low, 2) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Reg High</span><span class="eqv4-v">{{ quoteData.regular_session_high != null ? '$' + fmt(quoteData.regular_session_high, 2) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">Reg Low</span><span class="eqv4-v">{{ quoteData.regular_session_low != null ? '$' + fmt(quoteData.regular_session_low, 2) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">AH High</span><span class="eqv4-v">{{ quoteData.after_hours_high != null ? '$' + fmt(quoteData.after_hours_high, 2) : '—' }}</span></div>
        <div class="eqv4-kv"><span class="eqv4-k">AH Low</span><span class="eqv4-v">{{ quoteData.after_hours_low != null ? '$' + fmt(quoteData.after_hours_low, 2) : '—' }}</span></div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  quoteData:  { type: Object,  required: true },
  isLocked:   { type: Boolean, default: true },
  chipsMode:  { type: Boolean, default: false },
})

const fmt = (val, decimals = 2) => {
  const n = parseFloat(val)
  return isFinite(n) ? n.toFixed(decimals) : '—'
}
</script>

<style scoped>
.eqv4-card-body { height: 100%; overflow: auto; padding: 6px; box-sizing: border-box; }
.eqv4-kv-list { display: flex; flex-direction: column; gap: 2px; }
.eqv4-kv { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid var(--border, #2d2d3d); gap: 8px; }
.eqv4-k { color: var(--text-muted, #64748b); font-size: 13px; font-family: system-ui, sans-serif; flex-shrink: 0; }
.eqv4-v { font-family: 'Roboto Mono', monospace; font-size: 13px; color: var(--text-primary, #e2e8f0); text-align: right; }
.eqv4-session-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.eqv4-session-chip { display: flex; flex-direction: column; align-items: center; background: var(--surface, #141420); border: 1px solid var(--border, #2d2d3d); border-radius: 4px; padding: 4px 8px; min-width: 56px; gap: 2px; }
.eqv4-chip-label { font-size: 9px; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.eqv4-session-chip-vals { display: flex; flex-direction: column; align-items: center; font-family: 'Roboto Mono', monospace; font-size: 11px; color: var(--text-primary, #e2e8f0); gap: 1px; }
.eqv4-muted-val { color: var(--text-muted, #64748b); }
</style>
