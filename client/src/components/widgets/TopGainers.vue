<template>
  <div class="scanner-widget top-gainers">
    <div class="scanner-controls">
      <label for="gainVolumeThreshold">Volume</label>
      <select id="gainVolumeThreshold" v-model="volumeThreshold" class="filter-select">
        <option value="10">10K+ Volume</option>
        <option value="50">50K+ Volume</option>
        <option value="100">100K+ Volume</option>
        <option value="250">250K+ Volume</option>
        <option value="500">500K+ Volume</option>
        <option value="750">750K+ Volume</option>
        <option value="1000">1M+ Volume</option>
        <option value="2000">2M+ Volume</option>
        <option value="5000">5M+ Volume</option>
        <option value="10000">10M+ Volume</option>
        <option value="25000">25M+ Volume</option>
        <option value="50000">50M+ Volume</option>
        <option value="100000">100M+ Volume</option>
      </select>
      <label for="gainMinPriceThreshold">Min Price</label>
      <select id="gainMinPriceThreshold" v-model="minPriceThreshold" class="filter-select">
        <option value="0">$0</option>
        <option value="1">$1</option>
        <option value="2">$2</option>
        <option value="3">$3</option>
        <option value="5">$5</option>
        <option value="8">$8</option>
        <option value="10">$10</option>
        <option value="15">$15</option>
        <option value="20">$20</option>
        <option value="25">$25</option>
        <option value="50">$50</option>
        <option value="75">$75</option>
        <option value="100">$100</option>
        <option value="125">$125</option>
        <option value="150">$150</option>
        <option value="200">$200</option>
        <option value="250">$250</option>
        <option value="300">$300</option>
        <option value="400">$400</option>
        <option value="500">$500</option>
        <option value="1000">$1K+</option>
      </select>
      <label for="gainMaxPriceThreshold">Max Price</label>
      <select id="gainMaxPriceThreshold" v-model="maxPriceThreshold" class="filter-select">
        <option value="1">$1</option>
        <option value="2">$2</option>
        <option value="3">$3</option>
        <option value="5">$5</option>
        <option value="8">$8</option>
        <option value="10">$10</option>
        <option value="15">$15</option>
        <option value="20">$20</option>
        <option value="25">$25</option>
        <option value="50">$50</option>
        <option value="75">$75</option>
        <option value="100">$100</option>
        <option value="125">$125</option>
        <option value="150">$150</option>
        <option value="200">$200</option>
        <option value="250">$250</option>
        <option value="300">$300</option>
        <option value="400">$400</option>
        <option value="500">$500</option>
        <option value="1000">$1K</option>
        <option value="1000000000">$100B+</option>
      </select>
      <label for="gainRelVolumeThreshold">Rel. Vol.</label>
      <input id="gainRelVolumeThreshold" v-model.number="relVolumeThreshold" type="number" placeholder="Min Relative Volume" class="filter-input" />
      <label for="gainMinChangePercent">Change</label>
      <input id="gainMinChangePercent" v-model.number="minChangePercent" type="number" placeholder="Min Change %" class="filter-input" />
      <!-- Column visibility gear menu -->
      <div class="col-menu-wrap" ref="colMenuRef">
        <button class="col-menu-btn" @click="showColMenu = !showColMenu" title="Show/hide columns">⚙️</button>
        <div v-if="showColMenu" class="col-menu-popover">
          <div class="col-menu-title">Columns</div>
          <label v-for="col in columns" :key="col.key" class="col-menu-item">
            <input
              type="checkbox"
              :checked="!hiddenCols.includes(col.key)"
              :disabled="col.key === 'symbol'"
              @change="toggleCol(col.key, $event.target.checked)"
            />
            {{ col.label }}
          </label>
        </div>
      </div>
    </div>

    <GenericScannerTable
        :data="filteredData"
        :columns="columns"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        :row-class-fn="getRowClass"
        :active-ticker="activeTicker"
        :is-locked="isLocked"
        :col-widths="colWidths"
        :hidden-cols="hiddenCols"
        @update-col-widths="$emit('update-col-widths', $event)"
        @sort="sortBy"
        @row-click="onRowClick"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import GenericScannerTable from './GenericScannerTable.vue'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useScannerLink } from '@/composables/useScannerLink.js'

const emit = defineEmits(['update-settings', 'update-col-widths'])
const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  colWidths:  { type: Object,  default: () => ({}) },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

const appConfig = window.__APP_CONFIG__ || {}
const marketData = reactive([])
const { activeTicker, onRowClick } = useScannerLink(computed(() => props.linkColor))

const toNum = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const sortKey = ref('pct_change_since_open')
const sortDir = ref('desc')
const volumeThreshold = ref(props.settings.volumeThreshold ?? '100')
const relVolumeThreshold = ref(props.settings.relVolumeThreshold ?? '5')
const minPriceThreshold = ref(props.settings.minPriceThreshold ?? 2)
const maxPriceThreshold = ref(props.settings.maxPriceThreshold ?? 20)
const minChangePercent = ref(props.settings.minChangePercent ?? 10)


// Column visibility
const hiddenCols = ref(props.settings.hiddenCols ?? [])
const showColMenu = ref(false)

// Sync all filter state when settings prop changes (layout load after refresh)
watch(() => props.settings, (s) => {
  volumeThreshold.value    = s.volumeThreshold    ?? '100'
  relVolumeThreshold.value = s.relVolumeThreshold ?? '5'
  minPriceThreshold.value  = s.minPriceThreshold  ?? 2
  maxPriceThreshold.value  = s.maxPriceThreshold  ?? 20
  minChangePercent.value   = s.minChangePercent   ?? 10
  hiddenCols.value         = s.hiddenCols         ?? []
})

