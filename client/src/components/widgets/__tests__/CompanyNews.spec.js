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
  const { reactive } = await import('vue')
  return {
    useWidgetBus: vi.fn(() => ({
      activeTickers:    reactive({}),
      setActiveTicker:  vi.fn(),
    })),
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
