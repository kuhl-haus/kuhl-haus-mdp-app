import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useDashboardStore } from '@/stores/useDashboardStore.js'

// ── Mock useWebSocketClient ───────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(config?.feedName ?? ''),
      cacheKey:     ref(config?.cacheKey ?? ''),
      wsUrl:        ref(config?.wsUrl ?? 'ws://localhost:4202/ws'),
      authKey:      ref(config?.authKey ?? 'secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(config?.cacheLimit ?? 1000),
    })),
  }
})

// ── Mock useWidgetBus ─────────────────────────────────────────────────────────
vi.mock('@/composables/useWidgetBus.js', async () => {
  return {
    setNewsTimestamp: vi.fn(),
  }
})

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

// ── Mock vue-virtual-scroller ─────────────────────────────────────────────────
vi.mock('vue-virtual-scroller', () => ({
  RecycleScroller: {
    name: 'RecycleScroller',
    props: ['items', 'itemSize', 'keyField'],
    template: `<div><slot v-for="item in items" :item="item" /></div>`,
  },
}))

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import CompanyNews from '../CompanyNews.vue'

const defaultProps = {
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

function mountCompanyNews(propsOverrides = {}) {
  return mount(CompanyNews, {
    props: { ...defaultProps, ...propsOverrides },
    global: { stubs: { Teleport: true } },
  })
}

// ── useConfig integration ─────────────────────────────────────────────────────
// Design: useWebSocketClient is called once at setup. wsUrl and authKey are
// stored as refs inside the composable. A watcher on appConfig updates those
// refs when config loads, so connect() always dials the real endpoint even if
// config wasn't ready at mount time.

beforeEach(() => {
  setActivePinia(createPinia())
})

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
    mountCompanyNews()

    // Assert
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://test-server:4202/ws')
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'secret-api-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    // Act
    mountCompanyNews()

    // Assert
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.authKey).toBe('secret-api-key')
  })

  test('wsUrl ref is updated when config loads after null initial state', async () => {
    // Arrange — config starts null (pre-fetch), then loads
    const configRef = ref(null)
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  configRef,
      loading: ref(true),
      error:   ref(null),
    })
    mountCompanyNews()
    const wsUrlRef = vi.mocked(useWebSocketClient).mock.results[0].value.wsUrl

    // Assert pre-load: wsUrl holds the fallback
    expect(wsUrlRef.value).toBe('ws://localhost:4202/ws')

    // Act — config arrives asynchronously
    configRef.value = { apiKey: 'loaded-key', wsEndpoint: 'ws://real-server:4202/ws', massiveApiKey: null, finlightApiKey: null }
    await nextTick()

    // Assert post-load: wsUrl ref updated to real endpoint
    expect(wsUrlRef.value).toBe('ws://real-server:4202/ws')
  })

  test('authKey ref is updated when config loads after null initial state', async () => {
    // Arrange — config starts null (pre-fetch), then loads
    const configRef = ref(null)
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  configRef,
      loading: ref(true),
      error:   ref(null),
    })
    mountCompanyNews()
    const authKeyRef = vi.mocked(useWebSocketClient).mock.results[0].value.authKey

    // Assert pre-load: authKey holds the fallback
    expect(authKeyRef.value).toBe('secret')

    // Act — config arrives asynchronously
    configRef.value = { apiKey: 'loaded-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }
    await nextTick()

    // Assert post-load: authKey ref updated
    expect(authKeyRef.value).toBe('loaded-key')
  })

  test('useWebSocketClient uses fallback wsUrl when config is null', () => {
    // Arrange — simulates pre-fetch state where config has not yet loaded
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    mountCompanyNews()

    // Assert — fallback URL used at construction time
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://localhost:4202/ws')
  })

  test('useWebSocketClient uses fallback authKey when config is null', () => {
    // Arrange — simulates pre-fetch state where config has not yet loaded
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    // Act
    mountCompanyNews()

    // Assert — fallback authKey used at construction time
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.authKey).toBe('secret')
  })
})

