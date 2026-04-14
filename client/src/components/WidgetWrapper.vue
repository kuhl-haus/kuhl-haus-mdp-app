<template>
  <div :class="['widget-wrapper', isMobile ? 'widget-wrapper--mobile' : '']">
    <div
      class="widget-header"
      :style="linkColor ? { borderBottom: `1px solid ${linkColorHex}`, boxShadow: `0 1px 0 0 ${linkColorHex}` } : {}"
    >
      <!-- Title: editable when unlocked, double-click to edit -->
      <input
        v-if="isEditingTitle"
        ref="titleInput"
        v-model="editingLabel"
        class="widget-title widget-title--input"
        @blur="commitLabel"
        @keyup.enter="commitLabel"
        @keyup.escape="cancelLabel"
      />
      <span
        v-else
        class="widget-title"
        :title="!isLocked ? (isMobile ? 'Long-press to rename' : 'Double-click to rename') : ''"
        @dblclick="!isLocked && startEditLabel()"
        @touchstart.passive="onTitleTouchStart"
        @touchend.passive="onTitleTouchEnd"
        @touchmove.passive="onTitleTouchEnd"
      >{{ userLabel || widgetType }}</span>

      <!-- Link color selector — only when unlocked -->
      <div v-if="!isLocked" class="link-color-selector">
        <!-- Unlink option -->
        <button
          :class="['color-swatch', 'color-swatch--none', !linkColor ? 'color-swatch--active' : '']"
          title="No link (unlinked)"
          @click="$emit('update-link-color', null)"
        >∅</button>
        <!-- Color swatches -->
        <button
          v-for="c in LINK_COLORS"
          :key="c.name"
          :class="['color-swatch', linkColor === c.name ? 'color-swatch--active' : '']"
          :style="{ background: c.hex }"
          :title="`Link: ${c.name}`"
          @click="$emit('update-link-color', c.name)"
        ></button>
      </div>

      <span class="freshness-icon">{{ freshnessIcon }}</span>
      <button @click="$emit('close', widgetId)" class="close-btn">✕</button>
    </div>
    <div class="widget-content">
      <component
        :is="widgetComponent"
        ref="activeWidget"
        :is-locked="isLocked"
        :col-widths="colWidths"
        :link-color="linkColor"
        :is-mobile="isMobile"
        :settings="settings"
        @update-col-widths="$emit('update-col-widths', $event)"
        @update-settings="$emit('update-settings', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import TopVolume from './widgets/TopVolume.vue'
import TopGappers from './widgets/TopGappers.vue'
import TopGainers from './widgets/TopGainers.vue'
import CompanyNews from './widgets/CompanyNews.vue'
import NewsFeed from './widgets/NewsFeed.vue'
import Quote from './widgets/Quote.vue'
import EnhancedQuoteV3 from './widgets/EnhancedQuoteV3.vue'
import { LINK_COLORS, LINK_COLOR_MAP } from '@/composables/useWidgetBus.js'

const props = defineProps({
  widgetId:   { type: String,  required: true },
  widgetType: { type: String,  required: true },
  isLocked:   { type: Boolean, default: true },
  colWidths:  { type: Object,  default: () => ({}) },
  linkColor:  { type: String,  default: null },
  isMobile:   { type: Boolean, default: false },
  settings:   { type: Object,  default: () => ({}) },
  userLabel:  { type: String,  default: '' },
})

const widgetComponents = {
  'top-gainers': TopGainers,
  'top-volume':  TopVolume,
  'top-gappers': TopGappers,
  'company-news': CompanyNews,
  'news-feed':   NewsFeed,
  'quote':           Quote,
  'enhanced-quote':    EnhancedQuoteV3,
  'enhanced-quote-v3': EnhancedQuoteV3,  // backward-compat alias
}

const widgetComponent = computed(() => widgetComponents[props.widgetType])

const linkColorHex = computed(() => props.linkColor ? LINK_COLOR_MAP[props.linkColor] : null)

// ── Inline label editing ──
const isEditingTitle = ref(false)
const editingLabel = ref('')
const titleInput = ref(null)
const emit = defineEmits(['close', 'update-col-widths', 'update-link-color', 'update-settings', 'update-label'])

const startEditLabel = () => {
  editingLabel.value = props.userLabel || ''
  isEditingTitle.value = true
  nextTick(() => titleInput.value?.select())
}
const commitLabel = () => {
  isEditingTitle.value = false
  const val = editingLabel.value.trim()
  if (val !== props.userLabel) {
    emit('update-label', val)
  }
}
const cancelLabel = () => {
  isEditingTitle.value = false
}

// ── Long-press to rename (mobile) ──
let longPressTimer = null
const LONG_PRESS_MS = 500

const onTitleTouchStart = () => {
  if (props.isLocked) return
  longPressTimer = setTimeout(() => {
    startEditLabel()
  }, LONG_PRESS_MS)
}

const onTitleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// Freshness tracking
const activeWidget = ref(null)
const now = ref(Date.now())
const intervalId = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(intervalId))

const oscillating = ref(true)
const oscillateId = setInterval(() => { oscillating.value = !oscillating.value }, 250)
onUnmounted(() => { clearInterval(oscillateId) })
onUnmounted(() => { if (longPressTimer) clearTimeout(longPressTimer) })

const lastDataAt    = computed(() => activeWidget.value?.lastDataAt ?? null)
const isConnected   = computed(() => activeWidget.value?.isConnected ?? true)
const reconnecting  = computed(() => activeWidget.value?.reconnecting ?? false)
const elapsedMs     = computed(() => lastDataAt.value === null ? null : now.value - lastDataAt.value)

const freshnessIcon = computed(() => {
  if (!isConnected.value && !reconnecting.value) return '❌'
  if (reconnecting.value || lastDataAt.value === null) return oscillating.value ? '🔵' : '🟣'
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
  background: var(--pd-surface);
  border: 1px solid var(--pd-border);
  border-radius: 4px;
  overflow: hidden;
  touch-action: none;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  background: var(--pd-surface-2);
  border-bottom: 1px solid var(--pd-border);
  cursor: move;
  gap: 6px;
  /* Smooth transition when link color applied */
  transition: border-bottom-color 0.15s, box-shadow 0.15s;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--pd-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.widget-title--input {
  background: var(--pd-surface);
  border: 1px solid var(--pd-border-hover);
  border-radius: 3px;
  color: var(--pd-text);
  padding: 1px 4px;
  outline: none;
  min-width: 0;
}

/* ── Link color selector ── */
.link-color-selector {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.1s, border-color 0.1s;
  font-size: 9px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.color-swatch:hover { transform: scale(1.3); border-color: rgba(255,255,255,0.5); }
.color-swatch--active { border: 2px solid #fff; transform: scale(1.2); }

.color-swatch--none {
  background: var(--pd-surface-2);
  color: var(--pd-text-muted);
  font-size: 10px;
}
.color-swatch--none.color-swatch--active { color: #aaa; }

/* ── Freshness + close ── */
.freshness-icon {
  font-size: 14px;
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--pd-text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  flex-shrink: 0;
}
.close-btn:hover { background: var(--pd-surface-2); color: var(--pd-text); }

.widget-content {
  flex: 1;
  overflow: auto;
}

/* Mobile: fixed heights so widgets don't collapse */
.widget-wrapper--mobile {
  height: auto;
  min-height: 320px;
  max-height: 480px;
}
</style>
