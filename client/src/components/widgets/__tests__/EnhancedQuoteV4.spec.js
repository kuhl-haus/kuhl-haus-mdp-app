import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Global stubs ─────────────────────────────────────────────────────────────

vi.mock('vue3-grid-layout-next', () => ({
  GridLayout: {
    name: 'GridLayout',
    props: ['layout', 'colNum', 'rowHeight', 'margin', 'isDraggable', 'isResizable', 'verticalCompact', 'useCssTransforms'],
    emits: ['update:layout', 'layout-updated'],
    template: '<div class="mock-grid-layout"><slot /></div>',
  },
  GridItem: {
    name: 'GridItem',
    props: ['x', 'y', 'w', 'h', 'i'],
    template: '<div class="mock-grid-item" :data-i="i"><slot /></div>',
  },
}))

vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: () => ({
      config: ref({
        massiveApiKey: 'test-massive-key',
        apiKey: 'secret',
        wsEndpoint: 'ws://localhost:4202/ws',
      }),
      loading: ref(false),
      error: ref(null),
      fetchConfig: vi.fn(),
      isAuthenticated: () => true,
    }),
  }
})

class MockWebSocket {
  constructor() {
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => { this.readyState = WebSocket.OPEN; this.onopen?.() }, 0)
  }
  send() {}
  close() { this.onclose?.({ code: 1000 }) }
}
global.WebSocket = MockWebSocket
global.WebSocket.CONNECTING = 0
global.WebSocket.OPEN = 1
global.WebSocket.CLOSING = 2
global.WebSocket.CLOSED = 3

const MASSIVE_TICKER_RESPONSE = {
  results: {
    name: 'Tesla Inc.',
    sic_description: 'Motor Vehicles',
    description: 'Tesla designs electric vehicles.',
    homepage_url: 'https://tesla.com',
    primary_exchange: 'XNAS',
    market_cap: 800000000000,
    total_employees: 127855,
    list_date: '2010-06-29',
    branding: { logo_url: 'https://api.massive.com/logo.svg', icon_url: 'https://api.massive.com/icon.png' },
  },
}
const MASSIVE_SI_RESPONSE = { results: [{ short_interest: 12000000, days_to_cover: 2.4 }] }
const MASSIVE_SV_RESPONSE = { results: [{ short_volume_ratio: 38.5 }] }

function mockMassiveFetch() {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes('/v3/reference/tickers/')) return Promise.resolve({ ok: true, json: async () => MASSIVE_TICKER_RESPONSE })
    if (url.includes('/short-interest'))         return Promise.resolve({ ok: true, json: async () => MASSIVE_SI_RESPONSE })
    if (url.includes('/short-volume'))           return Promise.resolve({ ok: true, json: async () => MASSIVE_SV_RESPONSE })
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

import EnhancedQuoteV4 from '../EnhancedQuoteV4.vue'

const SAMPLE_QUOTE = {
  symbol: 'TSLA',
  close: 250.0,
  change: 5.0,
  pct_change: 2.04,
  pct_change_since_open: 1.5,
  change_since_open: 3.75,
  end_timestamp: Date.now(),
  official_open_price: 248.0,
  aggregate_vwap: 250.5,
  accumulated_volume: 25000000,
  relative_volume: 2.5,
  avg_volume: 20000000,
  free_float: 800000000,
  prev_day_close: 245.0,
  prev_day_open: 244.0,
  prev_day_high: 253.0,
  prev_day_low: 243.0,
  prev_day_volume: 22000000,
  prev_day_vwap: 248.0,
  pre_market_high: 252.0,
  pre_market_low: 248.0,
  regular_session_high: 255.0,
  regular_session_low: 247.0,
  after_hours_high: 251.0,
  after_hours_low: 249.0,
}

// VTU 2.4.x + <script setup>: capture emitted events via attrs onXxx callback.
function mountWidget(props = {}, onUpdateSettings = null) {
  const attrs = onUpdateSettings ? { onUpdateSettings } : {}
  return mount(EnhancedQuoteV4, {
    props: { isLocked: true, linkColor: null, isMobile: false, settings: {}, ...props },
    attrs,
  })
}

// ── Empty / waiting states ────────────────────────────────────────────────────

describe('Empty and waiting states', () => {
  test('with no ticker expect empty state rendered', () => {
    // Arrange / Act
    const wrapper = mountWidget()

    // Assert
    expect(wrapper.find('.eqv4-empty').exists()).toBe(true)
    expect(wrapper.find('.eqv4-body').exists()).toBe(false)
  })

  test('with ticker but no quote data expect waiting state shown', async () => {
    // Arrange
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-empty').exists()).toBe(true)
    expect(wrapper.find('.eqv4-empty-text').text()).toContain('TSLA')
  })
})

