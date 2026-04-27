<template>
  <div class="range-alerts-widget">
    <!-- Widget header: ticker filter (left) + mode toggle + gear (right) -->
    <div class="widget-header">
      <div class="ticker-filter-wrap">
        <input
          class="ticker-filter-input"
          :value="tickerFilter"
          @input="onTickerFilterInput($event.target.value)"
          placeholder="Filter ticker…"
          data-testid="ticker-filter-input"
        />
        <button
          v-if="tickerFilter"
          class="ticker-filter-clear"
          @click="clearTickerFilter"
          title="Clear ticker filter"
          data-testid="ticker-filter-clear"
        >✕</button>
      </div>
      <div class="header-actions">
        <button
          :class="['filter-btn', rowClickModeLocal === 'filter' ? 'filter-btn--active' : '']"
          @click="toggleRowClickMode"
          :title="rowClickModeLocal === 'filter' ? 'Row click: filter feed — click to switch to select mode' : 'Row click: select ticker — click to switch to filter mode'"
          data-testid="row-click-mode-toggle"
        >{{ rowClickModeLocal === 'filter' ? 'filter' : 'select' }}</button>
        <button class="col-menu-btn" @click="showControls = !showControls" title="Settings">⚙️</button>
      </div>
    </div>

    <!-- Collapsible controls panel (collapsed by default) -->
    <div v-if="showControls" class="controls-panel">
      <!-- Section 1: Feed configuration (destructive) -->
      <div class="controls-section controls-section--destructive">
        <span class="section-label">Feed</span>
        <select v-model="feedLocal" class="filter-select">
          <option value="hod">HOD — High of Day</option>
          <option value="lod">LOD — Low of Day</option>
        </select>
        <label class="filter-label">Max Events</label>
        <input
          type="number"
          step="1"
          :value="maxEventsInput"
          @input="maxEventsInput = $event.target.value"
          @change="onMaxEventsBlur"
          class="filter-input filter-input--narrow"
          data-testid="max-events-input"
        />
        <span class="helper-text">⚠️ Changing max events clears current data</span>
      </div>

      <!-- Section 2: View filters (reversible) -->
      <div class="controls-section">
        <label class="filter-label">Session</label>
        <select v-model="sessionFilterLocal" class="filter-select">
          <option value="">Any</option>
          <option value="pre">Pre-market</option>
          <option value="regular">Regular</option>
          <option value="after">After-hours</option>
        </select>

        <label class="filter-label">Min Price</label>
        <input type="number" v-model="minPriceLocal" @change="emitSettings" placeholder="Min $" class="filter-input filter-input--narrow" />
        <label class="filter-label">Max Price</label>
        <input type="number" v-model="maxPriceLocal" @change="emitSettings" placeholder="Max $" class="filter-input filter-input--narrow" />

        <label class="filter-label">Min Volume</label>
        <input type="text" v-model="minVolumeInput" @change="onShareCountChange" placeholder="e.g. 1 M" class="filter-input" />
        <label class="filter-label">Min Rel Vol</label>
        <input type="number" v-model="minRelVolLocal" @change="emitSettings" placeholder="Min Rel Vol" class="filter-input filter-input--narrow" />
        <label class="filter-label">Min Avg Vol</label>
        <input type="text" v-model="minAvgVolInput" @change="onShareCountChange" placeholder="e.g. 5 M" class="filter-input" />

        <label class="filter-label">Min Float</label>
        <input type="text" v-model="minFloatInput" @change="onShareCountChange" placeholder="e.g. 1 M" class="filter-input" />
        <label class="filter-label">Max Float</label>
        <input type="text" v-model="maxFloatInput" @change="onShareCountChange" placeholder="e.g. 100 M" class="filter-input" />

        <label class="filter-label">{{ feedLocal === 'hod' ? 'Min Change %' : 'Max Change %' }}</label>
        <input type="number" v-model="pctChangeLocal" @change="emitSettings" :placeholder="feedLocal === 'hod' ? 'Min %' : 'Max %'" class="filter-input filter-input--narrow" />
      </div>

      <!-- Column visibility & order -->
      <div class="col-menu-wrap">
        <div class="col-menu-title">Columns</div>
        <div v-for="(key, idx) in colOrderLocal" :key="key" class="col-menu-item">
          <input
            type="checkbox"
            :checked="!hiddenColsLocal.includes(key)"
            :disabled="key === 'symbol'"
            @change="toggleCol(key, $event.target.checked)"
          />
          <span class="col-menu-label">{{ columnByKey(key)?.label }}</span>
          <button class="col-order-btn" @click="moveCol(key, -1)" :disabled="idx === 0" title="Move up">▲</button>
          <button class="col-order-btn" @click="moveCol(key, 1)" :disabled="idx === colOrderLocal.length - 1" title="Move down">▼</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              :style="colStyle(col)"
              style="position: relative;"
            >
              {{ col.label }}
              <span
                v-if="!isLocked"
                class="col-resize-handle"
                @mousedown.prevent="startResize($event, col.key)"
                title="Drag to resize"
              ></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredEvents.length === 0">
            <td :colspan="visibleColumns.length" class="empty-state">
              {{ events.length === 0 ? 'No alerts yet' : 'No events match your filters' }}
            </td>
          </tr>
          <tr
            v-for="row in filteredEvents"
            :key="row._seq"
            :class="{ 'row-active': isRowActive(row) }"
            @click="handleRowClick(row)"
          >
            <td v-for="col in visibleColumns" :key="col.key" :class="getCellClass(col, row)">
              <template v-if="col.key === 'symbol'">
                <span class="symbol-cell">
                  {{ row.symbol }}
                  <img
                    v-if="getFlame(row.symbol)"
                    :src="getFlame(row.symbol).src"
                    :title="getFlame(row.symbol).tooltip"
                    width="14" height="14"
                    class="flame-icon"
                    @touchstart.passive="onFlameTouchStart($event, row.symbol)"
                    @touchend.passive="onFlameTouchEnd"
                    @touchmove.passive="onFlameTouchEnd"
                  />
                </span>
              </template>
              <template v-else>
                {{ formatCell(col, row) }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useScannerLink } from '@/composables/useScannerLink.js'
