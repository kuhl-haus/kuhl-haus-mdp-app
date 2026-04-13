import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Stub ResizeObserver — jsdom does not implement it.
// layoutMode defaults to 'narrow' (initial ref value) and tests can
// set wrapper.vm.layoutMode directly to test wide/full layout paths.
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock WebSocket globally
class MockWebSocket {
  constructor() {
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.()
    }, 0)
  }
  send() {}
  close() { this.onclose?.({ code: 1000 }) }
}
global.WebSocket = MockWebSocket
global.WebSocket.CONNECTING = 0
global.WebSocket.OPEN = 1
global.WebSocket.CLOSING = 2
global.WebSocket.CLOSED = 3

// Mock asset imports (flame icons)
vi.mock('@/assets/icons/flame-red.svg',    { assert: { type: 'url' } }, () => ({ default: 'flame-red.svg' }))
vi.mock('@/assets/icons/flame-orange.svg', { assert: { type: 'url' } }, () => ({ default: 'flame-orange.svg' }))
vi.mock('@/assets/icons/flame-yellow.svg', { assert: { type: 'url' } }, () => ({ default: 'flame-yellow.svg' }))
vi.mock('@/assets/icons/flame-white.svg',  { assert: { type: 'url' } }, () => ({ default: 'flame-white.svg' }))
vi.mock('@/assets/icons/flame-blue.svg',   { assert: { type: 'url' } }, () => ({ default: 'flame-blue.svg' }))
vi.mock('@/assets/icons/flame-dark.svg',   { assert: { type: 'url' } }, () => ({ default: 'flame-dark.svg' }))

// Stub new URL(...).href for asset imports in the component
vi.stubGlobal('URL', class {
  constructor(path) { this.href = path }
  static createObjectURL() { return '' }
})

// Mock vuedraggable — renders slot content without actual drag functionality
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: ['modelValue', 'disabled', 'group', 'itemKey', 'handle'],
    emits: ['update:modelValue', 'start', 'end'],
    template: '<div><slot v-for="element in modelValue" :key="element.id" name="item" :element="element" /></div>',
  }
}))

import EnhancedQuoteV2 from '../EnhancedQuoteV2.vue'

function mountWidget(props = {}) {
  return mount(EnhancedQuoteV2, {
    props: {
      isLocked: true,
      linkColor: null,
      isMobile: false,
      settings: {},
      ...props,
    },
  })
}

const SAMPLE_QUOTE = {
  symbol: 'TSLA',
  close: 250.00,
  change: 5.00,
  pct_change: 2.04,
  pct_change_since_open: 1.5,
  change_since_open: 3.75,
  end_timestamp: Date.now(),
  pre_market_high: 252.00,
  pre_market_low: 248.00,
  regular_session_high: 255.00,
  regular_session_low: 247.00,
  after_hours_high: 251.00,
  after_hours_low: 249.00,
  official_open_price: 248.00,
  aggregate_vwap: 250.50,
  accumulated_volume: 25000000,
  relative_volume: 2.5,
  avg_volume: 20000000,
  free_float: 800000000,
  prev_day_open: 245.00,
  prev_day_high: 253.00,
  prev_day_low: 244.00,
  prev_day_close: 245.00,
  prev_day_volume: 22000000,
  prev_day_vwap: 248.00,
  splits: [],
}

