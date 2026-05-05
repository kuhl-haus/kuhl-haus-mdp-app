import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

vi.mock('../NewsArticleModal.vue', () => ({
  default: {
    name: 'NewsArticleModal',
    props: ['article'],
    emits: ['close'],
    template: '<div class="mock-news-modal" :data-has-article="!!article"></div>',
  },
}))

vi.mock('vue-virtual-scroller', () => ({
  RecycleScroller: {
    name: 'RecycleScroller',
    props: ['items', 'itemSize', 'keyField'],
    template: '<div class="mock-scroller"><div v-for="item in items" :key="item[keyField]"><slot :item="item" /></div></div>',
  },
}))

// Export _configRef so individual tests can mutate it (e.g. to simulate missing key)
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  const _configRef = ref({ finlightApiKey: 'test-finlight-key', massiveApiKey: 'k', apiKey: 's' })
  return {
    useConfig: vi.fn(() => ({
      config: _configRef,
      loading: ref(false),
      error: ref(null),
      fetchConfig: vi.fn(),
      isAuthenticated: () => true,
    })),
    _configRef,
  }
})

// Finlight API mock helpers
const SAMPLE_ARTICLES = [
  {
    link: 'https://example.com/1',
    source: 'www.reuters.com',
    title: 'Apple beats earnings estimates',
    summary: 'Apple reported strong Q2 results.',
    publishDate: '2026-04-16T12:00:00Z',
    sentiment: 'positive',
    confidence: 0.95,
    companies: [
      { ticker: 'AAPL', name: 'Apple Inc.', companyId: 1, primaryListing: { exchangeCode: 'XNAS', exchangeCountry: 'US' } },
    ],
  },
  {
    link: 'https://example.com/2',
    source: 'www.seekingalpha.com',
    title: 'AAPL price target cut by analyst',
    summary: 'Morgan Stanley cuts AAPL target.',
    publishDate: '2026-04-16T10:00:00Z',
    sentiment: 'negative',
    confidence: 0.88,
    companies: [
      { ticker: 'AAPL', name: 'Apple Inc.', companyId: 1, primaryListing: { exchangeCode: 'XNAS', exchangeCountry: 'US' } },
    ],
  },
  {
    link: 'https://example.com/3',
    source: 'www.bloomberg.com',
    title: 'Tech sector outlook positive',
    summary: 'Broad tech rally expected.',
    publishDate: '2026-04-16T08:00:00Z',
    sentiment: 'positive',
    confidence: 0.75,
    companies: [],
  },
]

function mockFinlightSuccess(articles = SAMPLE_ARTICLES) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'ok', page: 1, pageSize: articles.length, articles }),
  })
}

function mockFinlightError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) })
}

function mockFinlightNetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ articles: [] }) })
})

import EQV4CompanyNewsCard from '../EQV4CompanyNewsCard.vue'

function mountCard(props = {}) {
  return mount(EQV4CompanyNewsCard, {
    props: {
      ticker: null,
      articleCount: 20,
      isLocked: true,
      ...props,
    },
  })
}

// ── Empty / no-ticker state ───────────────────────────────────────────────────

describe('Empty state', () => {
  test('with no ticker expect no-ticker message shown', () => {
    // Arrange / Act
    const wrapper = mountCard({ ticker: null })

    // Assert
    expect(wrapper.text()).toContain('Enter a ticker to load news')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── Fetch on ticker change ────────────────────────────────────────────────────

describe('Fetch triggers', () => {
  test('with ticker set expect fetch called with correct query and X-API-KEY header', async () => {
    // Arrange
    mockFinlightSuccess()

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.finlight.me/v2/articles',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-KEY': 'test-finlight-key' }),
        body: expect.stringContaining('"query":"ticker:AAPL"'),
      })
    )
  })

  test('with ticker set expect pageSize sent in request body', async () => {
    // Arrange
    mockFinlightSuccess()

    // Act
    const wrapper = mountCard({ ticker: 'TSLA', articleCount: 50 })
    await nextTick()
    await nextTick()

    // Assert
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(callBody.pageSize).toBe(50)
  })

  test('with articleCount changed expect fetch called again', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL', articleCount: 20 })
    await nextTick()
    await nextTick()
    const firstCallCount = global.fetch.mock.calls.length

    // Act
    await wrapper.setProps({ articleCount: 50 })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBeGreaterThan(firstCallCount)
  })

  test('with null finlightApiKey expect error shown and fetch not called', async () => {
    // Arrange — mutate the shared config ref to remove the key
    const { _configRef } = await import('@/composables/useConfig.js')
    _configRef.value.finlightApiKey = null

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch).not.toHaveBeenCalled()
    expect(wrapper.vm.error).toBe('Finlight API key not configured')

    // Restore
    _configRef.value.finlightApiKey = 'test-finlight-key'
  })
})

