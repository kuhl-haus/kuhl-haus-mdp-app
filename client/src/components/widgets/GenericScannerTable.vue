<template>
  <table>
    <thead>
    <tr>
      <th
          v-for="col in columns"
          :key="col.key"
          @click="$emit('sort', col.key)"
          :class="{ sorted: sortKey === col.key }"
      >
        <span v-html="col.label"></span>
        <span v-if="sortKey === col.key">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
      </th>
    </tr>
    </thead>
    <tbody>
    <tr
        v-for="row in data"
        :key="row.symbol"
        :class="rowClassFn?.(row)"
    >
      <td v-for="col in columns" :key="col.key" :class="getCellClass(col, row)">
        <template v-if="col.render">
          <component :is="col.render(row)" />
        </template>
        <template v-else-if="col.key === 'accumulated_volume'">
          <span class="volume-value">{{ formatVolume(row.accumulated_volume) }}</span>
          <div class="volume-bar">
            <div class="volume-fill" :style="{ width: `${Math.min(row.relative_volume / 5 * 100, 100)}%` }"></div>
          </div>
        </template>
        <template v-else>
          {{ formatCell(col, row) }}
        </template>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<script setup>
import { h } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  columns: { type: Array, required: true },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' },
  rowClassFn: { type: Function, default: null }
})

defineEmits(['sort'])

const toNum = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const formatVolume = (vol) => {
  const v = toNum(vol)
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toString()
}

const getCellClass = (col, row) => {
  const classes = [col.key]
  if (col.cellClass) {
    const customClass = typeof col.cellClass === 'function' ? col.cellClass(row) : col.cellClass
    classes.push(customClass)
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
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}

th {
  cursor: pointer;
  user-select: none;
  background: #2d2d2d;
  position: sticky;
  top: 0;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #333;
  white-space: nowrap;
}

th:hover {
  background: #3d3d3d;
}

th.sorted {
  background: #3d3d3d;
  color: #8b5cf6;
}

td {
  padding: 8px;
  font-size: 13px;
  border-bottom: 1px solid #2a2a2a;
}

tr:hover {
  background: #2a2a2a;
}

.symbol {
  font-weight: 600;
  color: #fff;
}

.close, .prev_day_close, .change, .prev_day_volume, .avg_volume {
  font-family: 'Courier New', monospace;
}

.pct_change {
  font-weight: 600;
}

.accumulated_volume {
  position: relative;
}

.volume-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #3b82f6;
}

.volume-bar {
  position: absolute;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #1a1a1a;
}

.volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
}

.prev_day_volume, .avg_volume {
  color: #3b82f6;
}

.relative_volume {
  font-weight: 600;
}

.relative_volume.extreme { color: #dc2626; }
.relative_volume.high { color: #f59e0b; }
.relative_volume.medium { color: #3b82f6; }
.relative_volume.normal { color: #6b7280; }

.change.positive, .pct_change.positive, .pct_change_since_open.positive { color: #4ade80; }
.change.negative, .pct_change.negative, .pct_change_since_open.negative { color: #f87171; }

.ten-percent-gainer { background: rgba(61, 61, 61, 0.9); }
.twenty-percent-gainer { background: rgba(18, 44, 75, 0.9); }
.fifty-percent-gainer { background: rgba(50, 4, 141, 0.9); }
.hundred-percent-gainer { background: rgba(136, 4, 141, 0.9); }
</style>
