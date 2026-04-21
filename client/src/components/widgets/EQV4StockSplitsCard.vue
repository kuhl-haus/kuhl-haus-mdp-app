<template>
  <div class="eqv4-splits-card">

    <!-- Card header: label + refresh + X (edit mode) -->
    <div class="eqv4-splits-header">
      <span class="eqv4-splits-label">Stock Splits</span>
      <div class="eqv4-splits-controls">
        <button
          class="eqv4-splits-refresh"
          :class="{ 'eqv4-splits-refresh--spinning': loading }"
          title="Refresh splits"
          :disabled="loading"
          @click="fetchSplits"
        >↻</button>
        <button
          v-if="!isLocked"
          class="eqv4-splits-remove"
          title="Remove card"
          @click="emit('remove')"
        >✕</button>
      </div>
    </div>

    <!-- Column header -->
    <div class="eqv4-splits-thead">
      <div class="eqv4-sth eqv4-sth-date">Date</div>
      <div class="eqv4-sth eqv4-sth-type">Type</div>
      <div class="eqv4-sth eqv4-sth-ratio">Ratio</div>
    </div>

    <!-- States -->
    <div v-if="!ticker" class="eqv4-splits-empty">Enter a ticker to load splits</div>
    <div v-else-if="error" class="eqv4-splits-error">
      {{ error }}
      <button class="eqv4-retry-btn" @click="fetchSplits">↻ Retry</button>
    </div>
    <div v-else-if="loading && splits.length === 0" class="eqv4-splits-empty">
      <span class="eqv4-splits-spinner">↻</span> Loading…
    </div>
    <div v-else-if="!loading && splits.length === 0 && ticker" class="eqv4-splits-empty">
      No splits found for {{ ticker }}
    </div>

    <!-- Data rows -->
    <div v-else class="eqv4-splits-body">
      <div v-for="(s, i) in splits" :key="i" class="eqv4-splits-row">
        <div class="eqv4-std eqv4-std-date">{{ s.execution_date }}</div>
        <div class="eqv4-std eqv4-std-type">{{ humanizeType(s.adjustment_type) }}</div>
        <div class="eqv4-std eqv4-std-ratio">{{ s.split_to }}:{{ s.split_from }}</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useConfig } from '@/composables/useConfig.js'

const props = defineProps({
  ticker:   { type: String,  default: null },
  isLocked: { type: Boolean, default: true },
})

const emit = defineEmits(['remove'])

const { config } = useConfig()

// ── State ─────────────────────────────────────────────────────────────────────
const splits  = ref([])
const loading = ref(false)
const error   = ref(null)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchSplits = async () => {
  if (!props.ticker) return
  loading.value = true
  error.value = null
  splits.value = []
  try {
    const key = config.value?.massiveApiKey
    const url = `https://api.massive.com/stocks/v1/splits?ticker=${props.ticker}&limit=5&sort=execution_date.desc&apiKey=${key}`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    splits.value = json.results ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(() => props.ticker, (t) => { if (t) fetchSplits() }, { immediate: true })

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  forward_split:  'Forward',
  reverse_split:  'Reverse',
  stock_dividend: 'Stock Div',
}
const humanizeType = (type) => TYPE_LABELS[type] ?? type

// ── Expose ────────────────────────────────────────────────────────────────────
defineExpose({ splits, loading, error, fetchSplits })
</script>

<style scoped>
.eqv4-splits-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg, #0d0d12);
  color: var(--text-primary, #e2e8f0);
  font-family: system-ui, sans-serif;
}

/* ── Header ── */
.eqv4-splits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border, #2d2d3d);
  background: var(--bg, #0d0d12);
  flex-shrink: 0;
}
.eqv4-splits-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.eqv4-splits-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.eqv4-splits-refresh {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s;
}
.eqv4-splits-refresh:hover { color: var(--pd-accent, #7c3aed); }
.eqv4-splits-refresh--spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.eqv4-splits-remove {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.eqv4-splits-remove:hover { color: #ef4444; }

/* ── Column header ── */
.eqv4-splits-thead {
  display: flex;
  border-bottom: 1px solid var(--border, #2d2d3d);
  flex-shrink: 0;
  background: var(--bg, #0d0d12);
}
.eqv4-sth {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
}
.eqv4-sth-date  { width: 90px; flex-shrink: 0; }
.eqv4-sth-type  { width: 72px; flex-shrink: 0; }
.eqv4-sth-ratio { flex: 1; min-width: 0; }

/* ── Empty / error states ── */
.eqv4-splits-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-muted, #64748b);
  font-style: italic;
  padding: 8px;
  text-align: center;
}
.eqv4-splits-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
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
.eqv4-splits-spinner {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Data rows ── */
.eqv4-splits-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.eqv4-splits-row {
  display: flex;
  align-items: center;
  height: 22px;
  border-bottom: 1px solid var(--border, #2d2d3d);
}
.eqv4-splits-row:hover { background: var(--surface, #141420); }
.eqv4-std {
  font-size: 11px;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-std-date  { width: 90px; flex-shrink: 0; color: var(--text-muted, #64748b); }
.eqv4-std-type  { width: 72px; flex-shrink: 0; }
.eqv4-std-ratio { flex: 1; min-width: 0; }
</style>
