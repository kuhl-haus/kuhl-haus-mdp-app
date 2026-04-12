import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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
    expect(wrapper.find('.eqv2-company-card').text()).toContain('Tesla Inc.')
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
    const sessionMinis = wrapper.findAll('.eqv2-session-mini')
    expect(sessionMinis[0].text()).toContain('—') // PRE
    expect(sessionMinis[2].text()).toContain('—') // AH
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

})
