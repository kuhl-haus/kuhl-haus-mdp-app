import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EQV4CardPicker from '../EQV4CardPicker.vue'

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
  test('with no ticker expect overlay shown and grid still rendered', () => {
    // Arrange / Act
    const wrapper = mountWidget()

    // Assert — overlay visible, body (grid) always rendered
    expect(wrapper.find('.eqv4-overlay').exists()).toBe(true)
    expect(wrapper.find('.eqv4-body').exists()).toBe(true)
  })

  test('with ticker but no quote data expect waiting overlay shown', async () => {
    // Arrange
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv4-input').setValue('TSLA')
    await wrapper.find('.eqv4-go-btn').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-overlay').exists()).toBe(true)
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
    // Arrange — gridCols:2, hero at x=0,y=0,w=2,h=2 fills the entire 2-column grid.
    // Adding 'session' (defaultW:3): cols-defaultW = 2-3 = -1, so the inner
    // loop condition (x <= -1) never executes — placed stays null, fallback fires.
    const emitted = []
    const wrapper = mountWidget(
      { settings: { gridCols: 2, cards: [{ id: 'hero', x: 0, y: 0, w: 2, h: 2 }] } },
      (s) => emitted.push(s)
    )

    // Act
    wrapper.vm.addCard('session')
    await nextTick()

    // Assert — fallback places session at x=0, y=2 (maxOccupiedY)
    const lastPayload = emitted[emitted.length - 1]
    const added = lastPayload.cards.find(c => c.id === 'session')
    expect(added).toBeDefined()
    expect(added.x).toBe(0)
    expect(added.y).toBe(2)
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
    // Arrange — edit bar is always visible when !isLocked; no ticker or data needed
    const emitted = []
    const wrapper = mountWidget(
      { isLocked: false, settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
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
    // Arrange — edit bar is always visible when !isLocked; no ticker or data needed
    const emitted = []
    const wrapper = mountWidget(
      { isLocked: false, settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
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

// ── onLayoutUpdated ─────────────────────────────────────────────────────────

describe('onLayoutUpdated', () => {
  test('with layout-updated event expect update-settings emitted with new card positions', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()

    // Act — emit layout-updated from the mock GridLayout with new positions
    const grid = wrapper.findComponent({ name: 'GridLayout' })
    await grid.vm.$emit('layout-updated', [{ i: 'hero', x: 1, y: 0, w: 5, h: 3 }])
    await nextTick()

    // Assert
    const payload = emitted[emitted.length - 1]
    expect(payload.cards[0].id).toBe('hero')
    expect(payload.cards[0].x).toBe(1)
    expect(payload.cards[0].w).toBe(5)
  })

  test('with layout-updated event expect persisted cards do not contain i field', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }, { id: 'today', x: 0, y: 3, w: 2, h: 2 }] } },
      (s) => emitted.push(s)
    )
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()

    // Act
    const grid = wrapper.findComponent({ name: 'GridLayout' })
    await grid.vm.$emit('layout-updated', [
      { i: 'hero',  x: 0, y: 0, w: 6, h: 3 },
      { i: 'today', x: 0, y: 3, w: 2, h: 2 },
    ])
    await nextTick()

    // Assert — no i field on any persisted card
    const payload = emitted[emitted.length - 1]
    for (const card of payload.cards) {
      expect(card.i).toBeUndefined()
      expect(card.id).toBeDefined()
    }
  })

  test('with layout-updated event expect update-settings emitted exactly once (no feedback loop)', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { cards: [{ id: 'hero', x: 0, y: 0, w: 6, h: 3 }] } },
      (s) => emitted.push(s)
    )
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    wrapper.vm.quoteData = SAMPLE_QUOTE
    await nextTick()
    const beforeCount = emitted.length

    // Act — simulate one drag-end event
    const grid = wrapper.findComponent({ name: 'GridLayout' })
    await grid.vm.$emit('layout-updated', [{ i: 'hero', x: 1, y: 0, w: 5, h: 3 }])
    await nextTick()
    await nextTick() // allow any potential echo-back to propagate

    // Assert — exactly one emission per drag event
    expect(emitted.length - beforeCount).toBe(1)
  })
})

// ── EQV4CardPicker ────────────────────────────────────────────────────────────