import { parseShareCount } from '@/utils/parseShareCount.js'
import { getFlameVariant, getFlameTooltip, newsTimestamps } from '@/composables/useWidgetBus.js'

const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  colWidths: { type: Object,  default: () => ({}) },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

const emit = defineEmits(['update-settings', 'update-col-widths'])

const appConfig = window.__APP_CONFIG__ || {}

const DEFAULT_SETTINGS = {
  feed:               'hod',
  maxEvents:          100,
  sessionFilter:      null,
  minPrice:           null,
  maxPrice:           null,
  minVolume:          null,
  minRelVol:          null,
  minAvgVol:          null,
  minFloat:           null,
  maxFloat:           null,
  pctChangeThreshold: null,
  hiddenCols:         [],
  colOrder:           [],
  colWidths:          {},
  rowClickMode:       'link',
}

const FEED_MAP = {
  hod: { feedName: 'daily_range_hod_alert', cacheKey: 'daily_range_hod_alert' },
  lod: { feedName: 'daily_range_lod_alert', cacheKey: 'daily_range_lod_alert' },
}

const config = computed(() => ({ ...DEFAULT_SETTINGS, ...props.settings }))

// ── In-memory event store ─────────────────────────────────────────────────────
// _seq must be declared inside <script setup> (per-instance, not module scope)
let _seq = 0
const events = ref([])

