import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// ── Mock useWebSocketClient ───────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      wsUrl:        ref(config?.wsUrl   ?? 'ws://localhost:4202/ws'),
      authKey:      ref(config?.authKey ?? 'secret'),
      getCache:     vi.fn(),
      cacheLimit:   ref(config?.cacheLimit ?? 1000),
    })),
  }
})

// ── Mock useConfig ───────────────────────────────────────────────────────────
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

// ── Mock useWidgetBus ─────────────────────────────────────────────────────────
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive, ref } = await import('vue')
  const activeTickers = reactive({})
  return {
    useWidgetBus:       vi.fn(() => ({ setActiveTicker: vi.fn(), activeTickers })),
    setNewsTimestamp:   vi.fn(),
    activeTickers,
    setActiveTicker:    vi.fn(),
  }
})

// ── Mock vue-virtual-scroller ─────────────────────────────────────────────────
vi.mock('vue-virtual-scroller', () => ({
  RecycleScroller: {
    name: 'RecycleScroller',
    props: ['items', 'itemSize', 'keyField'],
    template: `<div><slot v-for="item in items" :item="item" /></div>`,
  },
}))

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useWidgetBus, setActiveTicker, activeTickers } from '@/composables/useWidgetBus.js'
import { useConfig } from '@/composables/useConfig.js'
import NewsFeed from '../NewsFeed.vue'

// Helper: call onData from the most recent useWebSocketClient mount
const triggerData = (data) => {
  const calls = vi.mocked(useWebSocketClient).mock.calls
  const lastCall = calls[calls.length - 1]
  lastCall[0].onData(data)
}

