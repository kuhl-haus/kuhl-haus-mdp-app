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

describe('useConfig integration', () => {
  beforeEach(() => {
    vi.mocked(useWebSocketClient).mockClear()
    vi.mocked(useConfig).mockClear()
  })

  test('useConfig is called on mount', () => {
    mountCompanyNews()
    expect(useConfig).toHaveBeenCalled()
  })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'test-key', wsEndpoint: 'ws://test-server:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    mountCompanyNews()

    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://test-server:4202/ws')
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref({ apiKey: 'secret-api-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })

    mountCompanyNews()

    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.authKey).toBe('secret-api-key')
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // config.value is null — simulates pre-fetch state
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    mountCompanyNews()

    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.wsUrl).toBe('ws://localhost:4202/ws')
  })

  test('useWebSocketClient falls back to default authKey when config is null', () => {
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(true),
      error:   ref(null),
    })

    mountCompanyNews()

    const callArgs = vi.mocked(useWebSocketClient).mock.calls[0][0]
    expect(callArgs.authKey).toBe('secret')
  })
})
