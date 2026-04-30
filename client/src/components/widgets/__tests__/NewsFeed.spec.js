import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// ── Mock useWebSocketClient ───────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  let _onData = null
  const mock = vi.fn((config) => {
    _onData = config.onData
    return {
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      getCache:     vi.fn(),
      cacheLimit:   ref(config.cacheLimit ?? 1000),
    }
  })
  mock.__trigger = (data) => _onData && _onData(data)
  return { useWebSocketClient: mock }
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
import { useWidgetBus, setActiveTicker } from '@/composables/useWidgetBus.js'
import NewsFeed from '../NewsFeed.vue'

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

describe('Ticker mode toggle — settings persistence', () => {
  test('toggling emits update-settings with tickerClickMode select', async () => {
    const wrapper = mountFeed()
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    const emitted = wrapper.emitted('update-settings')
    expect(emitted).toBeTruthy()
    const last = emitted[emitted.length - 1][0]
    expect(last.tickerClickMode).toBe('select')
  })

  test('toggling back emits update-settings with tickerClickMode filter', async () => {
    const wrapper = mountFeed({ settings: { tickerClickMode: 'select' } })
    await wrapper.find('[data-testid="ticker-mode-toggle"]').trigger('click')
    const emitted = wrapper.emitted('update-settings')
    const last = emitted[emitted.length - 1][0]
    expect(last.tickerClickMode).toBe('filter')
  })
})

// ── Filter mode (default) ─────────────────────────────────────────────────────

describe('Filter mode — ticker tag click', () => {
  beforeEach(() => vi.mocked(useWebSocketClient).mockClear())

  test('clicking a ticker tag filters the feed to that ticker', async () => {
    const callsBefore = vi.mocked(useWebSocketClient).mock.calls.length
    const wrapper = mountFeed({ linkColor: 'blue' })
    const wsInstance = vi.mocked(useWebSocketClient).mock.results[callsBefore].value
    wsInstance.getCache = vi.fn()
    // Inject an article
    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    wsMock.__trigger([makeArticle()])
    await nextTick()

    const tagsBefore = wrapper.findAll('.ticker-tag')
    expect(tagsBefore.length).toBeGreaterThan(0)
    await tagsBefore[0].trigger('click')
    await nextTick()

    // active-ticker-pill should appear
    expect(wrapper.find('.active-ticker-pill').exists()).toBe(true)
    expect(wrapper.find('.active-ticker-pill').text()).toContain('AAPL')
  })

  test('filter mode: ticker tag click also broadcasts via setActiveTicker', async () => {
    const { useWidgetBus: busMock } = await import('@/composables/useWidgetBus.js')
    const mockSet = vi.fn()
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: mockSet, activeTickers: {} })

    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue' })
    wsMock.__trigger([makeArticle()])
    await nextTick()

    const tags = wrapper.findAll('.ticker-tag')
    await tags[0].trigger('click')
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

    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    wsMock.__trigger([makeArticle()])
    await nextTick()

    const tags = wrapper.findAll('.ticker-tag')
    await tags[0].trigger('click')
    await nextTick()

    expect(mockSet).toHaveBeenCalledWith('blue', 'AAPL')
  })

  test('select mode: ticker tag click does not filter the feed (no active-ticker-pill)', async () => {
    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    wsMock.__trigger([makeArticle()])
    await nextTick()

    const tags = wrapper.findAll('.ticker-tag')
    await tags[0].trigger('click')
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(false)
  })

  test('select mode: all articles remain visible after ticker tag click', async () => {
    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    wsMock.__trigger([
      makeArticle({ link: 'https://example.com/a1' }),
      makeArticle({ link: 'https://example.com/a2', companies: [{ ticker: 'MSFT', name: 'Microsoft', primaryListing: { exchangeCode: 'XNAS' } }] }),
    ])
    await nextTick()

    const tags = wrapper.findAll('.ticker-tag')
    await tags[0].trigger('click')
    await nextTick()

    // Both rows still visible — feed unfiltered
    expect(wrapper.findAll('.vs-row').length).toBe(2)
  })
})

// ── Bus sync ──────────────────────────────────────────────────────────────────

describe('Bus sync', () => {
  test('filter mode: external activeTicker change filters the feed', async () => {
    const { useWidgetBus: busMock, activeTickers } = await import('@/composables/useWidgetBus.js')
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: vi.fn(), activeTickers })

    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue' })
    wsMock.__trigger([makeArticle()])
    await nextTick()

    activeTickers['blue'] = 'AAPL'
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(true)
  })

  test('select mode: external activeTicker change does not filter the feed', async () => {
    const { useWidgetBus: busMock, activeTickers } = await import('@/composables/useWidgetBus.js')
    vi.mocked(busMock).mockReturnValueOnce({ setActiveTicker: vi.fn(), activeTickers })

    const { useWebSocketClient: wsMock } = await import('@/composables/useWebSocketClient.js')
    const wrapper = mountFeed({ linkColor: 'blue', settings: { tickerClickMode: 'select' } })
    wsMock.__trigger([makeArticle()])
    await nextTick()

    activeTickers['blue'] = 'AAPL'
    await nextTick()

    expect(wrapper.find('.active-ticker-pill').exists()).toBe(false)
  })
})
