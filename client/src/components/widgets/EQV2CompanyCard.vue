<template>
  <div class="eqv2-company-card-body">
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
        <button class="eqv2-see-more" @click="onExpand">see more</button>
      </span>
      <button v-if="expanded" class="eqv2-see-more" @click="onCollapse"> less</button>
    </div>
  </div>
  </div>
</template>

<script setup>
import { truncateUrl, truncateDesc, fmtVol } from './eqv2Utils.js'

defineProps({
  loading: { type: Boolean, default: false },
  allNull: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
  expanded: { type: Boolean, default: false },
})

const emit = defineEmits(['expand', 'collapse'])
const onExpand = () => emit('expand')
const onCollapse = () => emit('collapse')
</script>
