<template>
  <div class="widget-menu">
    <button
        class="menu-toggle"
        @click="isOpen = !isOpen"
    >
      {{ isOpen ? '✕ Close' : '➕ Add Widget' }}
    </button>

    <div v-if="isOpen" class="menu-panel">
      <button
          v-for="widget in availableWidgets"
          :key="widget.type"
          @click="selectWidget(widget.type)"
          class="widget-button"
      >
        <span>{{ widget.icon }}</span>
        {{ widget.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['add-widget'])
const isOpen = ref(false)

const availableWidgets = [
  { type: 'top-gainers', label: 'Top Gainers', icon: '📈' },
  { type: 'top-gappers', label: 'Top Gappers', icon: '🔝' },
  { type: 'top-volume', label: 'Top Volume', icon: '📊' },
  { type: 'news-feed', label: 'News Feed', icon: '📰' },
  { type: 'company-news', label: 'Company News', icon: '🗞️' },
  { type: 'quote', label: 'Quote', icon: '⚡' },
  { type: 'enhanced-quote-v3', label: 'Enhanced Quote', icon: '✨' },
]

const selectWidget = (widgetType) => {
  emit('add-widget', widgetType)
  isOpen.value = false
}
</script>

<style scoped>
.widget-menu {
  position: relative;
  top: 2px;
  right: 10px;
  z-index: 1000;
}

.menu-toggle {
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #444;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.menu-toggle:hover {
  background: #3d3d3d;
}

.menu-panel {
  margin-top: 8px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 2px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.widget-button {
  background: #2d2d2d;
  border: 1px solid #333;
  color: #fff;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.widget-button:hover {
  background: #3d3d3d;
}
</style>