const enforceMaxEvents = () => {
  const maxEv = config.value.maxEvents
  if (maxEv > 0 && events.value.length > maxEv) {
    events.value = events.value.slice(0, maxEv)
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
const initFeed = FEED_MAP[config.value.feed] || FEED_MAP.hod

const { lastDataAt, isConnected, reconnecting, feedName, cacheKey, connect, disconnect } =
  useWebSocketClient({
    wsUrl:    appConfig.wsEndpoint || 'ws://localhost:4202/ws',
    authKey:  appConfig.apiKey     || 'secret',
    feedName: initFeed.feedName,
    cacheKey: initFeed.cacheKey,
    onData: (data) => {
      if (Array.isArray(data)) {
        // Cache hydration — sort timestamp DESC, then assign _seq
        const sorted = [...data].sort((a, b) => b.timestamp - a.timestamp)
        events.value = sorted.map(e => ({ ...e, _seq: _seq++ }))
      } else {
        // Live event — prepend
        events.value.unshift({ ...data, _seq: _seq++ })
      }
      enforceMaxEvents()
    },
    autoConnect: true,
  })

defineExpose({ lastDataAt, isConnected, reconnecting })

// ── Feed switching ────────────────────────────────────────────────────────────
watch(() => config.value.feed, (newFeed) => {
  const feed = FEED_MAP[newFeed] || FEED_MAP.hod
  disconnect()
  _seq = 0
  events.value = []
  feedName.value = feed.feedName
  cacheKey.value = feed.cacheKey
  connect()
}, { immediate: false })

// ── Filtering ─────────────────────────────────────────────────────────────────
const filteredEvents = computed(() => {
  const c = config.value
  return events.value.filter(e => {
    if (c.sessionFilter !== null && e.session !== c.sessionFilter) return false
    if (c.minPrice !== null && e.price < c.minPrice) return false
    if (c.maxPrice !== null && e.price > c.maxPrice) return false
    if (c.minVolume !== null && e.accumulated_volume < c.minVolume) return false
    if (tickerFilter.value && e.symbol.toUpperCase() !== tickerFilter.value) return false
    if (c.minRelVol !== null && e.relative_volume < c.minRelVol) return false
    if (c.minAvgVol !== null && e.avg_volume < c.minAvgVol) return false
    if (c.minFloat !== null && e.free_float < c.minFloat) return false
    if (c.maxFloat !== null && e.free_float > c.maxFloat) return false
    if (c.pctChangeThreshold !== null) {
      if (c.feed === 'hod' && e.pct_change < c.pctChangeThreshold) return false
      if (c.feed === 'lod' && e.pct_change > c.pctChangeThreshold) return false
    }
    return true
  })
})

// ── Row click / scanner link ──────────────────────────────────────────────────
const { activeTicker, onRowClick } = useScannerLink(computed(() => props.linkColor))

// ── Ticker filter (transient — not persisted) ───────────────────────────────
const tickerFilter    = ref('')
const filterSetByClick = ref(false)  // true only when filter set via row click; suppresses all-rows-highlighted noise when typing

const onTickerFilterInput = (val) => {
  tickerFilter.value = val.toUpperCase()
  filterSetByClick.value = false
}

const clearTickerFilter = () => {
  tickerFilter.value = ''
  filterSetByClick.value = false
}

// ── Row-click mode (persisted) ──────────────────────────────────────────────
const rowClickModeLocal = ref(config.value.rowClickMode ?? 'link')

const toggleRowClickMode = () => {
  rowClickModeLocal.value = rowClickModeLocal.value === 'link' ? 'filter' : 'link'
  emitSettings()  // explicit — NOT added to the auto-emit watcher
}

const handleRowClick = (row) => {
  if (rowClickModeLocal.value === 'filter') {
    const sym = row.symbol.toUpperCase()
    if (tickerFilter.value === sym) {
      clearTickerFilter()
    } else {
      tickerFilter.value = sym
      filterSetByClick.value = true
    }
  }
  onRowClick(row)  // always activate linked widgets
}

const isRowActive = (row) => {
  if (rowClickModeLocal.value === 'filter') {
    return filterSetByClick.value && tickerFilter.value === row.symbol.toUpperCase()
  }
  return activeTicker.value === row.symbol
}

// ── Flame freshness icons ───────────────────────────────────────────────────────
const FLAME_SRCS = {
  red:    new URL('@/assets/icons/flame-red.svg',    import.meta.url).href,
  orange: new URL('@/assets/icons/flame-orange.svg', import.meta.url).href,
  yellow: new URL('@/assets/icons/flame-yellow.svg', import.meta.url).href,
  white:  new URL('@/assets/icons/flame-white.svg',  import.meta.url).href,
  blue:   new URL('@/assets/icons/flame-blue.svg',   import.meta.url).href,
  dark:   new URL('@/assets/icons/flame-dark.svg',   import.meta.url).href,
}

const getFlame = (ticker) => {
  void newsTimestamps[ticker]  // reactive dependency
  const variant = getFlameVariant(ticker)
  if (!variant) return null
  return { src: FLAME_SRCS[variant], tooltip: getFlameTooltip(ticker) }
}

let flameLongPressTimer = null
const onFlameTouchStart = (e, ticker) => {
  flameLongPressTimer = setTimeout(() => {
    const tooltip = getFlameTooltip(ticker)
    if (tooltip) alert(tooltip)
  }, 500)
}
const onFlameTouchEnd = () => {
  if (flameLongPressTimer) { clearTimeout(flameLongPressTimer); flameLongPressTimer = null }
}

// ── Column definitions ────────────────────────────────────────────────────────
const toNum = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const formatVolume = (vol) => {
  const v = toNum(vol)
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}K`
  return v.toString()
}

const columns = [
  // Default visible
  {
    key: 'timestamp',
    label: 'Time',
    format: (val) => val == null ? '' : new Date(val * 1000).toLocaleTimeString('en-US', {
      hour12:  false,
      hour:    '2-digit',
      minute:  '2-digit',
      second:  '2-digit',
    }),
  },
  { key: 'symbol', label: 'Symbol' },
  { key: 'price',    label: 'Alert $', decimals: 2 },
  { key: 'previous', label: 'Prev $',  decimals: 2 },
  { key: 'note',     label: 'Note' },
  {
    key: 'pct_change',
    label: 'Change %',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    cellClass: (row) => toNum(row.pct_change) >= 0 ? 'positive' : 'negative',
  },
  { key: 'accumulated_volume', label: 'Volume',   format: (val) => formatVolume(val) },
  { key: 'relative_volume',    label: 'Rel Vol',  format: (val) => `${toNum(val).toFixed(2)}x`, cellClass: (row) => getRelVolClass(toNum(row.relative_volume)) },
  { key: 'session',            label: 'Session' },
  // Optional (hidden by default)
  { key: 'close',               label: 'Price (quote)',      decimals: 2 },
  {
    key: 'change',
    label: 'Change $',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}` },
    cellClass: (row) => toNum(row.change) >= 0 ? 'positive' : 'negative',
  },
  {
    key: 'pct_change_since_open',
    label: 'Change % (Open)',
    format: (val) => { const v = toNum(val); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    cellClass: (row) => toNum(row.pct_change_since_open) >= 0 ? 'positive' : 'negative',
  },
  { key: 'free_float',    label: 'Float',    format: (val) => formatVolume(val) },
  { key: 'avg_volume',    label: 'Avg Vol',  format: (val) => formatVolume(val) },
  { key: 'vwap',          label: 'VWAP',     decimals: 2 },
  { key: 'prev_day_close', label: 'PD Close', decimals: 2 },
  { key: 'direction',     label: 'Direction' },
]

