/**
 * useWidgetSettingsStore — persisted widget settings.
 *
 * Consolidates widget-level localStorage keys into a typed, schema-defined store.
 * Fields are populated in Chunk 4 of the Pinia migration.
 */
import { defineStore } from 'pinia'

export const useWidgetSettingsStore = defineStore('widgetSettings', () => {
  // Fields added in Chunk 4
  return {}
}, { persist: false })