// Reset shared activeTickers reactive object between tests to prevent state leakage
beforeEach(() => {
  Object.keys(activeTickers).forEach(k => delete activeTickers[k])
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  feedName:  'news:feed:latest',
  cacheKey:  'news:feed:latest',
  colWidths: {},
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

function makeArticle(overrides = {}) {
  return {
    title:       'Test headline',
    link:        'https://example.com/test',
    publishDate: new Date().toISOString(),
    source:      'example.com',
    sentiment:   'neutral',
    summary:     'Test summary',
    companies:   [{ ticker: 'AAPL', name: 'Apple Inc.', primaryListing: { exchangeCode: 'XNAS' } }],
    images:      [],
    ...overrides,
  }
}

function mountFeed(propsOverrides = {}) {
  return mount(NewsFeed, {
    props: { ...defaultProps, ...propsOverrides },
    global: { stubs: { Teleport: true } },
  })
}

// ── Ticker mode toggle — rendering ────────────────────────────────────────────

describe('Ticker mode toggle', () => {
  test('mode toggle button renders in the controls bar', () => {
    const wrapper = mountFeed()
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').exists()).toBe(true)
  })

  test('default mode is filter when no saved setting', () => {
    const wrapper = mountFeed()
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').text()).toBe('filter')
  })

  test('renders select label when settings.tickerClickMode is select', () => {
    const wrapper = mountFeed({ settings: { tickerClickMode: 'select' } })
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').text()).toBe('select')
  })

  test('clicking toggle switches from filter to select', async () => {
    const wrapper = mountFeed()
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').text()).toBe('select')
  })

  test('clicking toggle twice returns to filter', async () => {
    const wrapper = mountFeed()
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').text()).toBe('filter')
  })

  test('toggle button has active class in filter mode', () => {
    const wrapper = mountFeed()
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').classes()).toContain('filter-btn--active')
  })

  test('toggle button does not have active class in select mode', async () => {
    const wrapper = mountFeed({ settings: { tickerClickMode: 'select' } })
    expect(wrapper.find('[data-testid="ticker-mode-toggle"]').classes()).not.toContain('filter-btn--active')
  })
})

// ── Ticker mode toggle — settings persistence ─────────────────────────────────

// Note: VTU 2.4.x + <script setup> emit bug — wrapper.emitted() doesn't capture
// Vue emissions from defineEmits. Use attrs: { 'onUpdate-settings': handler } instead.
// TODO: revisit after @vue/test-utils > 2.4.6 (upstream: github.com/vuejs/test-utils/issues/2014)
describe('Ticker mode toggle — settings persistence', () => {
  test('toggling to select emits update-settings with tickerClickMode select', async () => {
    const calls = []
    const wrapper = mount(NewsFeed, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].tickerClickMode).toBe('select')
  })

  test('toggling to filter emits update-settings with tickerClickMode filter', async () => {
    const calls = []
    const wrapper = mount(NewsFeed, {
      props: { ...defaultProps, settings: { tickerClickMode: 'select' } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1].tickerClickMode).toBe('filter')
  })

  test('toggling preserves other existing settings', async () => {
    const calls = []
    const wrapper = mount(NewsFeed, {
      props: { ...defaultProps, settings: { hasTickersOnly: true, tickerClickMode: 'filter' } },
      attrs: { 'onUpdate-settings': (s) => calls.push(s) },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    expect(calls.length).toBeGreaterThan(0)
    const last = calls[calls.length - 1]
    expect(last.tickerClickMode).toBe('select')
    expect(last.hasTickersOnly).toBe(true)
  })
})

// ── Filter mode (default) ─────────────────────────────────────────────────────

describe('Filter mode — ticker tag click', () => {
  test('clicking a ticker tag filters the feed and shows active-ticker-pill', async () => {
    const wrapper = mountFeed({ linkColor: 'blue' })
    triggerData([makeArticle()])
    await nextTick()

    const tags = wrapper.findAll('.ticker-tag')
    expect(tags.length).toBeGreaterThan(0)
    await tags[0].trigger('click')
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(true)
    expect(wrapper.find('.active-ticker-pill').text()).toContain('AAPL')
  })

  test('filter mode: ticker tag click broadcasts via setActiveTicker', async () => {
    const { useWidgetBus: busMock } = await import('@/composables/useWidgetBus.js')
    const mockSet = vi.fn()
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: mockSet, activeTickers: {} })

    const wrapper = mountFeed({ linkColor: 'blue' })
    triggerData([makeArticle()])
    await nextTick()

    await wrapper.findAll('.ticker-tag')[0].trigger('click')
    await nextTick()

    expect(mockSet).toHaveBeenCalledWith('blue', 'AAPL')
  })
})

// ── Select mode ───────────────────────────────────────────────────────────────

describe('Select mode — ticker tag click', () => {
  test('clicking a ticker tag broadcasts to linked widgets', async () => {
    const { useWidgetBus: busMock } = await import('@/composables/useWidgetBus.js')
    const mockSet = vi.fn()
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: mockSet, activeTickers: {} })

    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    triggerData([makeArticle()])
    await nextTick()

    await wrapper.findAll('.ticker-tag')[0].trigger('click')
    await nextTick()

    expect(mockSet).toHaveBeenCalledWith('blue', 'AAPL')
  })

  test('select mode: ticker tag click does not set active-ticker-pill', async () => {
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    triggerData([makeArticle()])
    await nextTick()

    await wrapper.findAll('.ticker-tag')[0].trigger('click')
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(false)
  })

  test('select mode: all articles remain visible after ticker tag click', async () => {
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    triggerData([
      makeArticle({ link: 'https://example.com/a1' }),
      makeArticle({ link: 'https://example.com/a2', companies: [{ ticker: 'MSFT', name: 'Microsoft', primaryListing: { exchangeCode: 'XNAS' } }] }),
    ])
    await nextTick()

    await wrapper.findAll('.ticker-tag')[0].trigger('click')
    await nextTick()

    expect(wrapper.findAll('.vs-row').length).toBe(2)
  })

  test('select mode: clicking same ticker twice broadcasts null to clear linked widgets', async () => {
    const { useWidgetBus: busMock } = await import('@/composables/useWidgetBus.js')
    const mockSet = vi.fn()
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: mockSet, activeTickers: {} })

    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    triggerData([makeArticle()])
    await nextTick()

    const tag = wrapper.findAll('.ticker-tag')[0]
    await tag.trigger('click')  // first click → broadcasts 'AAPL'
    await tag.trigger('click')  // second click → broadcasts null (deselect)
    await nextTick()

    expect(mockSet).toHaveBeenLastCalledWith('blue', null)
  })

  test('select mode: no linkColor — ticker tag click has no observable effect', async () => {
    const { useWidgetBus: busMock } = await import('@/composables/useWidgetBus.js')
    const mockSet = vi.fn()
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: mockSet, activeTickers: {} })

    const wrapper = mountFeed({ linkColor: null, settings: { tickerClickMode: 'select' } })
    triggerData([makeArticle()])
    await nextTick()

    await wrapper.findAll('.ticker-tag')[0].trigger('click')
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(false)
    expect(mockSet).not.toHaveBeenCalled()
  })
})

// ── Bus sync ──────────────────────────────────────────────────────────────────

describe('Bus sync', () => {
  test('filter mode: external activeTicker change shows active-ticker-pill', async () => {
    const { useWidgetBus: busMock, activeTickers } = await import('@/composables/useWidgetBus.js')
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: vi.fn(), activeTickers })

    const wrapper = mountFeed({ linkColor: 'blue' })
    triggerData([makeArticle()])
    await nextTick()

    activeTickers['blue'] = 'AAPL'
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(true)
  })

  test('select mode: external activeTicker change does not show active-ticker-pill', async () => {
    const { useWidgetBus: busMock, activeTickers } = await import('@/composables/useWidgetBus.js')
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: vi.fn(), activeTickers })

    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    triggerData([makeArticle()])
    await nextTick()

    activeTickers['blue'] = 'AAPL'
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(false)
  })
})


// ── useConfig integration ─────────────────────────────────────────────────────
describe('useConfig integration', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test-server:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mountFeed()

    // Assert
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://test-server:4202/ws')
    wrapper.unmount()
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'real-api-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    const wrapper = mountFeed()

    // Assert
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.authKey).toBe('real-api-key')
    wrapper.unmount()
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // Arrange — defensive baseline
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    const wrapper = mountFeed()

    // Assert
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://localhost:4202/ws')
    wrapper.unmount()
  })
})