// ── Column widths & resize ────────────────────────────────────────────────────
const localColWidths = ref({ ...props.colWidths })
watch(() => props.colWidths, (v) => { if (v) localColWidths.value = { ...v } })

const colStyle = (col) => {
  const w = localColWidths.value[col.key]
  return w ? { width: `${w}px`, minWidth: `${w}px` } : {}
}

let resizeState = null
const startResize = (e, colKey) => {
  if (props.isLocked) return
  const startWidth = localColWidths.value[colKey] || e.target.closest('th')?.offsetWidth || 80
  resizeState = { colKey, startX: e.clientX, startWidth }
  const onMove = (me) => {
    if (!resizeState) return
    const newWidth = Math.max(40, resizeState.startWidth + me.clientX - resizeState.startX)
    localColWidths.value = { ...localColWidths.value, [resizeState.colKey]: newWidth }
  }
  const onUp = () => {
    resizeState = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    emit('update-col-widths', { ...localColWidths.value })
    emitSettings()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
onUnmounted(() => { resizeState = null })

// ── Rel Vol class (matches GenericScannerTable) ─────────────────────────────
const getRelVolClass = (relVol) => {
  if (relVol >= 5) return 'extreme'
  if (relVol >= 3) return 'high'
  if (relVol >= 2) return 'medium'
  return 'normal'
}

// ── Column order & visibility ─────────────────────────────────────────────────
const columnMap = Object.fromEntries(columns.map(c => [c.key, c]))
const columnByKey = (key) => columnMap[key]

const mergeColOrder = (saved) => {
  const allKeys = columns.map(c => c.key)
  const s = Array.isArray(saved) ? saved : []
  return [...s.filter(k => allKeys.includes(k)), ...allKeys.filter(k => !s.includes(k))]
}

const hiddenColsLocal = ref(config.value.hiddenCols ?? [])
const colOrderLocal   = ref(mergeColOrder(config.value.colOrder))

const visibleColumns = computed(() =>
  colOrderLocal.value
    .map(key => columnByKey(key))
    .filter(col => col && !hiddenColsLocal.value.includes(col.key))
)

const moveCol = (key, dir) => {
  const idx = colOrderLocal.value.indexOf(key)
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= colOrderLocal.value.length) return
  const newOrder = [...colOrderLocal.value]
  ;[newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]]
  colOrderLocal.value = newOrder
  emitSettings()
}

