<template>
  <div class="widget-wrapper">
    <div class="widget-header">
      <span class="widget-title">{{ widgetType }}</span>
      <span class="freshness-icon">{{ freshnessIcon }}</span>
      <button @click="$emit('close', widgetId)" class="close-btn">✕</button>
    </div>
    <div class="widget-content">
      <component :is="widgetComponent" ref="activeWidget"/>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import TopVolume from './widgets/TopVolume.vue'
import TopGappers from './widgets/TopGappers.vue'
import TopGainers from './widgets/TopGainers.vue'
import NewsFeed from './widgets/NewsFeed.vue'

const props = defineProps(['widgetId', 'widgetType'])
defineEmits(['close'])

const widgetComponents = {
  'top-gainers': TopGainers,
  'top-volume': TopVolume,
  'top-gappers': TopGappers,
  'news-feed': NewsFeed,
}

const widgetComponent = computed(() => widgetComponents[props.widgetType])

const activeWidget = ref(null)
const now = ref(Date.now())
const intervalId = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(intervalId))

const oscillating = ref(true)
const oscillateId = setInterval(() => { oscillating.value = !oscillating.value }, 250)
onUnmounted(() => { clearInterval(oscillateId) })

const lastDataAt = computed(() => activeWidget.value?.lastDataAt ?? null)
const isConnected = computed(() => activeWidget.value?.isConnected ?? true)
const reconnecting = computed(() => activeWidget.value?.reconnecting ?? false)

const elapsedMs = computed(() => {
  if (lastDataAt.value === null) return null
  return now.value - lastDataAt.value
})

const freshnessIcon = computed(() => {
  if (!isConnected.value && !reconnecting.value) return '❌'
  if (reconnecting.value || lastDataAt.value === null) {
    return oscillating.value ? '🔵' : '🟣'
  }
  const s = elapsedMs.value / 1000
  if (s < 5) return '🟢'
  if (s < 60) return '🟡'
  return '🔴'
})

</script>

<style scoped>
.widget-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
  touch-action: none;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  cursor: move;
  gap: 8px;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  flex: 1;
}


@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
}

.close-btn:hover {
  background: #3d3d3d;
  color: #fff;
}

.widget-content {
  flex: 1;
  overflow: auto;
}

.freshness-icon {
  font-size: 14px;
  line-height: 1;
  user-select: none;
}
</style>
