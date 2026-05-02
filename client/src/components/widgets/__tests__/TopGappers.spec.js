import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return { useWebSocketClient: vi.fn((c) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(c?.feedName ?? ''),
      cacheKey:     ref(c?.cacheKey ?? ''),
      wsUrl:        ref(c?.wsUrl    ?? 'ws://localhost:4202/ws'),
      authKey:      ref(c?.authKey  ?? 'secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(c?.cacheLimit ?? 1000),
    })) }
})
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return { useScannerLink: vi.fn(() => ({ activeTicker: ref(null), onRowClick: vi.fn() })) }
})
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return { useWidgetBus: vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })), getFlameVariant: vi.fn(() => null), getFlameTooltip: vi.fn(() => ''), newsTimestamps: reactive({}) }
})
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return { useConfig: vi.fn(() => ({ config: ref({ apiKey: 'mock-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })) }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import TopGappers from '../TopGappers.vue'

const defaultProps = { isLocked: true, linkColor: null, isMobile: false, settings: {} }

describe('useConfig integration', () => {
  beforeEach(() => { vi.mocked(useWebSocketClient).mockClear(); vi.mocked(useConfig).mockClear() })

  test('useWebSocketClient receives wsUrl from config.value.wsEndpoint', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'k', wsEndpoint: 'ws://real:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopGappers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://real:4202/ws')
    w.unmount()
  })

  test('useWebSocketClient receives authKey from config.value.apiKey', () => {
    // Arrange
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref({ apiKey: 'real-key', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }), loading: ref(false), error: ref(null) })
    // Act
    const w = mount(TopGappers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].authKey).toBe('real-key')
    w.unmount()
  })

  test('useWebSocketClient falls back to default wsUrl when config is null', () => {
    // Arrange — defensive baseline
    vi.mocked(useConfig).mockReturnValueOnce({ config: ref(null), loading: ref(true), error: ref(null) })
    // Act
    const w = mount(TopGappers, { props: defaultProps })
    // Assert
    expect(vi.mocked(useWebSocketClient).mock.calls[0][0].wsUrl).toBe('ws://localhost:4202/ws')
    w.unmount()
  })
})