const toggleCol = (key, visible) => {
  if (key === 'symbol') return
  if (visible) {
    hiddenColsLocal.value = hiddenColsLocal.value.filter(k => k !== key)
  } else {
    if (!hiddenColsLocal.value.includes(key)) {
      hiddenColsLocal.value = [...hiddenColsLocal.value, key]
    }
  }
  emitSettings()
}

// ── Cell helpers ──────────────────────────────────────────────────────────────
const getCellClass = (col, row) => {
  const classes = [col.key]
  if (col.cellClass) {
    const custom = typeof col.cellClass === 'function' ? col.cellClass(row) : col.cellClass
    classes.push(custom)
  }
  return classes
}

const formatCell = (col, row) => {
  const value = row[col.key]
  if (value == null) return ''
  if (col.format) return col.format(value, row)
  if (col.decimals !== undefined) {
    const num = Number(value)
    return Number.isFinite(num) ? num.toFixed(col.decimals) : ''
  }
  return value
}

// ── Local filter state (for controls) ────────────────────────────────────────
const feedLocal          = ref(config.value.feed)
const prevMaxEvents      = ref(config.value.maxEvents)
const maxEventsInput     = ref(config.value.maxEvents)
const sessionFilterLocal = ref(config.value.sessionFilter ?? '')
const minPriceLocal      = ref(config.value.minPrice !== null ? String(config.value.minPrice) : '')
const maxPriceLocal      = ref(config.value.maxPrice !== null ? String(config.value.maxPrice) : '')
const minVolumeInput     = ref(config.value.minVolume !== null ? String(config.value.minVolume) : '')
const minRelVolLocal     = ref(config.value.minRelVol !== null ? String(config.value.minRelVol) : '')
const minAvgVolInput     = ref(config.value.minAvgVol !== null ? String(config.value.minAvgVol) : '')
const minFloatInput      = ref(config.value.minFloat !== null ? String(config.value.minFloat) : '')
const maxFloatInput      = ref(config.value.maxFloat !== null ? String(config.value.maxFloat) : '')
const pctChangeLocal     = ref(config.value.pctChangeThreshold !== null ? String(config.value.pctChangeThreshold) : '')

// UI state
const showControls = ref(false)

// ── Sync local refs when settings prop changes ────────────────────────────────
watch(() => props.settings, (s) => {
  const merged = { ...DEFAULT_SETTINGS, ...s }
  feedLocal.value          = merged.feed
  prevMaxEvents.value      = merged.maxEvents
  maxEventsInput.value     = merged.maxEvents
  sessionFilterLocal.value = merged.sessionFilter ?? ''
  minPriceLocal.value      = merged.minPrice !== null ? String(merged.minPrice) : ''
  maxPriceLocal.value      = merged.maxPrice !== null ? String(merged.maxPrice) : ''
  minVolumeInput.value     = merged.minVolume !== null ? String(merged.minVolume) : ''
  minRelVolLocal.value     = merged.minRelVol !== null ? String(merged.minRelVol) : ''
  minAvgVolInput.value     = merged.minAvgVol !== null ? String(merged.minAvgVol) : ''
  minFloatInput.value      = merged.minFloat !== null ? String(merged.minFloat) : ''
  maxFloatInput.value      = merged.maxFloat !== null ? String(merged.maxFloat) : ''
  pctChangeLocal.value     = merged.pctChangeThreshold !== null ? String(merged.pctChangeThreshold) : ''
  hiddenColsLocal.value    = merged.hiddenCols ?? []
  colOrderLocal.value      = mergeColOrder(merged.colOrder)
  rowClickModeLocal.value  = merged.rowClickMode ?? 'link'
})

