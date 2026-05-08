import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_ALERT_SOUND_ID } from '@/constants/alertSounds.js'

export const useWidgetSettingsStore = defineStore('widgetSettings', () => {
  // DashboardGrid — 4 keys (Pinia migration, Chunk 4)
  const savedLayouts      = ref({})
  const defaultLayoutName = ref(null)
  const isLocked          = ref(true)
  const autosaveEnabled   = ref(true)

  // NewsFeed — 2 keys (Pinia migration, Chunk 4)
  const maxArticles    = ref(1000)
  const hasTickersOnly = ref(false)

  // Audio alerts (Chunk 1)
  const defaultAlertSound  = ref(DEFAULT_ALERT_SOUND_ID)
  const alertManagerOpen   = ref(false)

  return {
    savedLayouts, defaultLayoutName, isLocked, autosaveEnabled,
    maxArticles, hasTickersOnly,
    defaultAlertSound, alertManagerOpen,
  }
}, { persist: true })
