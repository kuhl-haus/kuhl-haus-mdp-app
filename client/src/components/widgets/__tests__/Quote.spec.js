import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

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
      connect:      vi.fn(),
      disconnect:   vi.fn(),
    })),
  }
})

// ── Mock useWidgetBus ─────────────────────────────────────────────────────────
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    useWidgetBus:    vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })),
    getFlameVariant: vi.fn(() => null),
    getFlameTooltip: vi.fn(() => ''),
    newsTimestamps:  reactive({}),
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

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import Quote from '../Quote.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }

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
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://test-server:4202/ws')
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
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].authKey).toBe('real-api-key')
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
    const wrapper = mount(Quote, { props: defaultProps })

    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://localhost:4202/ws')
    wrapper.unmount()
  })
})