// ── Default layout emission ───────────────────────────────────────────────────

describe('Default layout emission', () => {
  test('with no settings.cards expect update-settings emitted with default cards', async () => {
    // Arrange
    const emitted = []

    // Act
    mountWidget({ settings: {} }, (s) => emitted.push(s))
    await nextTick()

    // Assert
    expect(emitted.length).toBeGreaterThan(0)
    const payload = emitted[0]
    expect(Array.isArray(payload.cards)).toBe(true)
    expect(payload.cards.length).toBe(7)
    expect(payload.cards.map(c => c.id)).toContain('hero')
  })

  test('with settings.cards already set expect no default emission', async () => {
    // Arrange
    const emitted = []
    const existingCards = [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }]

    // Act
    mountWidget({ settings: { cards: existingCards } }, (s) => emitted.push(s))
    await nextTick()

    // Assert
    expect(emitted.length).toBe(0)
  })
})

// ── Grid layout computed ──────────────────────────────────────────────────────

describe('Grid layout computed', () => {
  test('with settings.cards expect gridLayout derived with i equal to id', () => {
    // Arrange
    const cards = [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }, { id: 'today', x: 0, y: 3, w: 2, h: 2 }]
    const wrapper = mountWidget({ settings: { cards } })

    // Act / Assert — VTU unwraps computed refs; access directly
    expect(wrapper.vm.gridLayout[0].i).toBe('hero')
    expect(wrapper.vm.gridLayout[1].i).toBe('today')
  })

  test('with no settings.cards expect gridLayout uses default 7 cards', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: {} })

    // Assert
    expect(wrapper.vm.gridLayout.length).toBe(7)
  })
})

// ── Ticker input ──────────────────────────────────────────────────────────────

describe('Ticker input', () => {
  test('with go button click expect manualTicker set to uppercased input', async () => {
    // Arrange
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('tsla')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.vm.manualTicker).toBe('TSLA')
  })

  test('with enter key on input expect manualTicker applied', async () => {
    // Arrange
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('aapl')
    await wrapper.find('.eqv4-input').trigger('keyup.enter')
    await nextTick()

    // Assert
    expect(wrapper.vm.manualTicker).toBe('AAPL')
  })
})

// ── WDS data ──────────────────────────────────────────────────────────────────

describe('WDS data handling', () => {
  test('with quote data set expect grid body rendered', async () => {
    // Arrange
    const wrapper = mountWidget({ settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } })
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Act — set quoteData via exposed ref (ticker already set above)
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-body').exists()).toBe(true)
    expect(wrapper.find('.mock-grid-layout').exists()).toBe(true)
  })
})

// ── Company and short data fetch ──────────────────────────────────────────────

describe('Company and short data fetch', () => {
  test('with ticker applied expect company fetch called', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v3/reference/tickers/TSLA')
    )
  })

  test('with ticker applied expect short interest fetch called', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/short-interest'))
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/short-volume'))
  })

  test('with company fetch success expect companyData populated', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()
    await nextTick() // settle async fetch

    // Assert
    expect(wrapper.vm.companyData.name).toBe('Tesla Inc.')
    expect(wrapper.vm.companyData.primary_exchange).toBe('XNAS')
  })
})

// ── addCard ───────────────────────────────────────────────────────────────────

describe('addCard', () => {
  test('with addCard called expect update-settings emitted with card appended', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )

    // Act
    wrapper.vm.addCard('today')
    await nextTick()

    // Assert
    expect(emitted.length).toBeGreaterThan(0)
    const lastPayload = emitted[emitted.length - 1]
    expect(lastPayload.cards.some(c => c.id === 'today')).toBe(true)
  })

  test('with addCard called and no gap fits expect card appended to bottom', async () => {
    // Arrange — hero fills all 6 columns at y=0 to y=2
    const emitted = []
    const wrapper = mountWidget(
      { settings: { gridCols: 6, cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )

    // Act — add 'today' (defaultW: 2); hero occupies full width for 3 rows
    wrapper.vm.addCard('today')
    await nextTick()

    // Assert — today placed at y >= 3 (below hero)
    const lastPayload = emitted[emitted.length - 1]
    const added = lastPayload.cards.find(c => c.id === 'today')
    expect(added).toBeDefined()
    expect(added.y).toBeGreaterThanOrEqual(3)
  })

  test('with addCard called for unknown id expect no emission', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
    const beforeCount = emitted.length

    // Act
    wrapper.vm.addCard('nonexistent')
    await nextTick()

    // Assert
    expect(emitted.length).toBe(beforeCount)
  })
})

