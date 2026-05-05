/**
 * WidgetWrapper.vue — coverage for uncovered branches.
 *
 * Existing spec covers: widget type routing, link color, locked/unlocked
 * close button, title display, update-col-widths/update-settings relay.
 *
 * This file adds:
 *  - Inline label editing: double-click triggers input, commit via Enter or
 *    blur, cancel via Escape, update-label emitted only on changed value
 *  - Long-press to rename (mobile): touchstart → 500ms → startEditLabel;
 *    touchend before 500ms → cancel timer; isLocked=true → early return
 *  - freshnessIcon states: ❌ (disconnected), 🔵/🟣 (reconnecting),
 *    🟢 (elapsed < 5s), 🟡 (5-60s), 🔴 (>60s)
 *  - userLabel display: when set vs fallback to widgetType
 *  - Mobile class: isMobile=true adds widget-wrapper--mobile class
 *  - Link color swatch clicks: unlink + color swatches (unlocked)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Shared freshness refs (var-hoisted so vi.mock factory can assign them) ────
// eslint-disable-next-line no-var
var sharedLastDataAt, sharedIsConnected, sharedReconnecting

// ── Widget component stubs ────────────────────────────────────────────────────
vi.mock('../widgets/EnhancedQuoteV4.vue', async () => {
  const { ref } = await import('vue')
  sharedLastDataAt   = ref(null)
  sharedIsConnected  = ref(true)
  sharedReconnecting = ref(false)
  return {
    default: {
      name: 'EQV4Stub',
      template: '<div class="stub-eqv4" />',
      setup: () => ({ lastDataAt: sharedLastDataAt, isConnected: sharedIsConnected, reconnecting: sharedReconnecting }),
    },
  }
})

vi.mock('../widgets/TopVolume.vue',       () => ({ default: { template: '<div class="stub-top-volume" />' } }))
vi.mock('../widgets/TopGappers.vue',      () => ({ default: { template: '<div class="stub-top-gappers" />' } }))
vi.mock('../widgets/TopGainers.vue',      () => ({ default: { template: '<div class="stub-top-gainers" />' } }))
vi.mock('../widgets/CompanyNews.vue',     () => ({ default: { template: '<div class="stub-company-news" />' } }))
vi.mock('../widgets/NewsFeed.vue',        () => ({ default: { template: '<div class="stub-news-feed" />' } }))
vi.mock('../widgets/Quote.vue',           () => ({ default: { template: '<div class="stub-quote" />' } }))
vi.mock('../widgets/EnhancedQuoteV3.vue', () => ({ default: { template: '<div class="stub-eqv3" />' } }))
vi.mock('../widgets/DailyRangeAlerts.vue',() => ({ default: { template: '<div class="stub-range-alerts" />' } }))
vi.mock('../widgets/CandlestickChart.vue',() => ({ default: { template: '<div class="stub-candlestick" />' } }))
vi.mock('../widgets/TVLiteChart.vue',     () => ({ default: { template: '<div class="stub-tv-chart" />' } }))

import WidgetWrapper from '../WidgetWrapper.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountWrapper(propsOverrides = {}) {
  return mount(WidgetWrapper, {
    props: {
      widgetId:   'test-widget-1',
      widgetType: 'enhanced-quote-v4',
      isLocked:   true,
      settings:   {},
      userLabel:  '',
      ...propsOverrides,
    },
  })
}

function ss(wrapper) {
  return wrapper.vm.$.setupState
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  // Reset shared freshness state
  if (sharedLastDataAt)  sharedLastDataAt.value  = null
  if (sharedIsConnected) sharedIsConnected.value = true
  if (sharedReconnecting) sharedReconnecting.value = false
})

// ─────────────────────────────────────────────────────────────────────────────
// Inline label editing
// ─────────────────────────────────────────────────────────────────────────────

describe('inline label editing', () => {
  test('with double-click on title (unlocked) expect input shown', async () => {
    // Arrange
    const wrapper = mountWrapper({ isLocked: false })
    await nextTick()

    // Assert — input hidden initially
    expect(wrapper.find('.widget-title--input').exists()).toBe(false)

    // Act — double-click title span
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Assert — input now visible
    expect(wrapper.find('.widget-title--input').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with double-click on title (locked) expect input NOT shown', async () => {
    // Arrange
    const wrapper = mountWrapper({ isLocked: true })
    await nextTick()

    // Act
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Assert — locked: dblclick condition `!isLocked && startEditLabel()` → no-op
    expect(wrapper.find('.widget-title--input').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with Enter pressed in input expect commitLabel called and update-label emitted', async () => {
    // Arrange
    const labelCalls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, userLabel: 'Old Label' },
      attrs: { 'onUpdate-label': (l) => labelCalls.push(l) },
    })
    await nextTick()

    // Open editing
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Act — type new label and press Enter
    const input = wrapper.find('.widget-title--input')
    await input.setValue('New Label')
    await input.trigger('keyup.enter')
    await nextTick()

    // Assert
    expect(ss(wrapper).isEditingTitle).toBe(false)
    expect(labelCalls).toContain('New Label')
    wrapper.unmount()
  })

  test('with blur on input expect commitLabel called', async () => {
    // Arrange
    const labelCalls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, userLabel: 'OldLabel' },
      attrs: { 'onUpdate-label': (l) => labelCalls.push(l) },
    })
    await nextTick()
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Act
    const input = wrapper.find('.widget-title--input')
    await input.setValue('Via Blur')
    await input.trigger('blur')
    await nextTick()

    // Assert
    expect(ss(wrapper).isEditingTitle).toBe(false)
    expect(labelCalls).toContain('Via Blur')
    wrapper.unmount()
  })

  test('with Escape pressed in input expect cancelLabel (no emit)', async () => {
    // Arrange
    const labelCalls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, userLabel: 'OldLabel' },
      attrs: { 'onUpdate-label': (l) => labelCalls.push(l) },
    })
    await nextTick()
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Act — Escape cancels without emitting
    const input = wrapper.find('.widget-title--input')
    await input.setValue('Changed But Cancelled')
    await input.trigger('keyup.escape')
    await nextTick()

    // Assert — editing closed, no label emitted
    expect(ss(wrapper).isEditingTitle).toBe(false)
    expect(labelCalls).toHaveLength(0)
    wrapper.unmount()
  })

  test('with commit of same value expect update-label NOT emitted', async () => {
    // Arrange — userLabel and input value are the same
    const labelCalls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, userLabel: 'SameLabel' },
      attrs: { 'onUpdate-label': (l) => labelCalls.push(l) },
    })
    await nextTick()
    await wrapper.find('.widget-title').trigger('dblclick')
    await nextTick()

    // Act — don't change the value
    const input = wrapper.find('.widget-title--input')
    expect(input.element.value).toBe('SameLabel')
    await input.trigger('keyup.enter')
    await nextTick()

    // Assert — no emit (value unchanged)
    expect(labelCalls).toHaveLength(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Long-press to rename (mobile)
// ─────────────────────────────────────────────────────────────────────────────

describe('long-press rename', () => {
  test('with touchstart (unlocked) and 500ms elapsed expect editing mode started', async () => {
    // Arrange
    vi.useFakeTimers()
    const wrapper = mountWrapper({ isLocked: false })
    await nextTick()

    // Act — touchstart on title
    await wrapper.find('.widget-title').trigger('touchstart')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — editing mode started
    expect(ss(wrapper).isEditingTitle).toBe(true)

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with touchstart (locked) expect no editing mode', async () => {
    // Arrange
    vi.useFakeTimers()
    const wrapper = mountWrapper({ isLocked: true })
    await nextTick()

    // Act — touchstart on title (locked → early return)
    await wrapper.find('.widget-title').trigger('touchstart')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — not editing (isLocked returns early)
    expect(ss(wrapper).isEditingTitle).toBe(false)

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with touchend before 500ms expect timer cancelled (no editing)', async () => {
    // Arrange
    vi.useFakeTimers()
    const wrapper = mountWrapper({ isLocked: false })
    await nextTick()

    // Act — touchstart then quick touchend
    await wrapper.find('.widget-title').trigger('touchstart')
    await wrapper.find('.widget-title').trigger('touchend')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — timer cancelled, not editing
    expect(ss(wrapper).isEditingTitle).toBe(false)

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// freshnessIcon states
// ─────────────────────────────────────────────────────────────────────────────

describe('freshnessIcon', () => {
  test('with lastDataAt null and connected expect oscillating 🔵/🟣', async () => {
    // Arrange — default state: lastDataAt=null, connected, not reconnecting
    const wrapper = mountWrapper()
    await nextTick()

    // Assert — oscillating icon (default when no data)
    const icon = ss(wrapper).freshnessIcon
    expect(['🔵', '🟣']).toContain(icon)
    wrapper.unmount()
  })

  test('with isConnected=false and reconnecting=false expect ❌', async () => {
    // Arrange
    const wrapper = mountWrapper()
    await nextTick()

    // Act — set shared freshness state
    sharedIsConnected.value  = false
    sharedReconnecting.value = false
    await nextTick()

    // Assert
    expect(ss(wrapper).freshnessIcon).toBe('❌')
    wrapper.unmount()
  })

  test('with reconnecting=true expect oscillating 🔵/🟣', async () => {
    // Arrange
    const wrapper = mountWrapper()
    await nextTick()

    // Act
    sharedLastDataAt.value   = Date.now() - 5000  // has data but reconnecting
    sharedIsConnected.value  = true
    sharedReconnecting.value = true
    await nextTick()

    // Assert — oscillating (reconnecting path)
    const icon = ss(wrapper).freshnessIcon
    expect(['🔵', '🟣']).toContain(icon)
    wrapper.unmount()
  })

  test('with lastDataAt 3s ago expect 🟢 (elapsed < 5s)', async () => {
    // Arrange
    const wrapper = mountWrapper()
    await nextTick()

    // Act — set lastDataAt to 3 seconds ago
    const threeSecondsAgo = Date.now() - 3_000
    sharedLastDataAt.value  = threeSecondsAgo
    sharedIsConnected.value = true
    sharedReconnecting.value = false
    // Also update 'now' in the component to current time
    ss(wrapper).now = Date.now()
    await nextTick()

    // Assert
    expect(ss(wrapper).freshnessIcon).toBe('🟢')
    wrapper.unmount()
  })

  test('with lastDataAt 30s ago expect 🟡 (5 ≤ elapsed < 60s)', async () => {
    // Arrange
    const wrapper = mountWrapper()
    await nextTick()

    // Act — 30 seconds ago
    const thirtySecondsAgo = Date.now() - 30_000
    sharedLastDataAt.value   = thirtySecondsAgo
    sharedIsConnected.value  = true
    sharedReconnecting.value = false
    ss(wrapper).now = Date.now()
    await nextTick()

    // Assert
    expect(ss(wrapper).freshnessIcon).toBe('🟡')
    wrapper.unmount()
  })

  test('with lastDataAt 2min ago expect 🔴 (elapsed ≥ 60s)', async () => {
    // Arrange
    const wrapper = mountWrapper()
    await nextTick()

    // Act — 2 minutes ago
    const twoMinutesAgo = Date.now() - 120_000
    sharedLastDataAt.value   = twoMinutesAgo
    sharedIsConnected.value  = true
    sharedReconnecting.value = false
    ss(wrapper).now = Date.now()
    await nextTick()

    // Assert
    expect(ss(wrapper).freshnessIcon).toBe('🔴')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// userLabel display
// ─────────────────────────────────────────────────────────────────────────────

describe('userLabel display', () => {
  test('with userLabel set expect label shown in title', async () => {
    // Arrange
    const wrapper = mountWrapper({ userLabel: 'My Custom Widget' })
    await nextTick()

    // Assert
    expect(wrapper.find('.widget-title').text()).toBe('My Custom Widget')
    wrapper.unmount()
  })

  test('with empty userLabel expect widgetType shown in title', async () => {
    // Arrange
    const wrapper = mountWrapper({ userLabel: '', widgetType: 'top-volume' })
    await nextTick()

    // Assert — falls back to widgetType
    expect(wrapper.find('.widget-title').text()).toBe('top-volume')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Mobile class
// ─────────────────────────────────────────────────────────────────────────────

describe('mobile class', () => {
  test('with isMobile=true expect widget-wrapper--mobile class', async () => {
    // Arrange
    const wrapper = mountWrapper({ isMobile: true })
    await nextTick()

    // Assert
    expect(wrapper.find('.widget-wrapper').classes()).toContain('widget-wrapper--mobile')
    wrapper.unmount()
  })

  test('with isMobile=false expect no mobile class', async () => {
    // Arrange
    const wrapper = mountWrapper({ isMobile: false })
    await nextTick()

    // Assert
    expect(wrapper.find('.widget-wrapper').classes()).not.toContain('widget-wrapper--mobile')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Link color swatches (unlocked)
// ─────────────────────────────────────────────────────────────────────────────

describe('link color swatches', () => {
  test('with unlink button click expect update-link-color emitted with null', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, linkColor: 'red' },
      attrs: { 'onUpdate-link-color': (c) => calls.push(c) },
    })
    await nextTick()

    // Act — click the unlink swatch (∅ button)
    await wrapper.find('.color-swatch--none').trigger('click')
    await nextTick()

    // Assert
    expect(calls).toContain(null)
    wrapper.unmount()
  })

  test('with color swatch clicked expect update-link-color emitted with color name', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(WidgetWrapper, {
      props: { widgetId: 'w1', widgetType: 'enhanced-quote-v4', isLocked: false, settings: {}, linkColor: null },
      attrs: { 'onUpdate-link-color': (c) => calls.push(c) },
    })
    await nextTick()

    // Act — click the first color swatch
    const swatches = wrapper.findAll('.color-swatch:not(.color-swatch--none)')
    await swatches[0].trigger('click')
    await nextTick()

    // Assert — a color name was emitted
    expect(calls.length).toBeGreaterThan(0)
    expect(typeof calls[0]).toBe('string')
    wrapper.unmount()
  })

  test('with active color swatch expect active class on matching swatch', async () => {
    // Arrange
    const wrapper = mountWrapper({ isLocked: false, linkColor: 'red' })
    await nextTick()

    // Assert — active swatch should have active class
    const activeSwatch = wrapper.findAll('.color-swatch--active')
    // One for the color (red), but not the none swatch
    expect(activeSwatch.length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Title tooltip: isLocked=false renders 'Double-click to rename' (line 20)
// ─────────────────────────────────────────────────────────────────────────────

describe('title tooltip with isLocked=false', () => {
  test('with isLocked=false in desktop mode expect tooltip shows rename hint', async () => {
    // Arrange — unlocked widget, not in editing mode, desktop (not mobile)
    const wrapper = mountWrapper({
      widgetType: 'quote', isLocked: false, isMobile: false, userLabel: 'My Widget',
    })
    await nextTick()

    // Assert — widget-title has tooltip about double-click
    const title = wrapper.find('.widget-title')
    expect(title.exists()).toBe(true)
    expect(title.attributes('title')).toContain('Double-click')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// linkColorHex: no linkColor → null (line 108)
// ─────────────────────────────────────────────────────────────────────────────

describe('linkColorHex with no linkColor', () => {
  test('with linkColor=null expect linkColorHex=null', async () => {
    // Arrange
    const wrapper = mountWrapper({ widgetType: 'quote', linkColor: null })
    await nextTick()

    // Assert — null linkColor → linkColorHex = null
    expect(wrapper.vm.$.setupState.linkColorHex).toBeNull()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onTitleTouchEnd with no timer (line 144 FALSE path)
// ─────────────────────────────────────────────────────────────────────────────

describe('onTitleTouchEnd with no timer', () => {
  test('with onTitleTouchEnd called without prior touchStart expect no crash', async () => {
    // Arrange
    const wrapper = mountWrapper({ widgetType: 'quote', isLocked: false })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — call touchEnd without touchStart (longPressTimer is null)
    expect(() => state.onTitleTouchEnd()).not.toThrow()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// elapsedMs: no lastDataAt → null (line 164)
// ─────────────────────────────────────────────────────────────────────────────

describe('elapsedMs with no lastDataAt', () => {
  test('with no widget data expect elapsedMs=null (lastDataAt=null path)', async () => {
    // Arrange — no widget attached (activeWidget=null → lastDataAt=null)
    const wrapper = mountWrapper({ widgetType: 'quote' })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // With no widget ref, lastDataAt=null → elapsedMs=null
    expect(state.elapsedMs).toBeNull()
    wrapper.unmount()
  })
})
