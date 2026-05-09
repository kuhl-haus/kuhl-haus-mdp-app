<template>
  <div class="alert-manager-panel">

    <!-- Mute toggle -->
    <div class="am-section">
      <button @click="alertStore.toggleMute()" class="btn-mute" :class="{ 'btn-mute--active': alertStore.muted }">
        {{ alertStore.muted ? '🔇 Unmute' : '🔊 Mute All' }}
      </button>
    </div>

    <!-- Global default sound -->
    <div class="am-section">
      <label class="am-label">Default sound</label>
      <AlertSoundPicker
        :model-value="widgetSettingsStore.defaultAlertSound"
        @update:model-value="widgetSettingsStore.defaultAlertSound = $event"
      />
    </div>

    <!-- Active alerts list -->
    <div class="am-section">
      <div class="am-label">Active alerts</div>
      <div v-if="alertEnabledWidgets.length === 0" class="am-empty">
        No alerts configured. Enable alerts in a widget's settings panel.
      </div>
      <div v-else class="am-widget-list">
        <div v-for="w in alertEnabledWidgets" :key="w.widgetId" class="am-widget-row">
          <span
            v-if="w.linkColor"
            class="am-color-swatch"
            :style="{ background: colorHex(w.linkColor) }"
          ></span>
          <span class="am-widget-label">{{ w.widgetLabel }}</span>
          <span class="am-widget-sound">{{ soundLabel(w.effectiveSound) }}</span>
        </div>
      </div>
    </div>

    <!-- Recent log -->
    <div class="am-section">
      <div class="am-label-row">
        <span class="am-label">Recent alerts</span>
        <button v-if="alertStore.recentLog.length > 0" @click="alertStore.clearLog()" class="am-clear-btn">Clear</button>
      </div>
      <div v-if="alertStore.recentLog.length === 0" class="am-empty">No alerts fired yet.</div>
      <div v-else class="am-log">
        <div v-for="(entry, i) in alertStore.recentLog" :key="i" class="am-log-row">
          <span class="am-log-time">{{ formatTime(entry.timestamp) }}</span>
          <span v-if="entry.linkColor" class="am-color-swatch" :style="{ background: colorHex(entry.linkColor) }"></span>
          <span class="am-log-label">{{ entry.widgetLabel }}</span>
          <span class="am-log-count">{{ entry.count }} new {{ entry.widgetType === 'NewsFeed' ? (entry.count === 1 ? 'article' : 'articles') : (entry.count === 1 ? 'alert' : 'alerts') }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useAlertStore }          from '@/stores/useAlertStore.js'
import { useWidgetSettingsStore } from '@/stores/useWidgetSettingsStore.js'
import { ALERT_SOUND_MAP }        from '@/constants/alertSounds.js'
import { LINK_COLOR_MAP }         from '@/constants/linkColors.js'
import AlertSoundPicker           from '@/components/AlertSoundPicker.vue'

defineProps({
  alertEnabledWidgets: {
    type: Array,  // AlertWidgetInfo[]
    default: () => [],
  },
})

const alertStore          = useAlertStore()
const widgetSettingsStore = useWidgetSettingsStore()

function colorHex(name) {
  return LINK_COLOR_MAP[name] ?? '#888'
}

function soundLabel(id) {
  return ALERT_SOUND_MAP[id]?.label ?? id
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<style scoped>
.alert-manager-panel {
  background: var(--pd-surface, #1a1a1a);
  border: 1px solid var(--pd-border, #2a2a2a);
  border-radius: 6px;
  padding: 12px;
  min-width: 280px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.am-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.am-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pd-text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.am-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.am-empty {
  font-size: 12px;
  color: var(--pd-text-muted, #888);
  font-style: italic;
}

.am-widget-list,
.am-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.am-widget-row,
.am-log-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--pd-text, #ccc);
}

.am-color-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.am-widget-label,
.am-log-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.am-widget-sound {
  color: var(--pd-text-muted, #888);
  font-size: 11px;
  white-space: nowrap;
}

.am-log-time {
  color: var(--pd-text-muted, #888);
  font-size: 11px;
  white-space: nowrap;
}

.am-log-count {
  color: var(--pd-text-muted, #888);
  font-size: 11px;
  white-space: nowrap;
}

.btn-mute {
  padding: 6px 12px;
  background: var(--pd-surface, #2d2d2d);
  border: 1px solid var(--pd-border, #444);
  border-radius: 4px;
  color: var(--pd-text, #fff);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-mute:hover {
  background: var(--pd-surface-2, #3d3d3d);
}

.btn-mute--active {
  border-color: #f97316;
  color: #f97316;
}

.am-clear-btn {
  padding: 2px 8px;
  background: transparent;
  border: 1px solid var(--pd-border, #444);
  border-radius: 3px;
  color: var(--pd-text-muted, #888);
  font-size: 11px;
  cursor: pointer;
}

.am-clear-btn:hover {
  background: var(--pd-surface-2, #3d3d3d);
  color: var(--pd-text, #ccc);
}
</style>
