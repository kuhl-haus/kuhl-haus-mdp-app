<template>
  <div class="widget-wrapper">
    <div class="widget-header">
      <span class="widget-title">{{ widgetType }}</span>
      <button @click="$emit('close', widgetId)" class="close-btn">✕</button>
    </div>
    <div class="widget-content">
      <component :is="widgetComponent"/>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TopVolume from './widgets/TopVolume.vue'
import TopGappers from './widgets/TopGappers.vue'
import TopGainers from './widgets/TopGainers.vue'

const props = defineProps(['widgetId', 'widgetType'])
defineEmits(['close'])

const widgetComponents = {
  'top-gainers': TopGainers,
  'top-volume': TopVolume,
  'top-gappers': TopGappers
}


const widgetComponent = computed(() => widgetComponents[props.widgetType])

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
</style>
