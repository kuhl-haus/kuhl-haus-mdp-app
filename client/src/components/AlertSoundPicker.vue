<template>
  <span class="alert-sound-picker">
    <select
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', $event.target.value || null)"
      class="sound-select"
    >
      <option v-if="showDefault" value="">Default ({{ defaultSoundLabel }})</option>
      <option v-for="s in ALERT_SOUNDS" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>
    <button type="button" @click="preview" class="preview-btn" title="Preview sound">▶</button>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { ALERT_SOUNDS, ALERT_SOUND_MAP } from '@/constants/alertSounds.js'
import { useWidgetSettingsStore } from '@/stores/useWidgetSettingsStore.js'

const props = defineProps({
  modelValue:  { type: String,  default: null },
  showDefault: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const widgetSettingsStore = useWidgetSettingsStore()

const defaultSoundLabel = computed(() => {
  const id = widgetSettingsStore.defaultAlertSound
  return ALERT_SOUND_MAP[id]?.label ?? id
})

function preview() {
  const id = props.modelValue || widgetSettingsStore.defaultAlertSound
  const sound = ALERT_SOUND_MAP[id]
  if (sound) new Audio(sound.src).play().catch(() => {})
}
</script>
