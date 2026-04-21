<template>
  <div class="eqv4-edgar-card">

    <!-- Card header: label + filing count selector + refresh + X (edit mode) -->
    <div class="eqv4-edgar-header">
      <span class="eqv4-edgar-label">SEC EDGAR</span>
      <div class="eqv4-edgar-controls">
        <select
          :value="filingCount"
          class="eqv4-edgar-count-select"
          title="Number of filings"
          @change="onFilingCountChange"
        >
          <option v-for="n in FILING_COUNT_OPTIONS" :key="n" :value="n">{{ n }}</option>
        </select>
        <button
          class="eqv4-edgar-refresh"
          :class="{ 'eqv4-edgar-refresh--spinning': loading }"
          title="Refresh filings"
          :disabled="loading"
          @click="fetchFilings"
        >↻</button>
        <button
          v-if="!isLocked"
          class="eqv4-edgar-remove"
          title="Remove card"
          @click="emit('remove')"
        >✕</button>
      </div>
    </div>

    <!-- Column header -->
    <div class="eqv4-edgar-thead">
      <div class="eqv4-eth eqv4-eth-date">Date</div>
      <div class="eqv4-eth eqv4-eth-form">Form Type</div>
    </div>

    <!-- States -->
    <div v-if="!ticker" class="eqv4-edgar-empty">Enter a ticker to load filings</div>
    <div v-else-if="error" class="eqv4-edgar-error">
      {{ error }}
      <button class="eqv4-retry-btn" @click="fetchFilings">↻ Retry</button>
    </div>
    <div v-else-if="loading && filings.length === 0" class="eqv4-edgar-empty">
      <span class="eqv4-edgar-spinner">↻</span> Loading…
    </div>
    <div v-else-if="!loading && filings.length === 0 && ticker" class="eqv4-edgar-empty">
      No filings found for {{ ticker }}
    </div>

    <!-- Data rows -->
    <div v-else class="eqv4-edgar-body">
      <div v-for="(f, i) in filings" :key="i" class="eqv4-edgar-row">
        <div class="eqv4-etd eqv4-etd-date">{{ f.filing_date }}</div>
        <div class="eqv4-etd eqv4-etd-form">
          <a
            :href="edgarIndexUrl(f)"
            target="_blank"
            rel="noopener"
            class="eqv4-edgar-link"
          >{{ f.form_type }}</a>
          <a
            :href="f.filing_url"
            target="_blank"
            rel="noopener"
            class="eqv4-edgar-raw-link"
            title="Raw filing (.txt)"
          >txt</a>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useConfig } from '@/composables/useConfig.js'

const FILING_COUNT_OPTIONS = [5, 10, 25, 50, 100]

const props = defineProps({
  ticker:       { type: String,  default: null },
  isLocked:     { type: Boolean, default: true },
  filingCount:  { type: Number,  default: 10 },
})

const emit = defineEmits(['update-filing-count', 'remove'])

const { config } = useConfig()

// ── State ─────────────────────────────────────────────────────────────────────
const filings = ref([])
const loading = ref(false)
const error   = ref(null)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchFilings = async () => {
  if (!props.ticker) return
  loading.value = true
  error.value = null
  filings.value = []
  try {
    const key = config.value?.massiveApiKey
    const url = `https://api.massive.com/stocks/filings/vX/index?ticker=${props.ticker}&limit=${props.filingCount}&sort=filing_date.desc&apiKey=${key}`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    filings.value = json.results ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(() => props.ticker, (t) => { if (t) fetchFilings() }, { immediate: true })
watch(() => props.filingCount, () => { if (props.ticker) fetchFilings() })

// ── Controls ──────────────────────────────────────────────────────────────────
const onFilingCountChange = (e) => {
  emit('update-filing-count', parseInt(e.target.value, 10))
}

// ── Expose ────────────────────────────────────────────────────────────────────
// SEC EDGAR serves filing_url with Content-Type: text/plain, which browsers
// render as raw text regardless of actual HTML content. The filing index page
// (.../accession_nodash/accession-index.htm) is served as text/html and links
// to all documents in the filing with proper formatting.
const edgarIndexUrl = (filing) => {
  const accessionNodash = filing.accession_number?.replace(/-/g, '') ?? ''
  return `https://www.sec.gov/Archives/edgar/data/${filing.cik}/${accessionNodash}/${filing.accession_number}-index.htm`
}

defineExpose({ filings, loading, error, fetchFilings, edgarIndexUrl })
</script>

<style scoped>
.eqv4-edgar-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg, #0d0d12);
  color: var(--text-primary, #e2e8f0);
  font-family: system-ui, sans-serif;
}

/* ── Header ── */
.eqv4-edgar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border, #2d2d3d);
  background: var(--bg, #0d0d12);
  flex-shrink: 0;
}
.eqv4-edgar-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.eqv4-edgar-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.eqv4-edgar-count-select {
  background: var(--surface, #141420);
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 3px;
  color: var(--text-muted, #64748b);
  font-size: 11px;
  padding: 1px 3px;
  cursor: pointer;
}
.eqv4-edgar-refresh {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s;
}
.eqv4-edgar-refresh:hover { color: var(--pd-accent, #7c3aed); }
.eqv4-edgar-refresh--spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.eqv4-edgar-remove {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.eqv4-edgar-remove:hover { color: #ef4444; }

/* ── Column header ── */
.eqv4-edgar-thead {
  display: flex;
  border-bottom: 1px solid var(--border, #2d2d3d);
  flex-shrink: 0;
  background: var(--bg, #0d0d12);
}
.eqv4-eth {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
}
.eqv4-eth-date { width: 90px; flex-shrink: 0; }
.eqv4-eth-form { flex: 1; min-width: 0; }

/* ── Empty / error states ── */
.eqv4-edgar-empty {
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
.eqv4-edgar-error {
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
.eqv4-edgar-spinner {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Data rows ── */
.eqv4-edgar-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.eqv4-edgar-row {
  display: flex;
  align-items: center;
  height: 22px;
  border-bottom: 1px solid var(--border, #2d2d3d);
}
.eqv4-edgar-row:hover { background: var(--surface, #141420); }
.eqv4-etd {
  font-size: 11px;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-etd-date { width: 90px; flex-shrink: 0; color: var(--text-muted, #64748b); }
.eqv4-etd-form { flex: 1; min-width: 0; }
.eqv4-edgar-link {
  color: var(--pd-accent, #7c3aed);
  text-decoration: none;
  font-size: 11px;
}
.eqv4-edgar-link:hover { text-decoration: underline; }
.eqv4-edgar-raw-link {
  color: var(--text-muted, #64748b);
  font-size: 10px;
  text-decoration: none;
  margin-left: 5px;
  flex-shrink: 0;
  opacity: 0.6;
}
.eqv4-edgar-raw-link:hover { text-decoration: underline; opacity: 1; }
</style>