describe('EQV4CardPicker', () => {
  const absentCards = [{ id: 'today', label: 'Today' }, { id: 'volume', label: 'Volume' }]

  test('with add-card button click expect dropdown opens', async () => {
    // Arrange
    const wrapper = mount(EQV4CardPicker, { props: { absentCards } })

    // Act / Assert — dropdown hidden initially
    expect(wrapper.find('.eqv4-picker-dropdown').exists()).toBe(false)

    // Act
    await wrapper.find('.eqv4-picker-btn').trigger('click')

    // Assert
    expect(wrapper.find('.eqv4-picker-dropdown').exists()).toBe(true)
  })

  test('with card item click expect add-card emitted and dropdown closes', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4CardPicker, {
      props: { absentCards },
      attrs: { 'onAdd-card': (id) => calls.push(id) },
    })

    // Act
    await wrapper.find('.eqv4-picker-btn').trigger('click')
    await wrapper.find('.eqv4-picker-item').trigger('click')

    // Assert
    expect(calls).toEqual(['today'])
    expect(wrapper.find('.eqv4-picker-dropdown').exists()).toBe(false)
  })

  test('with absent cards list expect all absent card labels rendered in dropdown', async () => {
    // Arrange
    const wrapper = mount(EQV4CardPicker, { props: { absentCards } })

    // Act
    await wrapper.find('.eqv4-picker-btn').trigger('click')

    // Assert
    const items = wrapper.findAll('.eqv4-picker-item')
    expect(items.length).toBe(2)
    expect(items[0].text()).toBe('Today')
    expect(items[1].text()).toBe('Volume')
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
    expect(vm.heroMode).toBeDefined()
    expect(typeof vm.addCard).toBe('function')
    expect(typeof vm.removeCard).toBe('function')
    expect(typeof vm.toggleCardChips).toBe('function')
    expect(typeof vm.toggleHeroMode).toBe('function')
    expect(vm.activeCardIds).toBeDefined()
  })
})

// ── heroMode ──────────────────────────────────────────────────────────────

describe('heroMode', () => {
  test('with no settings.heroMode expect default wide mode', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: {} })

    // Assert
    expect(wrapper.vm.heroMode).toBe('wide')
  })

  test('with toggleHeroMode called expect update-settings emitted with narrow', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget({ settings: {} }, (s) => emitted.push(s))

    // Act
    wrapper.vm.toggleHeroMode()
    await nextTick()

    // Assert
    const last = emitted[emitted.length - 1]
    expect(last.heroMode).toBe('narrow')
  })

  test('with toggleHeroMode called twice expect heroMode returns to wide', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget({ settings: { heroMode: 'narrow' } }, (s) => emitted.push(s))

    // Act
    wrapper.vm.toggleHeroMode()
    await nextTick()

    // Assert
    expect(emitted[emitted.length - 1].heroMode).toBe('wide')
  })
})

// ── toggleCardChips ─────────────────────────────────────────────────────────

describe('toggleCardChips', () => {
  test('with toggleCardChips called on non-chip card expect card added to chipCards', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget({ settings: { chipCards: [] } }, (s) => emitted.push(s))

    // Act
    wrapper.vm.toggleCardChips('today')
    await nextTick()

    // Assert
    const last = emitted[emitted.length - 1]
    expect(last.chipCards).toContain('today')
  })

  test('with toggleCardChips called on active chip card expect card removed from chipCards', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget({ settings: { chipCards: ['today'] } }, (s) => emitted.push(s))

    // Act
    wrapper.vm.toggleCardChips('today')
    await nextTick()

    // Assert
    const last = emitted[emitted.length - 1]
    expect(last.chipCards).not.toContain('today')
  })
})

// ── New card registry entries (tests 11-13) ───────────────────────────────────

describe('New card registry entries', () => {
  test('test_EnhancedQuoteV4_with_registry_expect_stock_splits_sec_edgar_ticker_events_present', () => {
    // Arrange / Act
    const wrapper = mountWidget()

    // Assert — CARD_REGISTRY is not directly exposed, but absentCards + activeCardIds
    // confirm all registry entries. addCard is the best proxy: unknown ids are ignored.
    // We verify indirectly via addCard accepting known new IDs.
    // More directly: confirm the cards can be added (they're in the registry).
    const emitted = []
    const wrapper2 = mountWidget(
      { settings: { cards: [] } },
      (s) => emitted.push(s)
    )
    wrapper2.vm.addCard('stock-splits')
    wrapper2.vm.addCard('sec-edgar')
    wrapper2.vm.addCard('ticker-events')

    const ids = emitted.flatMap(s => s.cards?.map(c => c.id) ?? [])
    expect(ids).toContain('stock-splits')
    expect(ids).toContain('sec-edgar')
    expect(ids).toContain('ticker-events')
  })

  test('test_EnhancedQuoteV4_with_sec_edgar_card_expect_filingCount_from_settings_secEdgarFilingCount', () => {
    // Arrange
    const wrapper = mountWidget({
      settings: {
        secEdgarFilingCount: 25,
        cards: [{ id: 'sec-edgar', x: 0, y: 0, w: 6, h: 4 }],
      },
    })

    // Assert — secEdgarFilingCount computed reflects settings value
    expect(wrapper.vm.secEdgarFilingCount).toBe(25)
  })

  test('test_EnhancedQuoteV4_with_update_filing_count_from_sec_edgar_expect_settings_updated', async () => {
    // Arrange
    const emitted = []
    const wrapper = mountWidget(
      { settings: { secEdgarFilingCount: 10, cards: [{ id: 'sec-edgar', x: 0, y: 0, w: 6, h: 4 }] } },
      (s) => emitted.push(s)
    )

    // Act — find the rendered EQV4SecEdgarCard and emit update-filing-count
    const secEdgarCard = wrapper.findComponent({ name: 'EQV4SecEdgarCard' })
    expect(secEdgarCard.exists()).toBe(true)
    await secEdgarCard.vm.$emit('update-filing-count', 50)
    await nextTick()

    // Assert — update-settings emitted with secEdgarFilingCount updated
    const last = emitted[emitted.length - 1]
    expect(last.secEdgarFilingCount).toBe(50)
  })
})