// ── Settings persistence ──────────────────────────────────────────────────────
const toNullableNum = (str) => {
  if (str === '' || str === null || str === undefined) return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

const emitSettings = () => {
  emit('update-settings', {
    feed:               feedLocal.value,
    maxEvents:          prevMaxEvents.value,
    sessionFilter:      sessionFilterLocal.value || null,
    minPrice:           toNullableNum(minPriceLocal.value),
    maxPrice:           toNullableNum(maxPriceLocal.value),
    minVolume:          parseShareCount(minVolumeInput.value),
    minRelVol:          toNullableNum(minRelVolLocal.value),
    minAvgVol:          parseShareCount(minAvgVolInput.value),
    minFloat:           parseShareCount(minFloatInput.value),
    maxFloat:           parseShareCount(maxFloatInput.value),
    pctChangeThreshold: toNullableNum(pctChangeLocal.value),
    hiddenCols:         hiddenColsLocal.value,
    colOrder:           [...colOrderLocal.value],
    rowClickMode:       rowClickModeLocal.value,
    colWidths:          { ...localColWidths.value },
  })
}

// Emit whenever non-immediate filter controls change
watch(
  [feedLocal, sessionFilterLocal, pctChangeLocal,
   () => [...hiddenColsLocal.value]],
  () => { emitSettings() }
)

// ── maxEvents input validation ────────────────────────────────────────────────
const onMaxEventsBlur = () => {
  const raw = String(maxEventsInput.value).trim()
  if (raw === '') {
    maxEventsInput.value = prevMaxEvents.value
    return
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    maxEventsInput.value = prevMaxEvents.value
    return
  }
  const clamped = Math.max(0, Math.min(100_000, Math.floor(n)))
  maxEventsInput.value = clamped
  prevMaxEvents.value = clamped
  emitSettings()
}

// ── parseShareCount input handlers ───────────────────────────────────────────
const onShareCountChange = () => emitSettings()


</script>

<style scoped>
.range-alerts-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  gap: 6px;
}

.ticker-filter-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.ticker-filter-input {
  flex: 1;
  min-width: 60px;
  max-width: 120px;
  padding: 3px 6px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
}
.ticker-filter-input:focus { outline: none; border-color: #8b5cf6; }
.ticker-filter-input::placeholder { color: #555; }

.ticker-filter-clear {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  padding: 0 3px;
  line-height: 1;
  flex-shrink: 0;
}
.ticker-filter-clear:hover { color: #ccc; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.filter-btn {
  padding: 3px 8px;
  background: #111;
  border: 1px solid #333;
  border-radius: 3px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.filter-btn:hover { background: #1a1a1a; color: #aaa; }
.filter-btn--active {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.5);
  color: #a78bfa;
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
.col-menu-btn:hover { background: #3a3a3a; }

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  max-height: 320px;
  overflow-y: auto;
}

.controls-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #2a2a2a;
}

.controls-section--destructive {
  background: #3a2a2a;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}

.filter-label {
  font-size: 12px;
  color: #aaa;
  white-space: nowrap;
}

.filter-select {
  padding: 4px 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
}

.filter-input {
  padding: 4px 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  min-width: 80px;
}

.filter-input--narrow {
  min-width: 60px;
  max-width: 90px;
}

.filter-input:focus { outline: none; border-color: #8b5cf6; }

.helper-text {
  font-size: 11px;
  color: #f87171;
}

.col-menu-wrap {
  padding: 8px 10px;
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
.col-menu-item input { cursor: pointer; flex-shrink: 0; }
.col-menu-item:has(input:disabled) { opacity: 0.4; cursor: default; }

.col-menu-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-order-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 10px;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}
.col-order-btn:hover:not(:disabled) { color: #ccc; }
.col-order-btn:disabled { opacity: 0.2; cursor: default; }

/* ── Table ── */
.table-container {
  flex: 1;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  user-select: none;
  background: #2d2d2d;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #333;
  white-space: nowrap;
}

td {
  padding: 2px 8px;
  font-size: 13px;
  border-bottom: 1px solid #2a2a2a;
}

tr:hover {
  background: #2a2a2a;
}

/* ── Column resize handle ── */
.col-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  z-index: 1;
}
.col-resize-handle:hover,
.col-resize-handle:active {
  background: rgba(139, 92, 246, 0.5);
}

/* ── Cell classes ── */
.pct_change.positive,
.change.positive,
.pct_change_since_open.positive { color: #4ade80; }

.pct_change.negative,
.change.negative,
.pct_change_since_open.negative { color: #f87171; }

.relative_volume { font-weight: 600; }
.relative_volume.extreme { color: #dc2626; }
.relative_volume.high    { color: #f59e0b; }
.relative_volume.medium  { color: #3b82f6; }
.relative_volume.normal  { color: #6b7280; }

.symbol { font-weight: 600; color: #fff; }

.symbol-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #fff;
}

.flame-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

/* ── Active row ── */
tr.row-active { outline: 1px solid #a78bfa; outline-offset: -1px; background: transparent !important; }

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 24px;
  color: #555;
  font-size: 13px;
}
</style>
