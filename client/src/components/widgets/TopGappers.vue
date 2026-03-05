<template>
  <div class="scanner-widget top-gappers">
    <div class="scanner-controls">
      <label for="gapVolumeThreshold">Volume</label>
      <select id="gapVolumeThreshold" v-model="volumeThreshold" class="filter-select">
        <option value="10">10K+ Volume</option>
        <option value="100">100K+ Volume</option>
        <option value="1000">1M+ Volume</option>
        <option value="5000">5M+ Volume</option>
        <option value="10000">10M+ Volume</option>
        <option value="50000">50M+ Volume</option>
        <option value="100000">100M+ Volume</option>
      </select>
      <label for="gapMinPriceThreshold">Min Price</label>
      <select id="gapMinPriceThreshold" v-model="minPriceThreshold" class="filter-select">
        <option value="0">$0</option>
        <option value="1">$1</option>
        <option value="2">$2</option>
        <option value="3">$3</option>
        <option value="5">$5</option>
        <option value="8">$8</option>
        <option value="10">$10</option>
        <option value="15">$15</option>
        <option value="20">$20</option>
        <option value="100">$100</option>
      </select>
      <label for="gapMaxPriceThreshold">Max Price</label>
      <select id="gapMaxPriceThreshold" v-model="maxPriceThreshold" class="filter-select">
        <option value="1">$1</option>
        <option value="2">$2</option>
        <option value="3">$3</option>
        <option value="5">$5</option>
        <option value="8">$8</option>
        <option value="10">$10</option>
        <option value="15">$15</option>
        <option value="20">$20</option>
        <option value="100">$100</option>
        <option value="1000000000">$100B+</option>
      </select>
      <label for="gapRelVolumeThreshold">Rel. Vol.</label>
      <input id="gapRelVolumeThreshold" v-model.number="relVolumeThreshold" type="number" placeholder="Min Relative Volume" class="filter-input" />
      <label for="gapMinChangePercent">Change</label>
      <input id="gapMinChangePercent" v-model.number="minChangePercent" type="number" placeholder="Min Change %" class="filter-input" />
    </div>

    <GenericScannerTable
        :data="filteredData"
        :columns="columns"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        :row-class-fn="getRowClass"
        @sort="sortBy"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import GenericScannerTable from './GenericScannerTable.vue'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'

const appConfig = window.__APP_CONFIG__ || {}
const marketData = reactive([])

const toNum = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const sortKey = ref('pct_change')
const sortDir = ref('desc')
const volumeThreshold = ref('100')
const relVolumeThreshold = ref('5')
const minPriceThreshold = ref(2)
const maxPriceThreshold = ref(20)
const minChangePercent = ref(10)

// Initialize WebSocket client
const { connect, lastDataAt } = useWebSocketClient({
  wsUrl: appConfig.wsEndpoint || 'ws://localhost:4202/ws',
  authKey: appConfig.apiKey || 'secret',
  feedName: 'scanners:top_gappers',
  cacheKey: 'scanners:top_gappers',
  onData: (data) => Object.assign(marketData, data),
  autoConnect: true
})

defineExpose({ lastDataAt })

const getRelVolClass = (relVol) => {
  if (relVol >= 5) return 'extreme'
  if (relVol >= 3) return 'high'
  if (relVol >= 2) return 'medium'
  return 'normal'
}

const formatVolume = (vol) => {
  if (vol >= 1000000000) return `${(vol / 1000000000).toFixed(1)}B`
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`
  return vol.toString()
}

const columns = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'close', label: 'Price', decimals: 2 },
  {
    key: 'change',
    label: 'Change',
    decimals: 2,
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
    sortDir.value = ['pct_change', 'relative_volume'].includes(key) ? 'desc' : 'asc'
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
      (minChangePercent.value === null || Math.abs(item.pct_change) >= minChangePercent.value)
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
.top-gappers {
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
</style>