describe('EnhancedQuoteV2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'TSLA', data: {}, available: false }),
    })
  })

  it('renders without crashing', () => {
    const wrapper = mountWidget()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.eqv2-widget').exists()).toBe(true)
  })

  it('shows empty state when no ticker is set', () => {
    const wrapper = mountWidget()
    expect(wrapper.find('.eqv2-empty').exists()).toBe(true)
    expect(wrapper.find('.eqv2-body').exists()).toBe(false)
  })

  it('shows waiting state when ticker is set but no data', async () => {
    const wrapper = mountWidget()
    await wrapper.find('.eqv2-input').setValue('AAPL')
    await wrapper.find('.eqv2-go-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const empty = wrapper.find('.eqv2-empty')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('AAPL')
  })

  it('renders quote body when data is present', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-body').exists()).toBe(true)
    expect(wrapper.find('.eqv2-empty').exists()).toBe(false)
  })

  it('displays price and symbol correctly', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-symbol').text()).toBe('TSLA')
    expect(wrapper.find('.eqv2-price').text()).toContain('250.00')
  })

  it('applies positive class to change badge for gains', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, change: 5.00, pct_change: 2.04 }
    await wrapper.vm.$nextTick()
    const badge = wrapper.find('.eqv2-change-badge')
    expect(badge.classes()).toContain('positive')
    expect(badge.text()).toContain('+5.00')
  })

  it('applies negative class to change badge for losses', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, change: -3.50, pct_change: -1.38 }
    await wrapper.vm.$nextTick()
    const badge = wrapper.find('.eqv2-change-badge')
    expect(badge.classes()).toContain('negative')
    expect(badge.text()).toContain('-3.50')
  })

  it('renders section cards', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-company-card').exists()).toBe(true)
    expect(wrapper.find('.eqv2-today-card').exists()).toBe(true)
    expect(wrapper.find('.eqv2-session-card').exists()).toBe(true)
    expect(wrapper.find('.eqv2-volume-card').exists()).toBe(true)
    expect(wrapper.find('.eqv2-prev-card').exists()).toBe(true)
  })

  it('shows company unavailable state when all fields null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    })
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-muted-msg').exists()).toBe(true)
  })

  it('shows company data when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          name: 'Tesla Inc.',
          primary_exchange: 'XNAS',
          sic_description: 'Motor Vehicles',
          market_cap: 800000000000,
          total_employees: 140000,
          list_date: '2010-06-29',
          homepage_url: 'https://tesla.com',
        },
      }),
    })
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    // Company name + sic_description now rendered in the hero card
    expect(wrapper.find('.eqv2-hero').text()).toContain('Tesla Inc.')
    expect(wrapper.find('.eqv2-hero').text()).toContain('Motor Vehicles')
    // Company card shows exchange and website
    expect(wrapper.find('.eqv2-company-card').text()).toContain('XNAS')
  })

  it('renders relative volume bar', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, relative_volume: 2.5 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-rv-bar-wrap').exists()).toBe(true)
    expect(wrapper.find('.eqv2-rv-bar').exists()).toBe(true)
    // 2.5 / 5 = 50%
    expect(wrapper.find('.eqv2-rv-bar').attributes('style')).toContain('50%')
  })

  it('caps relative volume bar at 100%', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, relative_volume: 10 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-rv-bar').attributes('style')).toContain('100%')
  })

  it('renders Previous Day chips', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    const chips = wrapper.findAll('.eqv2-chip')
    expect(chips.length).toBe(6)
    const labels = chips.map(c => c.find('.eqv2-chip-label').text())
    expect(labels).toContain('O')
    expect(labels).toContain('H')
    expect(labels).toContain('L')
    expect(labels).toContain('C')
    expect(labels).toContain('Vol')
    expect(labels).toContain('VWAP')
  })

  it('hides splits card when splits array is empty', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, splits: [] }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-splits-card').exists()).toBe(false)
  })

  it('shows splits card when splits array has entries', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      ...SAMPLE_QUOTE,
      splits: [{ split_to: 3, split_from: 1, execution_date: '2022-08-25' }],
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv2-splits-card').exists()).toBe(true)
    expect(wrapper.find('.eqv2-split-row').text()).toContain('3-for-1')
  })

  it('shows session H/L dashes when values are null', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      ...SAMPLE_QUOTE,
      pre_market_high: null,
      pre_market_low: null,
      after_hours_high: null,
      after_hours_low: null,
    }
    await wrapper.vm.$nextTick()
    const sessionChips = wrapper.findAll('.eqv2-session-chip')
    expect(sessionChips[0].text()).toContain('—') // PRE
    expect(sessionChips[2].text()).toContain('—') // AH
  })

  it('exposes required interface (lastDataAt, isConnected, etc.)', () => {
    const wrapper = mountWidget()
    expect(wrapper.vm.lastDataAt).toBeDefined()
    expect(wrapper.vm.isConnected).toBeDefined()
    expect(wrapper.vm.reconnecting).toBeDefined()
    expect(wrapper.vm.quoteData).toBeDefined()
    expect(wrapper.vm.manualTicker).toBeDefined()
    expect(wrapper.vm.companyData).toBeDefined()
    expect(wrapper.vm.companyLoading).toBeDefined()
    expect(wrapper.vm.activeCards).toBeDefined()
    expect(wrapper.vm.isDragging).toBeDefined()
  })

  describe('fmtVol helper (via rendered output)', () => {
    it('formats billions correctly', async () => {
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, accumulated_volume: 1500000000 }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.eqv2-volume-card').text()).toContain('1.5B')
    })

    it('formats millions correctly', async () => {
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, accumulated_volume: 25000000 }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.eqv2-volume-card').text()).toContain('25.0M')
    })

    it('formats thousands correctly', async () => {
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, accumulated_volume: 5500 }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.eqv2-volume-card').text()).toContain('5.5K')
    })
  })
  describe('Short Interest section', () => {
    const SI_RESPONSE = { data: { short_interest: 12000000, days_to_cover: 2.5, avg_daily_volume: 5000000, settlement_date: '2026-03-28' } }
    const SV_RESPONSE = { data: { short_volume: 8000000, total_volume: 20000000, short_volume_ratio: 40.0, date: '2026-04-11' } }

    function mockFetchForSI() {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('short_interest')) return Promise.resolve({ ok: true, json: async () => SI_RESPONSE })
        if (url.includes('short_volume')) return Promise.resolve({ ok: true, json: async () => SV_RESPONSE })
        // company endpoint
        return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
      })
    }

    it('fetches short interest and short volume in parallel on ticker change', async () => {
      // Arrange
      mockFetchForSI()
      const wrapper = mountWidget()

      // Act
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: both endpoints called
      const urls = global.fetch.mock.calls.map(c => c[0])
      expect(urls.some(u => u.includes('short_interest/TSLA'))).toBe(true)
      expect(urls.some(u => u.includes('short_volume/TSLA'))).toBe(true)
    })

    it('displays short interest values from REST response', async () => {
      // Arrange
      mockFetchForSI()
      const wrapper = mountWidget()

      // Act
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: short card shows merged data from both endpoints
      const shortCard = wrapper.find('.eqv2-short-card')
      expect(shortCard.exists()).toBe(true)
      expect(shortCard.text()).toContain('12.0M')  // short_interest formatted
      expect(shortCard.text()).toContain('2.5')     // days_to_cover
      expect(shortCard.text()).toContain('40.0')    // short_volume_ratio
    })

    it('shows unavailable message when endpoints return null data', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
      const wrapper = mountWidget()

      // Act
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert
      const shortCard = wrapper.find('.eqv2-short-card')
      expect(shortCard.text()).toContain('unavailable')
    })

    it('resets short interest data when ticker changes', async () => {
      // Arrange: load TSLA with real SI data
      mockFetchForSI()
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Act: change ticker — new fetch returns null data
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
      wrapper.vm.manualTicker = 'AAPL'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, symbol: 'AAPL' }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: previous ticker's short interest values are gone from the DOM
      const shortCard = wrapper.find('.eqv2-short-card')
      expect(shortCard.text()).not.toContain('12.0M')
      expect(shortCard.text()).toContain('unavailable')
    })

    it('handles fetch network error gracefully — shows unavailable, does not throw', async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      const wrapper = mountWidget()

      // Act
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: no crash, unavailable shown
      expect(wrapper.find('.eqv2-short-card').exists()).toBe(true)
      expect(wrapper.find('.eqv2-short-card').text()).toContain('unavailable')
      expect(wrapper.vm.shortInterestLoading).toBe(false)
    })
  })

  describe('Hero company identity', () => {
    function mockCompanyFetch(data) {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('short_interest') || url.includes('short_volume'))
          return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
        return Promise.resolve({ ok: true, json: async () => ({ data }) })
      })
    }

    it('shows company name and sic_description in hero when available', async () => {
      // Arrange
      mockCompanyFetch({ name: 'Tesla Inc.', sic_description: 'Motor Vehicles', logo_url: null })
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert
      const hero = wrapper.find('.eqv2-hero')
      expect(hero.text()).toContain('Tesla Inc.')
      expect(hero.text()).toContain('Motor Vehicles')
    })

  })

  describe('Description see-more toggle', () => {
    const SHORT_DESC = 'Short desc.'
    // LONG_DESC must exceed 175 chars (current truncateDesc maxLen) to trigger truncation
    const LONG_DESC = 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services. The Company\'s products include iPhone, Mac, iPad, and accessories. Services include advertising, AppleCare, cloud services, digital content, and payment services. Apple sells and delivers third-party applications and digital content. The Company sells its products and resells third-party products.'

    function mountWithDescription(description) {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('short_interest') || url.includes('short_volume'))
          return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
        return Promise.resolve({ ok: true, json: async () => ({ data: { name: 'ACME', description } }) })
      })
      const wrapper = mountWidget()
      return wrapper
    }

    it('shows full text without toggle when description is short', async () => {
      // Arrange
      const wrapper = mountWithDescription(SHORT_DESC)
      wrapper.vm.manualTicker = 'ACME'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: no see-more button, full text shown
      expect(wrapper.find('.eqv2-see-more').exists()).toBe(false)
      expect(wrapper.find('.eqv2-company-desc-text').text()).toContain(SHORT_DESC)
    })

    it('truncates long description and shows see-more button', async () => {
      // Arrange
      const wrapper = mountWithDescription(LONG_DESC)
      wrapper.vm.manualTicker = 'ACME'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert
      const descText = wrapper.find('.eqv2-company-desc-text')
      expect(descText.text().length).toBeLessThan(LONG_DESC.length)
      expect(wrapper.find('.eqv2-see-more').exists()).toBe(true)
      expect(wrapper.find('.eqv2-see-more').text()).toContain('see more')
    })

    it('expands to full description when see-more is clicked', async () => {
      // Arrange
      const wrapper = mountWithDescription(LONG_DESC)
      wrapper.vm.manualTicker = 'ACME'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Act
      await wrapper.find('.eqv2-see-more').trigger('click')
      await wrapper.vm.$nextTick()

      // Assert: full text visible, button changes to 'less'
      expect(wrapper.find('.eqv2-company-desc-text').text()).toContain(LONG_DESC)
      expect(wrapper.find('.eqv2-see-more').text()).toContain('less')
    })

    it('collapses back when less is clicked', async () => {
      // Arrange
      const wrapper = mountWithDescription(LONG_DESC)
      wrapper.vm.manualTicker = 'ACME'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()
      await wrapper.find('.eqv2-see-more').trigger('click')
      await wrapper.vm.$nextTick()

      // Act
      await wrapper.find('.eqv2-see-more').trigger('click')
      await wrapper.vm.$nextTick()

      // Assert: truncated again, see-more button back
      expect(wrapper.find('.eqv2-company-desc-text').text().length).toBeLessThan(LONG_DESC.length)
      expect(wrapper.find('.eqv2-see-more').text()).toContain('see more')
    })

    it('resets description to collapsed when ticker changes', async () => {
      // Arrange: load ACME with long desc, expand
      const wrapper = mountWithDescription(LONG_DESC)
      wrapper.vm.manualTicker = 'ACME'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()
      await wrapper.find('.eqv2-see-more').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.eqv2-company-desc-text').text()).toContain(LONG_DESC)

      // Act: change ticker
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
      wrapper.vm.manualTicker = 'OTHER'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: expanded state cleared — no see-more button since new company has no desc
      expect(wrapper.find('.eqv2-company-desc-wrap').exists()).toBe(false)
    })
  })

  describe('Since open', () => {
    async function mountWithQuote(quoteOverrides) {
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, ...quoteOverrides }
      await wrapper.vm.$nextTick()
      return wrapper
    }

    it('renders "since open" label (not "Open:")', async () => {
      // Arrange / Act
      const wrapper = await mountWithQuote({})

      // Assert
      expect(wrapper.find('.eqv2-since-open').text()).toContain('since open')
      expect(wrapper.find('.eqv2-since-open').text()).not.toContain('Open:')
    })

    it('renders dollar delta from change_since_open when present', async () => {
      // Arrange / Act
      const wrapper = await mountWithQuote({ pct_change_since_open: 1.5, change_since_open: 3.75 })

      // Assert: dollar amount shown in parens with sign and $
      const text = wrapper.find('.eqv2-since-open').text()
      expect(text).toContain('$3.75')
      expect(text).toContain('+')
    })

    it('renders negative dollar delta correctly', async () => {
      // Arrange / Act
      const wrapper = await mountWithQuote({ pct_change_since_open: -1.5, change_since_open: -3.75 })

      // Assert
      const text = wrapper.find('.eqv2-since-open').text()
      expect(text).toContain('$3.75')  // absolute value displayed
      expect(text).toContain('-')
    })

    it('omits dollar delta when change_since_open is null', async () => {
      // Arrange / Act
      const wrapper = await mountWithQuote({ pct_change_since_open: 1.5, change_since_open: null })

      // Assert: pct shown, no dollar amount
      const text = wrapper.find('.eqv2-since-open').text()
      expect(text).toContain('1.50%')
      expect(text).not.toContain('$')
    })
  })

  describe('Session H/L chip style', () => {
    async function mountWithSessionData(sessionOverrides) {
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE, ...sessionOverrides }
      await wrapper.vm.$nextTick()
      return wrapper
    }

    it('renders PRE, REG, AH chips in session card', async () => {
      // Arrange / Act
      const wrapper = await mountWithSessionData({})

      // Assert
      const chips = wrapper.findAll('.eqv2-session-chip')
      expect(chips.length).toBe(3)
      const labels = chips.map(c => c.find('.eqv2-chip-label').text())
      expect(labels).toContain('PRE')
      expect(labels).toContain('REG')
      expect(labels).toContain('AH')
    })

    it('renders H and L values inside each session chip', async () => {
      // Arrange / Act
      const wrapper = await mountWithSessionData({})

      // Assert: PRE chip (index 0) shows H and L values from SAMPLE_QUOTE
      const preChip = wrapper.findAll('.eqv2-session-chip')[0]
      expect(preChip.text()).toContain('252.00')  // pre_market_high
      expect(preChip.text()).toContain('248.00')  // pre_market_low
    })

    it('shows dash in session chip when values are null', async () => {
      // Arrange / Act
      const wrapper = await mountWithSessionData({
        pre_market_high: null,
        pre_market_low: null,
      })

      // Assert: PRE chip shows dash
      expect(wrapper.findAll('.eqv2-session-chip')[0].text()).toContain('—')
    })

    it('session card uses .eqv2-session-chip markup (chip style, not mini-row)', async () => {
      // Arrange / Act
      const wrapper = await mountWithSessionData({})

      // Assert: chip class present, old mini class absent
      expect(wrapper.find('.eqv2-session-chip').exists()).toBe(true)
      expect(wrapper.find('.eqv2-session-mini').exists()).toBe(false)
    })
  })

  describe('Layout mode — isNarrow / ResizeObserver integration', () => {
    it('defaults to narrow layout mode (single column)', async () => {
      // Arrange / Act
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert: col-2 not rendered in narrow mode
      expect(wrapper.vm.layoutMode).toBe('narrow')
      expect(wrapper.find('.eqv2-col-2').exists()).toBe(false)
    })

    it('renders col-2 with company card when layoutMode is wide', async () => {
      // Arrange
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Act: simulate ResizeObserver firing at wide width (480-679px)
      // At wide: col1=first half, col2=second half (includes company)
      wrapper.vm.layoutMode = 'wide'
      await wrapper.vm.$nextTick()

      // Assert: col-2 rendered, company card in col-2, no col-3
      expect(wrapper.find('.eqv2-col-2').exists()).toBe(true)
      expect(wrapper.find('.eqv2-col-3').exists()).toBe(false)
      expect(wrapper.findAll('.eqv2-company-card').length).toBe(1)
      expect(wrapper.findAll('.eqv2-short-card').length).toBe(1)
    })

    it('renders full-row horizontal layout at full layout mode (>=960px)', async () => {
      // Arrange
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Act: simulate ResizeObserver firing at full width
      wrapper.vm.layoutMode = 'full'
      await wrapper.vm.$nextTick()

      // Assert: full-row draggable rendered (single horizontal row of all cards)
      expect(wrapper.find('.eqv2-full-row-draggable').exists()).toBe(true)
      // col-3 no longer exists at full mode (replaced by flat row)
      expect(wrapper.find('.eqv2-col-3').exists()).toBe(false)
      // col3Cards is always empty (kept for API compat)
      expect(wrapper.vm.col3Cards).toEqual([])
      // fullRowCards includes all 6 registry cards
      expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('company')
      expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('prev')
      expect(wrapper.vm.fullRowCards.length).toBe(6)
    })

    it('col3Cards is empty when layoutMode is not full', async () => {
      // Arrange / Act
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert: narrow
      expect(wrapper.vm.col3Cards).toEqual([])

      // Act: wide
      wrapper.vm.layoutMode = 'wide'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.col3Cards).toEqual([])
    })

    it('exactly one company card in DOM at narrow layout mode', async () => {
      // Arrange / Act
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert: only the narrow-mode instance present
      expect(wrapper.findAll('.eqv2-company-card').length).toBe(1)
    })
  })

  describe('Hero identity layout', () => {
    it('symbol, price, and company info render in hero blocks', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { name: 'Apple Inc.', sic_description: 'Electronic Computers' } }) })
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'AAPL'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await new Promise(r => setTimeout(r, 0))
      await wrapper.vm.$nextTick()

      // Assert: symbol in symbol-block, company info in identity-block
      expect(wrapper.find('.eqv2-hero-symbol-block').exists()).toBe(true)
      expect(wrapper.find('.eqv2-hero-symbol-block .eqv2-symbol').exists()).toBe(true)
      expect(wrapper.find('.eqv2-hero-price-block').exists()).toBe(true)
      expect(wrapper.find('.eqv2-hero-identity-block').exists()).toBe(true)
      expect(wrapper.find('.eqv2-hero-identity-block .eqv2-hero-company-name').text()).toBe('Apple Inc.')
      expect(wrapper.find('.eqv2-hero-identity-block .eqv2-hero-sic').text()).toBe('Electronic Computers')
    })
  })

  describe('Previous Day card always rendered', () => {
    it('Previous Day card is always present regardless of other data', async () => {
      // Arrange / Act
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.find('.eqv2-prev-card').exists()).toBe(true)
      expect(wrapper.find('.eqv2-prev-row').exists()).toBe(true)
    })
  })

  describe('Vue Draggable — card order and settings', () => {
    // CARD_REGISTRY default order: today, prev, volume, session, short, company
    const REGISTRY_IDS = ['today', 'prev', 'volume', 'session', 'short', 'company']

    it('activeCards falls back to CARD_REGISTRY default order when settings.cardOrder is undefined', () => {
      // Arrange / Act
      const wrapper = mountWidget({ settings: {} })

      // Assert
      expect(wrapper.vm.activeCards.map(c => c.id)).toEqual(REGISTRY_IDS)
    })

    it('activeCards respects settings.cardOrder when provided', () => {
      // Arrange: full 6-card custom order
      const customOrder = ['volume', 'session', 'company', 'short', 'today', 'prev']
      const wrapper = mountWidget({ settings: { cardOrder: customOrder } })

      // Assert
      expect(wrapper.vm.activeCards.map(c => c.id)).toEqual(customOrder)
    })

    it('activeCards appends unknown-in-order cards to end', () => {
      // Arrange: only 2 of 6 in saved order
      const wrapper = mountWidget({ settings: { cardOrder: ['volume', 'today'] } })

      // Assert: saved order first, missing cards appended
      const ids = wrapper.vm.activeCards.map(c => c.id)
      expect(ids[0]).toBe('volume')
      expect(ids[1]).toBe('today')
      expect(ids.length).toBe(6)
    })

    it('drag handles not visible when isLocked=true', async () => {
      // Arrange
      const wrapper = mountWidget({ isLocked: true })
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert: .eqv2-drag-handle not in DOM when locked
      expect(wrapper.find('.eqv2-drag-handle').exists()).toBe(false)
    })

    it('drag handles visible when isLocked=false', async () => {
      // Arrange
      const wrapper = mountWidget({ isLocked: false })
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert: drag handles present
      expect(wrapper.find('.eqv2-drag-handle').exists()).toBe(true)
    })

    it('Previous Day card is rendered as pinned row at narrow/wide, in draggable row at full', async () => {
      // Arrange: narrow mode (default)
      const wrapper = mountWidget()
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Assert at narrow: prev-row exists as pinned element
      expect(wrapper.find('.eqv2-prev-row').exists()).toBe(true)
      expect(wrapper.find('.eqv2-prev-card').exists()).toBe(true)
      // prev IS in activeCards (it drives both the pinned row and the full-mode card)
      expect(wrapper.vm.activeCards.map(c => c.id)).toContain('prev')

      // At full mode: fullRowCards includes prev (it becomes a draggable card)
      wrapper.vm.layoutMode = 'full'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('prev')
    })

    it('onDragEnd emits update-settings payload with correct cardOrder', async () => {
      // Arrange
      const updateSettingsCalls = []
      const wrapper = mount(EnhancedQuoteV2, {
        props: { isLocked: false, settings: {} },
        attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
      })
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      await wrapper.vm.$nextTick()

      // Act: simulate col1 reorder then drag end (narrow mode — all cards in col1 except prev)
      // At narrow, col1Cards excludes 'prev'; onDragEnd appends 'prev' at end
      const reordered = ['today', 'session', 'volume', 'short', 'company']
      wrapper.vm.onColReorder(
        reordered.map(id => ({ id, label: id })),
        1
      )
      await wrapper.vm.onDragEnd()  // async — awaits nextTick internally
      await wrapper.vm.$nextTick()

      // Assert: saved order is reordered cards + 'prev' appended at end
      expect(updateSettingsCalls.length).toBe(1)
      expect(updateSettingsCalls[0].cardOrder).toEqual([...reordered, 'prev'])
    })

    it('onDragEnd with cross-column reorder emits all 5 cards in merged order', async () => {
      // Arrange: wide mode so col1 and col2 both exist
      const updateSettingsCalls = []
      const wrapper = mount(EnhancedQuoteV2, {
        props: { isLocked: false, settings: {} },
        attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
      })
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      wrapper.vm.layoutMode = 'wide'  // col1: [session,today,volume], col2: [short,company]
      await wrapper.vm.$nextTick()

      // Act: reproduce the real race condition.
      // vuedraggable wraps each update:modelValue in nextTick(), so a cross-column drag
      // delivers the source column override on tick 1 and the destination on tick 2.
      // Simulate this: col1 override arrives synchronously, col2 arrives one tick later
      // (after onDragEnd has already started and consumed the first nextTick).
      const newCol1 = ['session', 'today', 'volume', 'short'].map(id => ({ id, label: id }))
      const newCol2 = ['company'].map(id => ({ id, label: id }))

      wrapper.vm.onColReorder(newCol1, 1)  // col1 override set immediately
      // Start onDragEnd — it will await its first nextTick before we set col2
      const dragEndPromise = wrapper.vm.onDragEnd()
      // After the first tick (which onDragEnd just consumed), deliver col2
      await wrapper.vm.$nextTick()
      wrapper.vm.onColReorder(newCol2, 2)  // col2 arrives on second tick
      await dragEndPromise
      await wrapper.vm.$nextTick()

      // Assert: 5 non-prev cards in correct merged order, 'prev' appended at end
      expect(updateSettingsCalls.length).toBe(1)
      expect(updateSettingsCalls[0].cardOrder).toEqual(
        ['session', 'today', 'volume', 'short', 'company', 'prev']
      )
    })

    it('onFullRowReorder emits update-settings with reordered full-row cardOrder including prev', async () => {
      // Arrange
      // vuedraggable fires @update:model-value (onFullRowReorder) AFTER @end,
      // so the emit is driven directly from the updated list rather than reading
      // a stale _fullRow ref set in @end.
      const updateSettingsCalls = []
      const wrapper = mount(EnhancedQuoteV2, {
        props: { isLocked: false, settings: {} },
        attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
      })
      wrapper.vm.manualTicker = 'TSLA'
      await wrapper.vm.$nextTick()
      wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
      wrapper.vm.layoutMode = 'full'
      await wrapper.vm.$nextTick()

      // Act: simulate vuedraggable @update:model-value — prev moved to first position
      const reordered = ['prev', 'today', 'volume', 'session', 'short', 'company']
      wrapper.vm.onFullRowReorder(reordered.map(id => ({ id, label: id })))

      // Assert: full reordered list saved including prev in its new position
      expect(updateSettingsCalls.length).toBe(1)
      expect(updateSettingsCalls[0].cardOrder).toEqual(reordered)
    })
  })

})