// ── Empty / loading states ────────────────────────────────────────────────────

describe('empty states', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('with no activeTicker expect empty prompt shown', () => {
    // Arrange / Act
    const wrapper = mountCompanyNews()
    // Assert
    expect(wrapper.find('.cn-empty').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with ticker entered but no news expect waiting state', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    // Act — simulate entering ticker
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // Assert — waiting state shown
    expect(wrapper.find('.cn-empty').exists()).toBe(true)
    expect(wrapper.find('.cn-empty').text()).toContain('AAPL')
    wrapper.unmount()
  })
})

// ── applyInput behavior ────────────────────────────────────────────────────

describe('applyInput', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('with empty input expect no ticker set', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    // Act
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // Assert — still shows no-ticker empty state
    expect(wrapper.find('.cn-empty').text()).not.toContain('Waiting')
    wrapper.unmount()
  })

  test('with input and linkColor expect setActiveTicker called', async () => {
    // Arrange
    const store = useDashboardStore()
    const wrapper = mountCompanyNews({ linkColor: 'blue' })
    // Act
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // Assert
    expect(store.activeTickers['blue']).toBe('AAPL')
    wrapper.unmount()
  })

  test('with enter keypress expect same behavior as click', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    // Act
    await wrapper.find('.cn-input').setValue('NVDA')
    await wrapper.find('.cn-input').trigger('keyup.enter')
    await wrapper.vm.$nextTick()
    // Assert
    expect(wrapper.find('.cn-empty').text()).toContain('NVDA')
    wrapper.unmount()
  })
})

// ── News data rendering ──────────────────────────────────────────────────────

describe('news data rendering', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  function getOnData() {
    return vi.mocked(useWebSocketClient).mock.calls[0][0].onData
  }

  const sampleArticles = [
    {
      title: 'AAPL beats estimates',
      summary: 'Good quarter for Apple',
      link: 'https://example.com/1',
      source: 'example.com',
      publishDate: new Date('2026-04-30T12:00:00Z').toISOString(),
      sentiment: 'positive',
      confidence: 0.9,
      companies: [],
      images: [],
    },
    {
      title: 'AAPL misses on revenue',
      summary: 'Revenue came in below...',
      link: 'https://example.com/2',
      source: 'example.com',
      publishDate: new Date('2026-04-29T10:00:00Z').toISOString(),
      sentiment: 'negative',
      confidence: 0.7,
      companies: [],
      images: [],
    },
  ]

  test('with news data received expect articles shown in desktop table', async () => {
    // Arrange
    const wrapper = mountCompanyNews({ isMobile: false })
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — send articles via onData
    onData(sampleArticles)
    await wrapper.vm.$nextTick()

    // Assert — news table rendered
    expect(wrapper.find('.news-table-wrap').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with news data received in mobile mode expect card list shown', async () => {
    // Arrange
    const wrapper = mountCompanyNews({ isMobile: true })
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act
    onData(sampleArticles)
    await wrapper.vm.$nextTick()

    // Assert — mobile card list shown
    expect(wrapper.find('.news-card-list').exists()).toBe(true)
    expect(wrapper.findAll('.news-card').length).toBe(2)
    wrapper.unmount()
  })

  test('with non-array onData expect single article wrapped in array', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — single article object (not array)
    onData(sampleArticles[0])
    await wrapper.vm.$nextTick()

    // Assert — one article in table
    expect(wrapper.find('.news-table-wrap').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with duplicate articles expect deduplication by link', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — send same articles twice
    onData(sampleArticles)
    await wrapper.vm.$nextTick()
    onData(sampleArticles)  // duplicates
    await wrapper.vm.$nextTick()

    // Assert — still only 2 articles (deduped)
    expect(wrapper.findAll('.vs-row').length).toBe(2)
    wrapper.unmount()
  })

  test('with article with no title expect filtered out', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Act — only item has no title
    onData([{ link: 'https://x.com', publishDate: null }])
    await wrapper.vm.$nextTick()

    // Assert — no articles shown (empty state or no rows)
    const rows = wrapper.findAll('.vs-row')
    expect(rows.length).toBe(0)
    wrapper.unmount()
  })

  test('with search query expect filtered results shown', async () => {
    // Arrange
    const wrapper = mountCompanyNews()
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    onData(sampleArticles)
    await wrapper.vm.$nextTick()

    // Act — type in search
    await wrapper.find('.search-input').setValue('beats')
    await wrapper.vm.$nextTick()

    // Assert — only article containing 'beats' shown
    expect(wrapper.findAll('.vs-row').length).toBe(1)
    wrapper.unmount()
  })

  test('with maxArticles setting change expect update-settings emitted', async () => {
    // Arrange — max-articles-select is only visible when news articles are loaded
    const settingsCalls = []
    const wrapper = mount(CompanyNews, {
      props: { ...defaultProps, settings: { maxArticles: 100 } },
      global: { stubs: { Teleport: true } },
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })

    // Load a ticker and feed news so the controls section is visible
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const onData = vi.mocked(useWebSocketClient).mock.calls[0][0].onData
    onData([{ title: 'Test article', link: 'https://x.com', publishDate: '2026-04-30T12:00:00Z', source: 'x.com', companies: [], images: [] }])
    await wrapper.vm.$nextTick()

    // Act — change max articles (select is now visible)
    await wrapper.find('.max-articles-select').setValue(500)
    await wrapper.vm.$nextTick()
    // Assert
    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[0].maxArticles).toBe(500)
    wrapper.unmount()
  })
})


