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

import EnhancedQuote from '../EnhancedQuote.vue'

function mountWidget(props = {}) {
  return mount(EnhancedQuote, {
    props: {
      isLocked: true,
      linkColor: null,
      isMobile: false,
      settings: {},
      ...props,
    },
    global: {
      stubs: {
        // no stubs needed
      },
    },
  })
}

describe('EnhancedQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const wrapper = mountWidget()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.eq-widget').exists()).toBe(true)
  })

  it('shows empty state when no ticker is set', () => {
    const wrapper = mountWidget()
    expect(wrapper.find('.eq-empty').exists()).toBe(true)
    expect(wrapper.find('.eq-body').exists()).toBe(false)
  })

  it('shows waiting state when ticker is set but no data', async () => {
    const wrapper = mountWidget()
    const input = wrapper.find('.eq-input')
    await input.setValue('AAPL')
    await wrapper.find('.eq-go-btn').trigger('click')
    // Should show waiting state (ticker set, no data yet)
    await wrapper.vm.$nextTick()
    const emptyEl = wrapper.find('.eq-empty')
    expect(emptyEl.exists()).toBe(true)
    expect(emptyEl.text()).toContain('AAPL')
  })

  it('renders session H/L section when data is present', async () => {
    const wrapper = mountWidget()
    // Manually set activeTicker and quoteData via internal state
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    // Inject quote data directly
    wrapper.vm.quoteData = {
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
      relative_volume: 1.5,
      avg_volume: 20000000,
      free_float: 800000000,
      short_interest: 50000000,
      days_to_cover: 2.5,
      short_volume_ratio: 48.5,
      name: 'Tesla Inc',
      primary_exchange: 'NASDAQ',
      sic_description: 'Motor Vehicles',
      market_cap: 800000000000,
      total_employees: 140000,
      list_date: '2010-06-29',
      homepage_url: 'https://tesla.com',
      prev_day_open: 245.00,
      prev_day_high: 253.00,
      prev_day_low: 244.00,
      prev_day_close: 245.00,
      prev_day_volume: 22000000,
      prev_day_vwap: 248.00,
      splits: [],
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eq-body').exists()).toBe(true)
    expect(wrapper.find('.eq-session-hl').exists()).toBe(true)
  })

  it('shows "—" for null session H/L values', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      symbol: 'TSLA',
      close: 250.00,
      change: 5.00,
      pct_change: 2.04,
      pct_change_since_open: 1.5,
      change_since_open: 3.75,
      end_timestamp: Date.now(),
      pre_market_high: null,
      pre_market_low: null,
      regular_session_high: 255.00,
      regular_session_low: 247.00,
      after_hours_high: null,
      after_hours_low: null,
    }
    await wrapper.vm.$nextTick()
    const sessionHl = wrapper.find('.eq-session-hl')
    expect(sessionHl.exists()).toBe(true)
    // Pre-market row should show —
    const rows = sessionHl.findAll('.eq-session-row')
    expect(rows.length).toBe(3)
    expect(rows[0].text()).toContain('—')
    expect(rows[2].text()).toContain('—')
  })

  it('does not render short interest section (temporarily disabled)', async () => {
    // Short interest section is disabled pending refs #85
    const wrapper = mountWidget()
    const shortSection = wrapper.find('.eq-short-loading')
    expect(shortSection.exists()).toBe(false)
  })

  it('hides company section when all company fields are null', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      symbol: 'TSLA',
      close: 250.00,
      change: 5.00,
      pct_change: 2.04,
      pct_change_since_open: 1.5,
      change_since_open: 3.75,
      end_timestamp: Date.now(),
      name: null,
      primary_exchange: null,
      sic_description: null,
      market_cap: null,
      total_employees: null,
      list_date: null,
      homepage_url: null,
    }
    await wrapper.vm.$nextTick()
    const companyLoading = wrapper.find('.eq-company-loading')
    expect(companyLoading.exists()).toBe(true)
    expect(companyLoading.text()).toContain('Company data loading')
  })

  it('hides splits section when splits array is empty', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      symbol: 'TSLA',
      close: 250.00,
      change: 5.00,
      pct_change: 2.04,
      pct_change_since_open: 1.5,
      change_since_open: 3.75,
      end_timestamp: Date.now(),
      splits: [],
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eq-splits').exists()).toBe(false)
  })

  it('shows splits section when splits array has entries', async () => {
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = {
      symbol: 'TSLA',
      close: 250.00,
      change: 5.00,
      pct_change: 2.04,
      pct_change_since_open: 1.5,
      change_since_open: 3.75,
      end_timestamp: Date.now(),
      splits: [{ split_to: 3, split_from: 1, execution_date: '2022-08-25' }],
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eq-splits').exists()).toBe(true)
    expect(wrapper.find('.eq-splits').text()).toContain('3-for-1')
  })
})
