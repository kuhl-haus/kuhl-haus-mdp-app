<template>
  <div class="eqv4-events-card">

    <!-- Card header: label + entity name subtitle + refresh + X (edit mode) -->
    <div class="eqv4-events-header">
      <div class="eqv4-events-header-left">
        <span class="eqv4-events-label">Ticker Events</span>
        <span v-if="entityName" class="eqv4-events-subtitle">{{ entityName }}</span>
      </div>
      <div class="eqv4-events-controls">
        <button
          class="eqv4-events-refresh"
          :class="{ 'eqv4-events-refresh--spinning': loading }"
          title="Refresh events"
          :disabled="loading"
          @click="fetchEvents"
        >↻</button>
        <button
          v-if="!isLocked"
          class="eqv4-events-remove"
          title="Remove card"
          @click="emit('remove')"
        >✕</button>
      </div>
    </div>

    <!-- Column header -->
    <div class="eqv4-events-thead">
      <div class="eqv4-evth eqv4-evth-date">Date</div>
      <div class="eqv4-evth eqv4-evth-transition">Transition</div>
    </div>

    <!-- States -->
    <div v-if="!ticker" class="eqv4-events-empty">Enter a ticker to load events</div>
    <div v-else-if="error" class="eqv4-events-error">
      {{ error }}
      <button class="eqv4-retry-btn" @click="fetchEvents">↻ Retry</button>
    </div>
    <div v-else-if="loading && transitions.length === 0" class="eqv4-events-empty">
      <span class="eqv4-events-spinner">↻</span> Loading…
    </div>
    <div v-else-if="!loading && transitions.length === 0 && ticker" class="eqv4-events-empty">
      No events found for {{ ticker }}
    </div>

    <!-- Data rows -->
    <div v-else class="eqv4-events-body">
      <div v-for="(t, i) in transitions" :key="i" class="eqv4-events-row">
        <div class="eqv4-evtd eqv4-evtd-date">{{ t.date }}</div>
        <div class="eqv4-evtd eqv4-evtd-transition">
          <span v-if="t.from">{{ t.from }} → {{ t.to }}</span>
          <span v-else>{{ t.to }} (original)</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useConfig } from '@/composables/useConfig.js'

const props = defineProps({
  ticker:   { type: String,  default: null },
  isLocked: { type: Boolean, default: true },
})

const emit = defineEmits(['remove'])

const { config } = useConfig()

// ── State ─────────────────────────────────────────────────────────────────────
const events     = ref([])
const entityName = ref(null)
const loading    = ref(false)
const error      = ref(null)

// ── Transitions (pre-render pass: newest-first, from = events[i+1]) ───────────
const transitions = computed(() =>
  events.value.map((event, i) => ({
    date: event.date,
    to:   event.ticker_change?.ticker ?? null,
    from: events.value[i + 1]?.ticker_change?.ticker ?? null,
  }))
)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchEvents = async () => {
  if (!props.ticker) return
  loading.value = true
  error.value = null
  events.value = []
  entityName.value = null
  try {
    const key = config.value?.massiveApiKey
    const url = `https://api.massive.com/vX/reference/tickers/${props.ticker}/events?apiKey=${key}`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    entityName.value = json.results?.name ?? null
    events.value = json.results?.events ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(() => props.ticker, (t) => { if (t) fetchEvents() }, { immediate: true })

// ── Expose ────────────────────────────────────────────────────────────────────
defineExpose({ events, transitions, entityName, loading, error, fetchEvents })
</script>

<style scoped>
.eqv4-events-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg, #0d0d12);
  color: var(--text-primary, #e2e8f0);
  font-family: system-ui, sans-serif;
}

/* ── Header ── */
.eqv4-events-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border, #2d2d3d);
  background: var(--bg, #0d0d12);
  flex-shrink: 0;
}
.eqv4-events-header-left {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.eqv4-events-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.eqv4-events-subtitle {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eqv4-events-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.eqv4-events-refresh {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s;
}
.eqv4-events-refresh:hover { color: var(--pd-accent, #7c3aed); }
.eqv4-events-refresh--spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.eqv4-events-remove {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.eqv4-events-remove:hover { color: #ef4444; }

/* ── Column header ── */
.eqv4-events-thead {
  display: flex;
  border-bottom: 1px solid var(--border, #2d2d3d);
  flex-shrink: 0;
  background: var(--bg, #0d0d12);
}
.eqv4-evth {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
}
.eqv4-evth-date       { width: 90px; flex-shrink: 0; }
.eqv4-evth-transition { flex: 1; min-width: 0; }

/* ── Empty / error states ── */
.eqv4-events-empty {
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
.eqv4-events-error {
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
.eqv4-events-spinner {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Data rows ── */
.eqv4-events-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.eqv4-events-row {
  display: flex;
  align-items: center;
  height: 22px;
  border-bottom: 1px solid var(--border, #2d2d3d);
}
.eqv4-events-row:hover { background: var(--surface, #141420); }
.eqv4-evtd {
  font-size: 11px;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-evtd-date       { width: 90px; flex-shrink: 0; color: var(--text-muted, #64748b); }
.eqv4-evtd-transition { flex: 1; min-width: 0; }
</style>