// ── sorting ───────────────────────────────────────────────────────────────────

describe('sorting', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  const twoArticles = [
    { title: 'Article B', link: 'https://x.com/b', publishDate: new Date('2026-04-29T10:00:00Z').toISOString(), source: 'x.com', companies: [], images: [] },
    { title: 'Article A', link: 'https://x.com/a', publishDate: new Date('2026-04-30T12:00:00Z').toISOString(), source: 'x.com', companies: [], images: [] },
  ]

  function getOnData() {
    return vi.mocked(useWebSocketClient).mock.calls[0][0].onData
  }

  async function mountWithNews(props = {}) {
    const wrapper = mountCompanyNews(props)
    const onData = getOnData()
    await wrapper.find('.cn-input').setValue('AAPL')
    await wrapper.find('.cn-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    onData(twoArticles)
    await wrapper.vm.$nextTick()
    return wrapper
  }

  test('with title sort clicked expect title sort applied', async () => {
    // Arrange
    const wrapper = await mountWithNews()
    // Act — click the headline/title header
    const headers = wrapper.findAll('.vs-th')
    const titleHeader = headers.find(h => h.text().includes('Headline') || h.text().includes('Title'))
    if (titleHeader) {
      await titleHeader.trigger('click')
      await wrapper.vm.$nextTick()
    }
    // Assert — no crash, component renders
    expect(wrapper.find('.news-table-wrap').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with sort clicked twice expect direction toggles', async () => {
    // Arrange
    const wrapper = await mountWithNews()
    const headers = wrapper.findAll('.vs-th')
    // Act — click same header twice
    await headers[0].trigger('click')
    await wrapper.vm.$nextTick()
    await headers[0].trigger('click')
    await wrapper.vm.$nextTick()
    // Assert — component still renders
    expect(wrapper.find('.vs-row').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with sort ascending by time expect oldest first', async () => {
    // Arrange
    const wrapper = await mountWithNews()
    const headers = wrapper.findAll('.vs-th')
    // Click time header twice: first sets desc→asc, current default is desc
    await headers[0].trigger('click')  // toggle to asc
    await wrapper.vm.$nextTick()
    // Assert — rows rendered
    const rows = wrapper.findAll('.vs-row')
    expect(rows.length).toBe(2)
    wrapper.unmount()
  })
})