// ── Header suppression for new cards (test 14) ────────────────────────────────

describe('Header suppression', () => {
  test('test_EnhancedQuoteV4_with_new_active_cards_expect_generic_header_suppressed', () => {
    // Arrange — layout contains all three new cards
    const wrapper = mountWidget({
      settings: {
        cards: [
          { id: 'stock-splits',  x: 0, y: 0, w: 4, h: 3 },
          { id: 'sec-edgar',     x: 4, y: 0, w: 6, h: 4 },
          { id: 'ticker-events', x: 0, y: 3, w: 4, h: 3 },
        ],
      },
    })

    // Assert — no generic .eqv4-card-header rendered for any of the three new card IDs.
    // The generic header is rendered inside a GridItem with data-i matching the card id.
    for (const id of ['stock-splits', 'sec-edgar', 'ticker-events']) {
      const gridItem = wrapper.find(`[data-i="${id}"]`)
      expect(gridItem.exists()).toBe(true)
      // The generic card header should NOT appear inside this grid item.
      expect(gridItem.find('.eqv4-card-header').exists()).toBe(false)
    }
  })
})

// ── secEdgarFilingCount exposed (test 15) ─────────────────────────────────────

describe('secEdgarFilingCount exposed', () => {
  test('test_EnhancedQuoteV4_with_widget_mounted_expect_secEdgarFilingCount_exposed', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: { secEdgarFilingCount: 50 } })

    // Assert
    expect(wrapper.vm.secEdgarFilingCount).toBeDefined()
    expect(wrapper.vm.secEdgarFilingCount).toBe(50)
  })
})

// ── EQV4HeroCard ───────────────────────────────────────────────────────────

import EQV4HeroCard from '../EQV4HeroCard.vue'

const HERO_QUOTE = {
  symbol: 'AAPL',
  close: 189.5,
  change: 2.3,
  pct_change: 1.23,
  change_since_open: 1.1,
  pct_change_since_open: 0.58,
  end_timestamp: new Date('2026-04-15T16:00:00Z').getTime(),
}
const HERO_COMPANY = { name: 'Apple Inc.', sic_description: 'Electronic Computers' }

describe('EQV4HeroCard', () => {
  test('with heroMode wide expect symbol, price, and identity blocks rendered', () => {
    // Arrange / Act
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: HERO_QUOTE, companyData: HERO_COMPANY, heroMode: 'wide', isLocked: true },
    })

    // Assert — all three blocks present in wide mode
    expect(wrapper.find('.eqv4-hero-symbol-block').exists()).toBe(true)
    expect(wrapper.find('.eqv4-hero-price-block').exists()).toBe(true)
    expect(wrapper.find('.eqv4-hero-identity-block').exists()).toBe(true)
    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).toContain('Apple Inc.')
    expect(wrapper.text()).toContain('189.50')
  })

  test('with heroMode narrow expect narrow class applied and all three blocks present', () => {
    // Arrange / Act
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: HERO_QUOTE, companyData: HERO_COMPANY, heroMode: 'narrow', isLocked: true },
    })

    // Assert — narrow class on root; all three blocks present (same data, column layout)
    expect(wrapper.find('.eqv4-hero--narrow').exists()).toBe(true)
    expect(wrapper.find('.eqv4-hero-symbol-block').exists()).toBe(true)
    expect(wrapper.find('.eqv4-hero-price-block').exists()).toBe(true)
    expect(wrapper.find('.eqv4-hero-identity-block').exists()).toBe(true)
    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).toContain('189.50')
    expect(wrapper.text()).toContain('Apple Inc.')
  })

  test('with null quoteData expect no crash', () => {
    // Arrange / Act — grid renders cards with null quoteData before ticker set
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: null, heroMode: 'wide', isLocked: true },
    })

    // Assert
    expect(wrapper.text()).toContain('—')
  })
})