const colMenuRef = ref(null)

const handleClickOutside = (e) => {
  if (colMenuRef.value && !colMenuRef.value.contains(e.target)) {
    showColMenu.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

const toggleCol = (key, visible) => {
  if (key === 'symbol') return  // symbol is always visible
  if (visible) {
    hiddenCols.value = hiddenCols.value.filter(k => k !== key)
  } else {
    if (!hiddenCols.value.includes(key)) {
      hiddenCols.value = [...hiddenCols.value, key]
    }
  }
}


// Persist filter settings to layout
watch(
  [() => [...hiddenCols.value],
   () => volumeThreshold.value, () => relVolumeThreshold.value, () => minPriceThreshold.value, () => maxPriceThreshold.value, () => minChangePercent.value],
  () => {
    emit('update-settings', { hiddenCols: hiddenCols.value, volumeThreshold: volumeThreshold.value, relVolumeThreshold: relVolumeThreshold.value, minPriceThreshold: minPriceThreshold.value, maxPriceThreshold: maxPriceThreshold.value, minChangePercent: minChangePercent.value })
  }
)
const { lastDataAt, isConnected, reconnecting } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: 'scanners:top_gainers',
  cacheKey: 'scanners:top_gainers',
  onData: (data) => Object.assign(marketData, data),
  autoConnect: true
})

defineExpose({ lastDataAt, isConnected, reconnecting })

const getRelVolClass = (relVol) => {
  if (relVol >= 5) return 'extreme'
  if (relVol >= 3) return 'high'
  if (relVol >= 2) return 'medium'
  return 'normal'
}

const formatVolume = (vol) => {
  const v = toNum(vol)
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toString()
}

const columns = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'close', label: 'Price', decimals: 2 },
  {
    key: 'change',
    label: 'Change',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}` },
    cellClass: (row) => toNum(row.change) >= 0 ? 'positive' : 'negative'
  },
  {
    key: 'pct_change',
    label: 'Change %',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    cellClass: (row) => toNum(row.pct_change) >= 0 ? 'positive' : 'negative'
  },
  {
    key: 'pct_change_since_open',
    label: 'Change %<br>(Open)',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    cellClass: (row) => toNum(row.pct_change_since_open) >= 0 ? 'positive' : 'negative'
  },
  { key: 'accumulated_volume', label: 'Volume' },
  { key: 'free_float', label: 'Float', format: (val) => formatVolume(val) },
  {
    key: 'relative_volume',
    label: 'Rel. Vol.',
    format: (val) => `${toNum(val).toFixed(2)}x`,
    cellClass: (row) => getRelVolClass(toNum(row.relative_volume))
  },
  { key: 'avg_volume', label: 'Avg Vol', format: (val) => formatVolume(val) },
  { key: 'prev_day_volume', label: 'PD Vol', format: (val) => formatVolume(val) },
  { key: 'official_open_price', label: 'Day Open', decimals: 2 },
  { key: 'prev_day_close', label: 'PD Close', decimals: 2 },
  { key: 'aggregate_vwap', label: 'VWAP', decimals: 2 },
  { key: 'prev_day_vwap', label: 'PD VWAP', decimals: 2 }
]

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = ['pct_change_since_open', 'relative_volume'].includes(key) ? 'desc' : 'asc'
  }
}

const filteredData = computed(() => {
  if (!marketData.length) return []

  let filtered = [...marketData]
  const minPrice = parseFloat(minPriceThreshold.value)
  const maxPrice = parseFloat(maxPriceThreshold.value)
  const threshold = parseInt(volumeThreshold.value) * 1000
  const relThreshold = parseInt(relVolumeThreshold.value)

  filtered = filtered.filter(item =>
      item.close >= minPrice &&
      item.close <= maxPrice &&
      item.accumulated_volume >= threshold &&
      item.relative_volume >= relThreshold &&
      (minChangePercent.value === null || Math.abs(item.pct_change_since_open) >= minChangePercent.value)
  )

  return filtered.sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDir.value === 'asc' ? comparison : -comparison
  })
})

const getRowClass = (row) => {
  if (row.pct_change >= 100) return 'hundred-percent-gainer'
  if (row.pct_change >= 50) return 'fifty-percent-gainer'
  if (row.pct_change >= 20) return 'twenty-percent-gainer'
  if (row.pct_change >= 10) return 'ten-percent-gainer'
}
</script>

<style scoped>
.top-gainers {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.scanner-controls {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  flex-wrap: wrap;
}

.scanner-controls label {
  display: block;
  margin-bottom: 4px;
}

.filter-select {
  padding: 6px 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  min-width: 120px;
}

.filter-input {
  flex: 1;
  min-width: 100px;
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

.scanner-widget {
  height: 100%;
  overflow: auto;
}
.col-menu-wrap {
  position: relative;
}

.col-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}
.col-menu-btn:hover { background: #2a2a2a; }

.col-menu-popover {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px;
  min-width: 160px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.col-menu-title {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #2a2a2a;
}

.col-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ccc;
  padding: 3px 0;
  cursor: pointer;
  user-select: none;
}
.col-menu-item input { cursor: pointer; }
.col-menu-item:has(input:disabled) { opacity: 0.4; cursor: default; }
</style>