// ── removeCard ────────────────────────────────────────────────────────────────

describe('removeCard', () => {
  test('with removeCard called expect update-settings emitted without removed card', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      {
        settings: {
          cards: [
            { id: 'hero',  x: 0, y: 0, w: 6, h: 3 },
            { id: 'today', x: 0, y: 3, w: 2, h: 2 },
          ],
        },
      },
      (s) => emitted.push(s)
    )

    // Act
    wrapper.vm.removeCard('today')
    await nextTick()

    // Assert
    expect(emitted.length).toBeGreaterThan(0)
    const lastPayload = emitted[emitted.length - 1]
    expect(lastPayload.cards.find(c => c.id === 'today')).toBeUndefined()
    expect(lastPayload.cards.find(c => c.id === 'hero')).toBeDefined()
  })
})

// ── Grid config ───────────────────────────────────────────────────────────────

describe('Grid config', () => {
  test('with gridCols change expect update-settings emitted with new gridCols', async () => {
    // Arrange — need isLocked:false, activeTicker, and quoteData to render body + edit bar
    const emitted = []
    const wrapper = mountWidget(
      { isLocked: false, settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
    // Set ticker so activeTicker is truthy, then set quoteData
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()

    // Act
    const inputs = wrapper.findAll('.eqv4-config-input')
    await inputs[0].setValue('8')
    await inputs[0].trigger('change')
    await nextTick()

    // Assert
    const lastPayload = emitted[emitted.length - 1]
    expect(lastPayload.gridCols).toBe(8)
  })

  test('with gridRowHeight change expect update-settings emitted with new gridRowHeight', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { isLocked: false, settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()

    // Act
    const inputs = wrapper.findAll('.eqv4-config-input')
    await inputs[1].setValue('50')
    await inputs[1].trigger('change')
    await nextTick()

    // Assert
    const lastPayload = emitted[emitted.length - 1]
    expect(lastPayload.gridRowHeight).toBe(50)
  })
})

// ── chipCardIds ───────────────────────────────────────────────────────────────

describe('chipCardIds', () => {
  test('with settings.chipCards set expect chipCardIds computed correctly', () => {
    // Arrange / Act
    const wrapper = mountWidget({
      settings: { chipCards: ['today', 'volume'] },
    })

    // Assert — VTU unwraps computed refs via defineExpose
    expect(wrapper.vm.chipCardIds.has('today')).toBe(true)
    expect(wrapper.vm.chipCardIds.has('volume')).toBe(true)
    expect(wrapper.vm.chipCardIds.has('hero')).toBe(false)
  })

  test('with no settings.chipCards expect empty chipCardIds set', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: {} })

    // Assert
    expect(wrapper.vm.chipCardIds.size).toBe(0)
  })
})

// ── activeCardIds ─────────────────────────────────────────────────────────────

describe('activeCardIds', () => {
  test('with settings.cards expect activeCardIds contains configured card ids', () => {
    // Arrange
    const cards = [
      { id: 'hero',  x: 0, y: 0, w: 6, h: 3 },
      { id: 'today', x: 0, y: 3, w: 2, h: 2 },
    ]

    // Act
    const wrapper = mountWidget({ settings: { cards } })

    // Assert
    expect(wrapper.vm.activeCardIds.has('hero')).toBe(true)
    expect(wrapper.vm.activeCardIds.has('today')).toBe(true)
    expect(wrapper.vm.activeCardIds.has('session')).toBe(false)
  })
})

// ── Exposed interface ─────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('with widget mounted expect all required properties exposed', () => {
    // Arrange / Act
    const wrapper = mountWidget()
    const vm = wrapper.vm

    // Assert
    expect(vm.lastDataAt).toBeDefined()
    expect(vm.isConnected).toBeDefined()
    expect(vm.reconnecting).toBeDefined()
    expect(vm.quoteData).toBeDefined()
    expect(vm.manualTicker).toBeDefined()
    expect(vm.companyData).toBeDefined()
    expect(vm.companyLoading).toBeDefined()
    expect(vm.shortInterestData).toBeDefined()
    expect(vm.shortInterestLoading).toBeDefined()
    expect(vm.gridLayout).toBeDefined()
    expect(vm.gridCols).toBeDefined()
    expect(vm.gridRowHeight).toBeDefined()
    expect(vm.chipCardIds).toBeDefined()
    expect(typeof vm.addCard).toBe('function')
    expect(typeof vm.removeCard).toBe('function')
    expect(vm.activeCardIds).toBeDefined()
  })
})
