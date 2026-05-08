import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWidgetSettingsStore = defineStore('widgetSettings', () => {
  // DashboardGrid — 4 keys (Chunk 4)
  const savedLayouts     = ref({})
  const defaultLayoutName = ref(null)
  const isLocked         = ref(true)
  const autosaveEnabled  = ref(true)

  // NewsFeed — 2 keys (Chunk 4)
  const maxArticles    = ref(1000)
  const hasTickersOnly = ref(false)

  return { savedLayouts, defaultLayoutName, isLocked, autosaveEnabled, maxArticles, hasTickersOnly }
}, { persist: true })
