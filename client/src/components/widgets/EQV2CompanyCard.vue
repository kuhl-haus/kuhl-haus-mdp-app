<template>
  <div v-if="loading" class="eqv2-muted-msg">Company data loading...</div>
  <div v-else-if="allNull" class="eqv2-muted-msg">Company data unavailable</div>
  <div v-else>
    <div class="eqv2-kv-list">
      <div v-if="data.homepage_url" class="eqv2-kv">
        <span class="eqv2-k">Web</span>
        <a :href="data.homepage_url" target="_blank" rel="noopener noreferrer" class="eqv2-link">{{ truncateUrl(data.homepage_url) }}</a>
      </div>
      <div class="eqv2-kv"><span class="eqv2-k">Exchange</span><span class="eqv2-v">{{ data.primary_exchange || '—' }}</span></div>
      <div class="eqv2-kv"><span class="eqv2-k">Mkt Cap</span><span class="eqv2-v">{{ data.market_cap != null ? '$' + fmtVol(data.market_cap) : '—' }}</span></div>
      <div class="eqv2-kv"><span class="eqv2-k">Employees</span><span class="eqv2-v">{{ data.total_employees != null ? fmtVol(data.total_employees) : '—' }}</span></div>
      <div class="eqv2-kv"><span class="eqv2-k">Listed</span><span class="eqv2-v">{{ data.list_date || '—' }}</span></div>
    </div>
    <div v-if="data.description" class="eqv2-company-desc-wrap">
      <span class="eqv2-company-desc-text">
        {{ expanded ? data.description : truncateDesc(data.description) }}
      </span>
      <span v-if="!expanded && truncateDesc(data.description) !== data.description">
        <span class="eqv2-company-desc-ellipsis">… </span>
        <button class="eqv2-see-more" @click="$emit('expand')">see more</button>
      </span>
      <button v-if="expanded" class="eqv2-see-more" @click="$emit('collapse')"> less</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  loading: { type: Boolean, default: false },
  allNull: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
  expanded: { type: Boolean, default: false },
})

defineEmits(['expand', 'collapse'])

const truncateUrl = (url) => {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)
}

const truncateDesc = (text, maxLen = 175) => {
  if (!text || text.length <= maxLen) return text
  const cut = text.lastIndexOf(' ', maxLen)
  return cut > 0 ? text.slice(0, cut) : text.slice(0, maxLen)
}

const fmtVol = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (Math.abs(n) >= 1e9)  return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3)  return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
</script>
