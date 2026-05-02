/**
 * Tests for DashboardGrid.vue useConfig() integration.
 *
 * DashboardGrid is the parent component. By calling useConfig() and gating
 * widget rendering on config.value being non-null, it ensures all child widgets
 * mount with config already available — eliminating the async timing race for
 * autoConnect widgets. refs #254
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// ── Mock heavy/irrelevant dependencies ────────────────────────────────────────
vi.mock('vue3-grid-layout-next', () => ({
  GridLayout: { name: 'GridLayout', props: ['layout', 'colNum', 'rowHeight', 'isDraggable', 'isResizable', 'verticalCompact', 'margin', 'useCssTransforms'], template: '<div class="mock-grid-layout"><slot /></div>' },
  GridItem:   { name: 'GridItem',   props: ['x', 'y', 'w', 'h', 'i'], template: '<div class="mock-grid-item"><slot /></div>' },
}))
vi.mock('../WidgetMenu.vue',    () => ({ default: { name: 'WidgetMenu',    template: '<div class="mock-widget-menu" />' } }))
vi.mock('../WidgetWrapper.vue', () => ({ default: { name: 'WidgetWrapper', template: '<div class="mock-widget-wrapper"><slot /></div>', props: ['widgetType', 'settings', 'isLocked', 'colWidths', 'linkColor', 'isMobile'] } }))

// ── Mock useConfig ────────────────────────────────────────────────────────────
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ apiKey: 'mock-api-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

import { useConfig } from '@/composables/useConfig.js'
import DashboardGrid from '../DashboardGrid.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
function mountGrid(propsOverrides = {}) {
  return mount(DashboardGrid, {
    props: { isMobile: false, ...propsOverrides },
    global: { stubs: { Teleport: true } },
  })
}

// ── useConfig integration ─────────────────────────────────────────────────────
// DashboardGrid must use useConfig() instead of window.__APP_CONFIG__ so that:
//   1. Config is loaded before child widgets mount (eliminates the auto-connect race)
//   2. The auth-required state becomes real (config = null while fetching, 401 on error)

describe('DashboardGrid useConfig integration', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockClear()
  })

  test('layout controls are visible when config is loaded', async () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — layout controls only render when config is available
    expect(wrapper.find('.layout-controls').exists()).toBe(true)
    wrapper.unmount()
  })

  test('layout controls are hidden when config is null (loading state)', async () => {
    // Arrange — config not yet available
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — no layout controls until config arrives
    expect(wrapper.find('.layout-controls').exists()).toBe(false)
    wrapper.unmount()
  })

  test('auth-required message shown when config is null', async () => {
    // Arrange — config not yet loaded
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — auth-required div visible
    expect(wrapper.find('.auth-required').exists()).toBe(true)
    wrapper.unmount()
  })

  test('auth-required message hidden when config is loaded', async () => {
    // Arrange — config loaded successfully
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — no auth gate when authenticated
    expect(wrapper.find('.auth-required').exists()).toBe(false)
    wrapper.unmount()
  })

  test('layout controls appear reactively when config loads after null', async () => {
    // Arrange — config starts null, then loads
    const configRef = ref(null)
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  configRef,
      loading: ref(true),
      error:   ref(null),
    })
    const wrapper = mountGrid()
    await nextTick()

    // Assert pre-load: no layout controls
    expect(wrapper.find('.layout-controls').exists()).toBe(false)

    // Act — config arrives
    configRef.value = { apiKey: 'test-key', wsEndpoint: 'ws://test:4202/ws', massiveApiKey: null, finlightApiKey: null }
    await nextTick()

    // Assert post-load: layout controls now visible
    expect(wrapper.find('.layout-controls').exists()).toBe(true)
    wrapper.unmount()
  })

  test('auth-required message shown and persists when config fetch returns 401', async () => {
    // Arrange — simulates authentication failure: config stays null, error is set
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(false),
      error:   ref(new Error('HTTP 401: Unauthorized')),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — auth-required shown (config null means not authenticated)
    expect(wrapper.find('.auth-required').exists()).toBe(true)

    // Assert — layout controls absent (nothing to show without auth)
    expect(wrapper.find('.layout-controls').exists()).toBe(false)
    wrapper.unmount()
  })

  test('grid layout is not rendered when config is null — widgets cannot mount prematurely', async () => {
    // Arrange — config not yet loaded
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — no grid layout rendered (no widget mount opportunity while config is null)
    expect(wrapper.find('.mock-grid-layout').exists()).toBe(false)
    wrapper.unmount()
  })

  test('grid layout renders when config is loaded', async () => {
    // Arrange — config available
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — grid layout present (widgets can mount with config available)
    // Note: mock-grid-layout comes from the vue3-grid-layout-next mock
    expect(wrapper.find('.mock-grid-layout').exists()).toBe(true)
    wrapper.unmount()
  })

  test('auth-required message not shown after successful auth (error clears with config)', async () => {
    // Arrange — error present initially, then config loads (re-auth or retry)
    const configRef = ref(null)
    const errorRef  = ref(new Error('HTTP 401: Unauthorized'))
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  configRef,
      loading: ref(false),
      error:   errorRef,
    })
    const wrapper = mountGrid()
    await nextTick()

    // Assert pre-auth: auth-required shown
    expect(wrapper.find('.auth-required').exists()).toBe(true)

    // Act — config loaded (user re-authenticated), error cleared
    errorRef.value  = null
    configRef.value = { apiKey: 'test-key', wsEndpoint: 'ws://test:4202/ws', massiveApiKey: null, finlightApiKey: null }
    await nextTick()

    // Assert post-auth: auth-required gone, controls visible
    expect(wrapper.find('.auth-required').exists()).toBe(false)
    expect(wrapper.find('.layout-controls').exists()).toBe(true)
    wrapper.unmount()
  })
})