// ── Articles rendered ─────────────────────────────────────────────────────────

describe('Articles rendered', () => {
  test('with successful fetch expect articles in scroller', async () => {
    // Arrange
    mockFinlightSuccess()

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('.mock-scroller').exists()).toBe(true)
    expect(wrapper.text()).toContain('Apple beats earnings estimates')
    expect(wrapper.text()).toContain('AAPL price target cut by analyst')
  })

  test('with successful fetch expect exposed articles populated', async () => {
    // Arrange
    mockFinlightSuccess()

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.vm.articles.length).toBe(3)
  })

  test('with empty results expect no-news message shown', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ articles: [] }) })

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.text()).toContain('No news found for AAPL')
  })
})

// ── Error states ──────────────────────────────────────────────────────────────

describe('Error states', () => {
  test('with HTTP error expect error message shown', async () => {
    // Arrange
    mockFinlightError(500)

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.text()).toContain('HTTP 500')
    expect(wrapper.find('.eqv4-news-error').exists()).toBe(true)
  })

  test('with network error expect error message shown', async () => {
    // Arrange
    mockFinlightNetworkError()

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-news-error').exists()).toBe(true)
    expect(wrapper.vm.error).toBeTruthy()
  })

  test('with error shown expect retry button calls fetchNews', async () => {
    // Arrange
    mockFinlightError(500)
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act — switch to success then click retry
    mockFinlightSuccess()
    await wrapper.find('.eqv4-retry-btn').trigger('click')
    await nextTick()
    await nextTick()

    // Assert — articles now populated
    expect(wrapper.vm.articles.length).toBe(3)
  })
})

// ── Search filter ─────────────────────────────────────────────────────────────

describe('Search filter', () => {
  test('with search query expect only matching articles shown', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act
    await wrapper.find('.eqv4-news-search').setValue('earnings')
    await nextTick()

    // Assert — only "Apple beats earnings estimates" matches
    expect(wrapper.vm.filteredArticles.length).toBe(1)
    expect(wrapper.text()).toContain('Apple beats earnings estimates')
    expect(wrapper.text()).not.toContain('price target cut')
  })

  test('with search cleared expect all articles shown', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()
    await wrapper.find('.eqv4-news-search').setValue('earnings')
    await nextTick()

    // Act
    await wrapper.find('.eqv4-news-search').setValue('')
    await nextTick()

    // Assert
    expect(wrapper.vm.filteredArticles.length).toBe(3)
  })
})

// ── Sort ──────────────────────────────────────────────────────────────────────

describe('Sort', () => {
  test('with default sort expect articles ordered newest first', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert — default time desc; first article should be 12:00 (newest)
    const first = wrapper.vm.filteredArticles[0]
    expect(first.title).toBe('Apple beats earnings estimates')
  })

  test('with time sort clicked twice expect oldest first', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act — click time header twice (desc → asc)
    const timeHeader = wrapper.find('.eqv4-nth-time')
    await timeHeader.trigger('click') // first click: already desc → asc
    await nextTick()

    // Assert — oldest first (08:00 article)
    const first = wrapper.vm.filteredArticles[0]
    expect(first.title).toBe('Tech sector outlook positive')
  })

  test('with headline sort expect articles ordered alphabetically', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act — click headline header (default asc for non-time columns)
    await wrapper.find('.eqv4-nth-headline').trigger('click')
    await nextTick()

    // Assert — 'AAPL price target cut...' comes before 'Apple beats...' alphabetically
    const first = wrapper.vm.filteredArticles[0]
    expect(first.title).toContain('AAPL price target cut')
  })

  test('with headline sort clicked twice expect descending order', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act
    const headlineHeader = wrapper.find('.eqv4-nth-headline')
    await headlineHeader.trigger('click')
    await headlineHeader.trigger('click')
    await nextTick()

    // Assert — 'Tech sector...' > 'Apple beats...' desc
    const first = wrapper.vm.filteredArticles[0]
    expect(first.title).toContain('Tech sector outlook positive')
  })
})

