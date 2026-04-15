import { describe, test, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// ── WidgetMenu ────────────────────────────────────────────────────────────────
import WidgetMenu from '../WidgetMenu.vue'

describe('WidgetMenu', () => {
  test('with menu open expect enhanced-quote-v4 option present', async () => {
    // Arrange
    const wrapper = mount(WidgetMenu)

    // Act — open the menu
    await wrapper.find('.menu-toggle').trigger('click')

    // Assert
    const buttons = wrapper.findAll('.widget-button')
    const types = buttons.map(b => b.attributes('data-type') ?? b.text())
    // Find the EQv4 entry by checking emitted value or button text
    expect(wrapper.text()).toContain('Enhanced Quote V4')
  })

  test('with Enhanced Quote V4 clicked expect add-widget emitted with enhanced-quote-v4', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(WidgetMenu, {
      attrs: { onAddWidget: (t) => calls.push(t) },
    })

    // Act
    await wrapper.find('.menu-toggle').trigger('click')
    const buttons = wrapper.findAll('.widget-button')
    const v4btn = buttons.find(b => b.text().includes('Enhanced Quote V4'))
    await v4btn.trigger('click')

    // Assert
    expect(calls).toContain('enhanced-quote-v4')
  })
})

// ── WidgetWrapper ─────────────────────────────────────────────────────────────

// Stub all widget components — WidgetWrapper just resolves and renders them.
vi.mock('../widgets/TopVolume.vue',       () => ({ default: { template: '<div class="stub-top-volume" />' } }))
vi.mock('../widgets/TopGappers.vue',      () => ({ default: { template: '<div class="stub-top-gappers" />' } }))
vi.mock('../widgets/TopGainers.vue',      () => ({ default: { template: '<div class="stub-top-gainers" />' } }))
vi.mock('../widgets/CompanyNews.vue',     () => ({ default: { template: '<div class="stub-company-news" />' } }))
vi.mock('../widgets/NewsFeed.vue',        () => ({ default: { template: '<div class="stub-news-feed" />' } }))
vi.mock('../widgets/Quote.vue',           () => ({ default: { template: '<div class="stub-quote" />' } }))
vi.mock('../widgets/EnhancedQuoteV3.vue', () => ({ default: { template: '<div class="stub-eqv3" />' } }))
vi.mock('../widgets/EnhancedQuoteV4.vue', () => ({ default: { template: '<div class="stub-eqv4" />' } }))

import WidgetWrapper from '../WidgetWrapper.vue'

function mountWrapper(widgetType) {
  return mount(WidgetWrapper, {
    props: {
      widgetId: 'test-widget-1',
      widgetType,
      isLocked: true,
      settings: {},
    },
  })
}

describe('WidgetWrapper', () => {
  test('with widgetType enhanced-quote-v4 expect EQV4 component rendered', () => {
    // Arrange / Act
    const wrapper = mountWrapper('enhanced-quote-v4')

    // Assert
    expect(wrapper.find('.stub-eqv4').exists()).toBe(true)
  })

  test('with widgetType enhanced-quote-v3 expect EQV3 component rendered', () => {
    // Arrange / Act
    const wrapper = mountWrapper('enhanced-quote-v3')

    // Assert
    expect(wrapper.find('.stub-eqv3').exists()).toBe(true)
  })

  test('with widgetType enhanced-quote expect EQV3 backward-compat alias resolved', () => {
    // Arrange / Act
    const wrapper = mountWrapper('enhanced-quote')

    // Assert
    expect(wrapper.find('.stub-eqv3').exists()).toBe(true)
  })
})
