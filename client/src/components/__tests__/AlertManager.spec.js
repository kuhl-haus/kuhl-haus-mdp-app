/**
 * AlertManager.vue — unit tests
 *
 * Covers: empty state, active alerts list (labels, swatches, sounds),
 * mute toggle, default sound picker, recent log (count text, clear button,
 * color swatches, article/alert pluralisation).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAlertStore } from '@/stores/useAlertStore.js'
import { useWidgetSettingsStore } from '@/stores/useWidgetSettingsStore.js'

// ── Stubs ─────────────────────────────────────────────────────────────────────
vi.mock('../AlertSoundPicker.vue', () => ({
  default: {
    name: 'AlertSoundPicker',
    props: ['modelValue', 'showDefault'],
    emits: ['update:modelValue'],
    template: '<select class="mock-picker" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}))

import AlertManager from '../AlertManager.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountAlertManager(props = {}) {
  // No createPinia() here — rely on the beforeEach instance set by setActivePinia
  return mount(AlertManager, {
    props: {
      alertEnabledWidgets: [],
      ...props,
    },
  })
}

function makeWidget(overrides = {}) {
  return {
    widgetId:      'w1',
    widgetLabel:   'Range Alerts',
    widgetType:    'range-alerts',
    linkColor:     null,
    effectiveSound: 'blip',
    ...overrides,
  }
}

function makeLogEntry(overrides = {}) {
  return {
    timestamp:   Date.now(),
    widgetLabel: 'News Feed',
    widgetType:  'NewsFeed',
    linkColor:   null,
    count:       1,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('empty state', () => {
  test('with alertEnabledWidgets=[] expect empty-state message rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager({ alertEnabledWidgets: [] })

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-empty').text()).toContain('No alerts configured')
    wrapper.unmount()
  })

  test('with empty recentLog expect "No alerts fired yet" message rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = []

    // Act
    await nextTick()

    // Assert
    const empties = wrapper.findAll('.am-empty')
    expect(empties.some(el => el.text().includes('No alerts fired yet'))).toBe(true)
    wrapper.unmount()
  })
})

// ── Active alerts list ────────────────────────────────────────────────────────

describe('active alerts list', () => {
  test('with two widgets expect two rows with correct labels and sounds', async () => {
    // Arrange
    const widgets = [
      makeWidget({ widgetId: 'w1', widgetLabel: 'Top Gainers', effectiveSound: 'blip' }),
      makeWidget({ widgetId: 'w2', widgetLabel: 'News Feed',   effectiveSound: 'snap' }),
    ]
    const wrapper = mountAlertManager({ alertEnabledWidgets: widgets })

    // Act
    await nextTick()

    // Assert
    const rows = wrapper.findAll('.am-widget-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Top Gainers')
    expect(rows[0].text()).toContain('Blip')
    expect(rows[1].text()).toContain('News Feed')
    expect(rows[1].text()).toContain('Snap')
    wrapper.unmount()
  })

  test('with widget having linkColor expect color swatch rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager({ alertEnabledWidgets: [makeWidget({ linkColor: 'red' })] })

    // Act
    await nextTick()

    // Assert
    const swatch = wrapper.find('.am-widget-row .am-color-swatch')
    expect(swatch.exists()).toBe(true)
    expect(swatch.attributes('style')).toMatch(/background:\s*(#ef4444|rgb\(239,\s*68,\s*68\))/)
    wrapper.unmount()
  })

  test('with widget having no linkColor expect no color swatch', async () => {
    // Arrange
    const wrapper = mountAlertManager({ alertEnabledWidgets: [makeWidget({ linkColor: null })] })

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-widget-row .am-color-swatch').exists()).toBe(false)
    wrapper.unmount()
  })
})

// ── Mute button ───────────────────────────────────────────────────────────────

describe('mute button', () => {
  test('with muted=false expect button shows "Mute All"', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().muted = false

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.btn-mute').text()).toContain('Mute All')
    wrapper.unmount()
  })

  test('with muted=true expect button shows "Unmute"', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().muted = true

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.btn-mute').text()).toContain('Unmute')
    wrapper.unmount()
  })

  test('with mute button clicked expect alertStore.toggleMute called', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    await nextTick()
    const alertStore = useAlertStore()
    vi.spyOn(alertStore, 'toggleMute')

    // Act
    await wrapper.find('.btn-mute').trigger('click')

    // Assert
    expect(alertStore.toggleMute).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})

// ── Default sound picker ──────────────────────────────────────────────────────

describe('default sound picker', () => {
  test('with panel open expect sound picker rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager()

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.mock-picker').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with picker emitting new value expect widgetSettingsStore.defaultAlertSound updated', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    const wss = useWidgetSettingsStore()
    wss.defaultAlertSound = 'blip'
    await nextTick()

    // Act
    await wrapper.findComponent({ name: 'AlertSoundPicker' }).vm.$emit('update:modelValue', 'snap')

    // Assert
    expect(wss.defaultAlertSound).toBe('snap')
    wrapper.unmount()
  })
})

// ── Recent log ────────────────────────────────────────────────────────────────

describe('recent log', () => {
  test('with entries in recentLog expect clear button shown', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry()]

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-clear-btn').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with empty recentLog expect clear button absent', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = []

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-clear-btn').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with clear button clicked expect alertStore.clearLog called', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    const alertStore = useAlertStore()
    vi.spyOn(alertStore, 'clearLog')
    alertStore.recentLog = [makeLogEntry()]
    await nextTick()

    // Act
    await wrapper.find('.am-clear-btn').trigger('click')

    // Assert
    expect(alertStore.clearLog).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  test('with log entry expect label and count rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ widgetLabel: 'News Feed', count: 3 })]

    // Act
    await nextTick()

    // Assert
    const row = wrapper.find('.am-log-row')
    expect(row.find('.am-log-label').text()).toContain('News Feed')
    expect(row.find('.am-log-count').text()).toContain('3')
    wrapper.unmount()
  })

  test('with NewsFeed entry count=1 expect "1 new article"', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ widgetType: 'NewsFeed', count: 1 })]

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-log-count').text()).toBe('1 new article')
    wrapper.unmount()
  })

  test('with NewsFeed entry count=3 expect "3 new articles"', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ widgetType: 'NewsFeed', count: 3 })]

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-log-count').text()).toBe('3 new articles')
    wrapper.unmount()
  })

  test('with DailyRangeAlerts entry count=2 expect "2 new alerts"', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ widgetType: 'DailyRangeAlerts', count: 2 })]

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-log-count').text()).toBe('2 new alerts')
    wrapper.unmount()
  })

  test('with log entry having linkColor expect color swatch rendered', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ linkColor: 'blue' })]

    // Act
    await nextTick()

    // Assert
    const swatch = wrapper.find('.am-log-row .am-color-swatch')
    expect(swatch.exists()).toBe(true)
    expect(swatch.attributes('style')).toMatch(/background:\s*(#3b82f6|rgb\(59,\s*130,\s*246\))/)
    wrapper.unmount()
  })

  test('with log entry having no linkColor expect no color swatch', async () => {
    // Arrange
    const wrapper = mountAlertManager()
    useAlertStore().recentLog = [makeLogEntry({ linkColor: null })]

    // Act
    await nextTick()

    // Assert
    expect(wrapper.find('.am-log-row .am-color-swatch').exists()).toBe(false)
    wrapper.unmount()
  })
})