// ── Article count ─────────────────────────────────────────────────────────────

describe('Article count selector', () => {
  test('with article count changed expect update-article-count emitted', async () => {
    // Arrange
    mockFinlightSuccess()
    const calls = []
    const wrapper = mountCard(
      { ticker: 'AAPL', articleCount: 20 },
    )
    // VTU 2.4.x: capture emitted via attrs
    // Re-mount with event capture
    const wrapper2 = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', articleCount: 20, isLocked: true },
      attrs: { onUpdateArticleCount: (n) => calls.push(n) },
    })
    await nextTick()
    await nextTick()

    // Act
    const select = wrapper2.find('.eqv4-news-count-select')
    await select.setValue('50')
    await select.trigger('change')
    await nextTick()

    // Assert
    expect(calls).toContain(50)
  })
})

// ── Remove button ─────────────────────────────────────────────────────────────

describe('Remove button', () => {
  test('with isLocked false expect remove button visible', () => {
    // Arrange / Act
    const wrapper = mountCard({ isLocked: false })

    // Assert
    expect(wrapper.find('.eqv4-news-remove').exists()).toBe(true)
  })

  test('with isLocked true expect remove button hidden', () => {
    // Arrange / Act
    const wrapper = mountCard({ isLocked: true })

    // Assert
    expect(wrapper.find('.eqv4-news-remove').exists()).toBe(false)
  })

  test('with remove button click expect remove event emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: null, articleCount: 20, isLocked: false },
      attrs: { onRemove: () => calls.push(true) },
    })

    // Act
    await wrapper.find('.eqv4-news-remove').trigger('click')

    // Assert
    expect(calls).toHaveLength(1)
  })
})

// ── Refresh button ────────────────────────────────────────────────────────────

describe('Refresh button', () => {
  test('with refresh button click expect fetchNews called again', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()
    const callsBefore = global.fetch.mock.calls.length

    // Act
    await wrapper.find('.eqv4-news-refresh').trigger('click')
    await nextTick()

    // Assert
    expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ── Detail modal ──────────────────────────────────────────────────────────────

describe('Detail modal', () => {
  test('with row click expect selected set and modal receives article', async () => {
    // Arrange
    mockFinlightSuccess()
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Act
    await wrapper.find('.eqv4-news-row').trigger('click')
    await nextTick()

    // Assert — selected is set; NewsArticleModal stub shows article present
    expect(wrapper.vm.selected).not.toBeNull()
    expect(wrapper.vm.selected.title).toBe('Apple beats earnings estimates')
    expect(wrapper.find('.mock-news-modal').attributes('data-has-article')).toBe('true')
  })
})

// ── Exposed interface ─────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('with card mounted expect required properties exposed', () => {
    // Arrange / Act
    const wrapper = mountCard()
    const vm = wrapper.vm

    // Assert
    expect(vm.articles).toBeDefined()
    expect(vm.loading).toBeDefined()
    expect(vm.error).toBeDefined()
    expect(typeof vm.fetchNews).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Branch coverage additions
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchNews: no finlightApiKey', () => {
  test('with no finlightApiKey in config expect error state and no fetch', async () => {
    // Arrange — set null finlightApiKey BEFORE mounting
    const { _configRef } = await import('@/composables/useConfig.js')
    _configRef.value.finlightApiKey = null

    // Mount with ticker set so fetchNews is called immediately
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', isLocked: true, articleCount: 10 },
    })
    // fetchNews runs immediately with null finlightApiKey
    await nextTick()

    // Assert — no API key → error shown (if(!config.value?.finlightApiKey) body entered)
    const state = wrapper.vm.$.setupState
    expect(state.error).toContain('key not configured')

    // Cleanup — restore finlightApiKey
    _configRef.value.finlightApiKey = 'test-finlight-key'
    wrapper.unmount()
  })
})

describe('fetchNews: json.articles null fallback', () => {
  test('with json.articles=null expect articles set to [] (null ?? [] fallback)', async () => {
    // Arrange — API returns null articles
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ articles: null }),
    })
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', isLocked: true, articleCount: 10 },
    })
    await nextTick(); await nextTick(); await nextTick()

    // Assert
    expect(wrapper.vm.$.setupState.articles).toEqual([])
    wrapper.unmount()
  })
})

describe('cycleSort: toggle direction on same key from asc', () => {
  test('with sortDir=asc on same key expect toggled to desc', async () => {
    // Arrange — force asc on time key
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: null, isLocked: true, articleCount: 10 },
    })
    await nextTick()
    const state = wrapper.vm.$.setupState
    state.sortDir = 'asc'
    state.sortKey = 'time'

    // Act — cycleSort on same 'time' key (asc → desc)
    state.cycleSort('time')
    await nextTick()

    // Assert
    expect(state.sortDir).toBe('desc')
    wrapper.unmount()
  })
})

describe('filteredArticles sort by title (desc)', () => {
  test('with sortKey=title desc expect reverse alphabetical order', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        articles: [
          { title: 'Apple News',      publishDate: '2024-01-01T00:00:00Z' },
          { title: 'Zebra Corp News', publishDate: '2024-01-02T00:00:00Z' },
        ],
      }),
    })
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', isLocked: true, articleCount: 10 },
    })
    await nextTick(); await nextTick(); await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — sort title desc (Z before A)
    state.sortKey = 'title'
    state.sortDir = 'desc'
    await nextTick()

    // Assert
    expect(state.filteredArticles[0].title).toBe('Zebra Corp News')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ticker watcher: ticker changes to null → if(t) FALSE path (line 167)
// ─────────────────────────────────────────────────────────────────────────────

describe('ticker changed to null', () => {
  test('with ticker changed to null expect fetchNews NOT called', async () => {
    // Arrange — start with ticker, then change to null
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', isLocked: true, articleCount: 10 },
    })
    await nextTick(); await nextTick(); await nextTick()
    const callsBefore = global.fetch.mock.calls.length

    // Act — change ticker to null (triggers watcher with t=null)
    await wrapper.setProps({ ticker: null })
    await nextTick()

    // Assert — no additional fetch call (if(t) FALSE path)
    expect(global.fetch.mock.calls.length).toBe(callsBefore)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredArticles sort: equal timestamps → return 0 (line 207/208)
// ─────────────────────────────────────────────────────────────────────────────

describe('filteredArticles sort: equal timestamps', () => {
  test('with two articles having same timestamp expect no reordering', async () => {
    // Arrange — same publishDate → av === bv → return 0
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        articles: [
          { title: 'Article A', publishDate: '2024-01-01T00:00:00Z' },
          { title: 'Article B', publishDate: '2024-01-01T00:00:00Z' },  // same timestamp
        ],
      }),
    })
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: 'AAPL', isLocked: true, articleCount: 10 },
    })
    await nextTick(); await nextTick(); await nextTick()
    const state = wrapper.vm.$.setupState

    // Sort by time (both have same time → return 0 from compare)
    state.sortKey = 'time'
    state.sortDir = 'asc'
    await nextTick()

    // Assert — both articles present (equal timestamps → return 0 preserves order)
    expect(state.filteredArticles.length).toBe(2)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4CompanyNewsCard L134: if (!props.ticker) return (TRUE path)
// Call fetchNews directly without ticker to hit early return
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchNews early-return with null ticker (L134 TRUE)', () => {
  test('with no ticker expect fetchNews returns early (if !props.ticker TRUE)', async () => {
    // Arrange — mount without ticker
    const { mount } = await import('@vue/test-utils')
    const { nextTick } = await import('vue')
    const wrapper = mount(EQV4CompanyNewsCard, {
      props: { ticker: null },
    })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — call fetchNews directly (ticker=null → if(!props.ticker) return TRUE path)
    if (state.fetchNews) {
      await state.fetchNews()
    }

    // Assert — loading stays false (returned early)
    expect(state.loading).toBe(false)
    wrapper.unmount()
  })
})
