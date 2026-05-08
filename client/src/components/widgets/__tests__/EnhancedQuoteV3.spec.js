import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Stub ResizeObserver — jsdom does not implement it.
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

// Mock useConfig — provides stable massiveApiKey for tests
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: () => ({
      config: ref({ massiveApiKey: 'test-massive-key', apiKey: 'secret', wsEndpoint: 'ws://localhost:4202/ws' }),
      loading: ref(false),
      error: ref(null),
      fetchConfig: vi.fn(),
      isAuthenticated: () => true,
    })
  }
})

import EnhancedQuoteV3 from '../EnhancedQuoteV3.vue'

function mountWidget(props = {}) {
  return mount(EnhancedQuoteV3, {
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

// Massive API response shapes
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
    branding: {
      logo_url: 'https://api.massive.com/v1/reference/company-branding/tsla/logo.svg',
      icon_url: 'https://api.massive.com/v1/reference/company-branding/tsla/icon.png',
    },
  },
}

const MASSIVE_SI_RESPONSE = {
  results: [{
    ticker: 'TSLA',
    settlement_date: '2025-03-14',
    short_interest: 12000000,
    avg_daily_volume: 5000000,
    days_to_cover: 2.4,
  }],
}

const MASSIVE_SV_RESPONSE = {
  results: [{
    ticker: 'TSLA',
    date: '2025-03-25',
    short_volume: 8000000,
    short_volume_ratio: 38.5,
    total_volume: 20000000,
  }],
}

function mockMassiveFetch({ ticker = MASSIVE_TICKER_RESPONSE, si = MASSIVE_SI_RESPONSE, sv = MASSIVE_SV_RESPONSE } = {}) {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes('/v3/reference/tickers/')) return Promise.resolve({ ok: true, json: async () => ticker })
    if (url.includes('/short-interest')) return Promise.resolve({ ok: true, json: async () => si })
    if (url.includes('/short-volume')) return Promise.resolve({ ok: true, json: async () => sv })
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // Default: all Massive endpoints return empty results
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

describe('Empty and waiting states', () => {
  test('test_EnhancedQuoteV3_with_no_ticker_expect_empty_state_rendered', () => {
    // Arrange / Act
    const wrapper = mountWidget()

    // Assert
    expect(wrapper.find('.eqv3-widget').exists()).toBe(true)
    expect(wrapper.find('.eqv3-empty').exists()).toBe(true)
    expect(wrapper.find('.eqv3-body').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_ticker_but_no_quote_data_expect_waiting_state_shown', async () => {
    // Arrange
    const wrapper = mountWidget()

    // Act
    await wrapper.find('.eqv3-input').setValue('AAPL')
    await wrapper.find('.eqv3-go-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // Assert
    const empty = wrapper.find('.eqv3-empty')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('AAPL')
    expect(wrapper.find('.eqv3-body').exists()).toBe(false)
  })
})

describe('Price hero', () => {
  test('test_EnhancedQuoteV3_with_quote_data_expect_price_hero_rendered', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.eqv3-body').exists()).toBe(true)
    expect(wrapper.find('.eqv3-hero').exists()).toBe(true)
    expect(wrapper.find('.eqv3-symbol').text()).toBe('TSLA')
    expect(wrapper.find('.eqv3-price').text()).toContain('250.00')
  })

  test('test_EnhancedQuoteV3_with_positive_change_expect_positive_badge_class', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, change: 5.00, pct_change: 2.04 }
    await wrapper.vm.$nextTick()

    // Assert
    const badge = wrapper.find('.eqv3-change-badge')
    expect(badge.classes()).toContain('positive')
    expect(badge.text()).toContain('+5.00')
  })

  test('test_EnhancedQuoteV3_with_negative_change_expect_negative_badge_class', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, change: -3.50, pct_change: -1.38 }
    await wrapper.vm.$nextTick()

    // Assert
    const badge = wrapper.find('.eqv3-change-badge')
    expect(badge.classes()).toContain('negative')
    expect(badge.text()).toContain('-3.50')
  })

  test('test_EnhancedQuoteV3_with_quote_data_expect_previous_day_kv_list_rendered_in_col', async () => {
    // Arrange: narrow mode (default) — prev card is now a regular draggable card in col1
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert: prev card rendered as kv-list inside the column draggable (no pinned row)
    expect(wrapper.find('.eqv3-prev-row').exists()).toBe(false)
    const prevCard = wrapper.find('.eqv3-prev-card')
    expect(prevCard.exists()).toBe(true)
    const kvLabels = prevCard.findAll('.eqv3-k').map(el => el.text())
    expect(kvLabels).toContain('Open')
    expect(kvLabels).toContain('High')
    expect(kvLabels).toContain('Low')
    expect(kvLabels).toContain('Close')
    expect(kvLabels).toContain('Volume')
    expect(kvLabels).toContain('VWAP')
  })
})

describe('Massive API — company data', () => {
  test('test_EnhancedQuoteV3_with_fetchCompany_resolved_expect_company_name_in_hero', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    const hero = wrapper.find('.eqv3-hero')
    expect(hero.text()).toContain('Tesla Inc.')
    expect(hero.text()).toContain('Motor Vehicles')
  })

  test('test_EnhancedQuoteV3_with_logo_url_in_response_expect_logo_rendered_with_apiKey', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    const logo = wrapper.find('.eqv3-logo')
    expect(logo.exists()).toBe(true)
    expect(logo.attributes('src')).toContain('logo.svg')
    expect(logo.attributes('src')).toContain('?apiKey=')
    expect(logo.attributes('src')).toContain('test-massive-key')
  })

  test('test_EnhancedQuoteV3_with_no_branding_in_response_expect_logo_not_rendered', async () => {
    // Arrange
    const tickerNoLogo = {
      results: {
        name: 'Tesla Inc.',
        sic_description: 'Motor Vehicles',
        description: 'Tesla designs EVs.',
        homepage_url: 'https://tesla.com',
        // no branding field
      },
    }
    mockMassiveFetch({ ticker: tickerNoLogo })
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.eqv3-logo').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_fetch_network_error_expect_no_crash_and_company_unavailable', async () => {
    // Arrange
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: no crash, company card shows unavailable
    expect(wrapper.find('.eqv3-company-card').exists()).toBe(true)
    expect(wrapper.find('.eqv3-company-card').text()).toContain('unavailable')
    expect(wrapper.vm.companyLoading).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_ticker_change_expect_logoUrl_reset', async () => {
    // Arrange: load TSLA with logo
    mockMassiveFetch()
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.eqv3-logo').exists()).toBe(true)

    // Act: change ticker — new fetch returns no branding
    const tickerNoLogo = { results: { name: 'AAPL Inc.', sic_description: 'Computers' } }
    mockMassiveFetch({ ticker: tickerNoLogo })
    wrapper.vm.manualTicker = 'AAPL'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE, symbol: 'AAPL' }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: logo removed
    expect(wrapper.find('.eqv3-logo').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_fetchCompany_maps_exchange_marketcap_employees_listdate_to_companyData', async () => {
    // Arrange — regression test: fetchCompany previously only mapped 4 fields,
    // leaving exchange/market_cap/total_employees/list_date as undefined in the company card.
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: all four previously-missing fields are populated in companyData
    expect(wrapper.vm.companyData.primary_exchange).toBe('XNAS')
    expect(wrapper.vm.companyData.market_cap).toBe(800000000000)
    expect(wrapper.vm.companyData.total_employees).toBe(127855)
    expect(wrapper.vm.companyData.list_date).toBe('2010-06-29')
  })

  test('test_EnhancedQuoteV3_with_default_settings_expect_logo_mode_and_logo_url_shown', async () => {
    // Arrange: no brandingMode in settings — defaults to logo
    mockMassiveFetch()
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: brandingMode defaults to logo; activeBrandingUrl is logo_url
    expect(wrapper.vm.brandingMode).toBe('logo')
    expect(wrapper.vm.activeBrandingUrl).toContain('logo.svg')
    const img = wrapper.find('.eqv3-logo')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('logo.svg')
  })

  test('test_EnhancedQuoteV3_with_brandingMode_icon_expect_icon_url_shown', async () => {
    // Arrange: settings.brandingMode = 'icon'
    mockMassiveFetch()
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { brandingMode: 'icon' } },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: activeBrandingUrl is icon_url
    expect(wrapper.vm.brandingMode).toBe('icon')
    expect(wrapper.vm.activeBrandingUrl).toContain('icon.png')
    const img = wrapper.find('.eqv3-logo')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('icon.png')
  })

  test('test_EnhancedQuoteV3_toggleBranding_emits_update_settings_with_new_brandingMode', async () => {
    // Arrange
    const updateSettingsCalls = []
    mockMassiveFetch()
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { brandingMode: 'logo' } },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Act: toggle from logo → icon
    wrapper.vm.toggleBranding()

    // Assert: emits with brandingMode: 'icon'
    expect(updateSettingsCalls.length).toBe(1)
    expect(updateSettingsCalls[0].brandingMode).toBe('icon')

    // Act: simulate prop update + toggle back icon → logo
    await wrapper.setProps({ settings: { brandingMode: 'icon' } })
    wrapper.vm.toggleBranding()
    expect(updateSettingsCalls[1].brandingMode).toBe('logo')
  })

  test('test_EnhancedQuoteV3_branding_toggle_button_visible_only_when_unlocked', async () => {
    // Arrange: unlocked, both urls available
    mockMassiveFetch()
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: {} },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: toggle visible when unlocked + both URLs present
    expect(wrapper.find('.eqv3-branding-toggle').exists()).toBe(true)

    // Lock the widget — toggle should disappear
    await wrapper.setProps({ isLocked: true })
    expect(wrapper.find('.eqv3-branding-toggle').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_branding_toggle_visible_when_only_one_url_available', async () => {
    // Arrange: only logo_url, no icon_url
    const tickerLogoOnly = {
      results: {
        name: 'Tesla Inc.',
        sic_description: 'Motor Vehicles',
        branding: {
          logo_url: 'https://api.massive.com/v1/reference/company-branding/tsla/logo.svg',
          // no icon_url
        },
      },
    }
    mockMassiveFetch({ ticker: tickerLogoOnly })
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: {} },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.setProps({ settings: { brandingMode: 'icon' } })
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: toggle shown (only one url available)
    expect(wrapper.find('.eqv3-branding-toggle').exists()).toBe(true)
    // But logo still renders
    expect(wrapper.find('.eqv3-logo').exists()).toBe(true)
  })
})

describe('Massive API — short interest and volume', () => {
  test('test_EnhancedQuoteV3_with_fetchShortData_resolved_expect_short_interest_displayed', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    const shortCard = wrapper.find('.eqv3-short-card')
    expect(shortCard.exists()).toBe(true)
    expect(shortCard.text()).toContain('12.0M')  // short_interest formatted
    expect(shortCard.text()).toContain('2.4')    // days_to_cover
  })

  test('test_EnhancedQuoteV3_with_short_volume_data_expect_short_volume_ratio_displayed', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    const shortCard = wrapper.find('.eqv3-short-card')
    expect(shortCard.text()).toContain('38.5')  // short_volume_ratio
  })

  test('test_EnhancedQuoteV3_with_short_endpoints_returning_empty_results_expect_unavailable', async () => {
    // Arrange: endpoints return empty results arrays
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    const shortCard = wrapper.find('.eqv3-short-card')
    expect(shortCard.text()).toContain('unavailable')
  })

  test('test_EnhancedQuoteV3_with_short_interest_fetch_error_expect_unavailable_shown', async () => {
    // Arrange
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/short-interest') || url.includes('/short-volume'))
        return Promise.reject(new Error('Network error'))
      return Promise.resolve({ ok: true, json: async () => ({ results: [] }) })
    })
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.eqv3-short-card').text()).toContain('unavailable')
    expect(wrapper.vm.shortInterestLoading).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_short_data_fetched_expect_both_endpoints_called_in_parallel', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    // Assert: both short-interest and short-volume called
    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls.some(u => u.includes('short-interest'))).toBe(true)
    expect(urls.some(u => u.includes('short-volume'))).toBe(true)
  })

  test('test_EnhancedQuoteV3_with_short_data_fetched_expect_massiveApiKey_in_urls', async () => {
    // Arrange
    mockMassiveFetch()
    const wrapper = mountWidget()

    // Act
    wrapper.vm.manualTicker = 'AAPL'
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    // Assert: massiveApiKey appended to API URLs
    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls.some(u => u.includes('apiKey=test-massive-key'))).toBe(true)
  })
})

describe('Card layout and settings', () => {
  // CARD_REGISTRY default order: today, prev, volume, session, short, company
  const REGISTRY_IDS = ['today', 'prev', 'volume', 'session', 'short', 'company']

  test('test_EnhancedQuoteV3_with_isLocked_true_expect_drag_handles_hidden', async () => {
    // Arrange
    const wrapper = mountWidget({ isLocked: true })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.eqv3-drag-handle').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_isLocked_false_expect_drag_handles_visible', async () => {
    // Arrange
    const wrapper = mountWidget({ isLocked: false })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.find('.eqv3-drag-handle').exists()).toBe(true)
  })

  test('test_EnhancedQuoteV3_with_default_settings_expect_activeCards_in_registry_order', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: {} })

    // Assert
    const ids = wrapper.vm.activeCards.map(c => c.id)
    expect(ids).toEqual(REGISTRY_IDS)
  })

  test('test_EnhancedQuoteV3_activeCards_has_6_entries_by_default', () => {
    // Arrange / Act
    const wrapper = mountWidget({ settings: {} })

    // Assert
    expect(wrapper.vm.activeCards.length).toBe(6)
  })

  test('test_EnhancedQuoteV3_with_custom_cardOrder_expect_activeCards_respects_order', () => {
    // Arrange: full 6-card custom order including prev
    const customOrder = ['volume', 'session', 'company', 'short', 'today', 'prev']

    // Act
    const wrapper = mountWidget({ settings: { cardOrder: customOrder } })

    // Assert
    expect(wrapper.vm.activeCards.map(c => c.id)).toEqual(customOrder)
  })

  test('test_EnhancedQuoteV3_with_onDragEnd_expect_update_settings_emitted_with_cardOrder', async () => {
    // Arrange
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: {} },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Act: simulate col1 reorder then drag end (narrow mode — all cards in col1 including prev)
    const reordered = ['today', 'session', 'prev', 'volume', 'short', 'company']
    wrapper.vm.onColReorder(
      reordered.map(id => ({ id, label: id })),
      1
    )
    await wrapper.vm.onDragEnd()
    await wrapper.vm.$nextTick()

    // Assert: saved order reflects the reordered list directly (no special-casing for prev)
    expect(updateSettingsCalls.length).toBe(1)
    expect(updateSettingsCalls[0].cardOrder).toEqual(reordered)
  })

  test('test_EnhancedQuoteV3_with_narrow_layout_default_expect_col2_not_rendered', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert
    expect(wrapper.vm.layoutMode).toBe('narrow')
    expect(wrapper.find('.eqv3-col-2').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_full_layoutMode_expect_full_row_draggable_rendered', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Act
    wrapper.vm.layoutMode = 'full'
    await wrapper.vm.$nextTick()

    // Assert: full-row draggable rendered (single horizontal row of all cards)
    expect(wrapper.find('.eqv3-full-row-draggable').exists()).toBe(true)
    // col-3 no longer exists at full mode (replaced by flat row)
    expect(wrapper.find('.eqv3-col-3').exists()).toBe(false)
    // col3Cards is always empty (kept for API compat)
    expect(wrapper.vm.col3Cards).toEqual([])
    // fullRowCards includes all 6 registry cards
    expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('company')
    expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('prev')
    expect(wrapper.vm.fullRowCards.length).toBe(6)
  })

  test('test_EnhancedQuoteV3_with_col3Cards_always_empty', async () => {
    // Arrange / Act
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert: narrow
    expect(wrapper.vm.col3Cards).toEqual([])

    // Wide
    wrapper.vm.layoutMode = 'wide'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.col3Cards).toEqual([])

    // Full
    wrapper.vm.layoutMode = 'full'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.col3Cards).toEqual([])
  })

  test('test_EnhancedQuoteV3_prev_is_draggable_in_all_layouts', async () => {
    // Arrange: narrow mode (default)
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert at narrow: prev is in activeCards and rendered as a regular card, no pinned row
    expect(wrapper.find('.eqv3-prev-row').exists()).toBe(false)
    expect(wrapper.vm.activeCards.map(c => c.id)).toContain('prev')
    expect(wrapper.find('.eqv3-prev-card').exists()).toBe(true)

    // At full mode: prev is also in fullRowCards
    wrapper.vm.layoutMode = 'full'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.fullRowCards.map(c => c.id)).toContain('prev')
  })

  test('test_EnhancedQuoteV3_onFullRowReorder_emits_update_settings_with_reordered_cardOrder', async () => {
    // Arrange
    // vuedraggable fires @update:model-value (onFullRowReorder) AFTER @end,
    // so the emit is driven directly from the updated list rather than reading
    // a stale _fullRow ref set in @end.
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
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

describe('Full mode — chips-to-kv-list rendering', () => {
  test('test_EnhancedQuoteV3_with_full_layoutMode_session_card_renders_kv_list_not_chips', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    wrapper.vm.layoutMode = 'full'
    await wrapper.vm.$nextTick()

    // Act: locate the session card inside the full-row draggable
    const fullRow = wrapper.find('.eqv3-full-row-draggable')
    expect(fullRow.exists()).toBe(true)

    // Assert: no chips — kv-list rows instead
    expect(fullRow.find('.eqv3-session-chips').exists()).toBe(false)
    expect(fullRow.find('.eqv3-session-chip').exists()).toBe(false)

    const kvItems = fullRow.findAll('.eqv3-kv')
    const labels = kvItems.map(kv => kv.find('.eqv3-k').text())
    expect(labels).toContain('Pre High')
    expect(labels).toContain('Pre Low')
    expect(labels).toContain('Reg High')
    expect(labels).toContain('Reg Low')
    expect(labels).toContain('AH High')
    expect(labels).toContain('AH Low')

    // Assert values from SAMPLE_QUOTE
    const preHighRow = kvItems.find(kv => kv.find('.eqv3-k').text() === 'Pre High')
    expect(preHighRow.find('.eqv3-v').text()).toBe('$252.00')
    const regLowRow = kvItems.find(kv => kv.find('.eqv3-k').text() === 'Reg Low')
    expect(regLowRow.find('.eqv3-v').text()).toBe('$247.00')
  })

  test('test_EnhancedQuoteV3_with_full_layoutMode_prev_card_renders_kv_list_not_chips', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    wrapper.vm.layoutMode = 'full'
    await wrapper.vm.$nextTick()

    // Act: locate the prev-day card specifically inside the full-row draggable
    const prevCard = wrapper.find('.eqv3-prev-card')
    expect(prevCard.exists()).toBe(true)

    // Assert: no prev-chips — kv-list rows instead
    expect(prevCard.find('.eqv3-prev-chips').exists()).toBe(false)

    const kvItems = prevCard.findAll('.eqv3-kv')
    const labels = kvItems.map(kv => kv.find('.eqv3-k').text())
    expect(labels).toContain('Open')
    expect(labels).toContain('High')
    expect(labels).toContain('Low')
    expect(labels).toContain('Close')
    expect(labels).toContain('Volume')
    expect(labels).toContain('VWAP')

    // Assert values from SAMPLE_QUOTE (prev_day_open=245, prev_day_close=245)
    const openRow = kvItems.find(kv => kv.find('.eqv3-k').text() === 'Open')
    expect(openRow.find('.eqv3-v').text()).toBe('$245.00')
    const closeRow = kvItems.find(kv => kv.find('.eqv3-k').text() === 'Close')
    expect(closeRow.find('.eqv3-v').text()).toBe('$245.00')
  })

  test('test_EnhancedQuoteV3_with_narrow_layoutMode_default_expect_kv_list_not_chips', async () => {
    // Arrange — narrow, no chipCards in settings (default)
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert: kv-list rendered by default (chips mode is opt-in via toggle)
    expect(wrapper.find('.eqv3-session-chips').exists()).toBe(false)
    expect(wrapper.find('.eqv3-kv-list').exists()).toBe(true)
    // No pinned prev-row; prev-card in column
    expect(wrapper.find('.eqv3-prev-row').exists()).toBe(false)
    expect(wrapper.find('.eqv3-prev-card').exists()).toBe(true)
    // Full-row draggable not present at narrow
    expect(wrapper.find('.eqv3-full-row-draggable').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_with_chipCards_setting_expect_chips_rendered', async () => {
    // Arrange — session and prev in chipCards
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { chipCards: ['session', 'prev'] } },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()

    // Assert: chips rendered for session and prev
    expect(wrapper.find('.eqv3-session-chips').exists()).toBe(true)
    const prevCard = wrapper.find('.eqv3-prev-card')
    expect(prevCard.find('.eqv3-chip-row').exists()).toBe(true)
    // kv-list NOT rendered for those cards
    expect(wrapper.find('.eqv3-session-chip').exists()).toBe(true)
  })
})

describe('Hero identity blocks', () => {
  test('test_EnhancedQuoteV3_hero_uses_semantic_blocks_for_symbol_price_and_identity', async () => {
    // Arrange
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/v3/reference/tickers/'))
        return Promise.resolve({ ok: true, json: async () => ({
          results: { name: 'Apple Inc.', sic_description: 'Electronic Computers' }
        })})
      return Promise.resolve({ ok: true, json: async () => ({ results: [] }) })
    })
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'AAPL'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // Assert: symbol in symbol-block, company info in identity-block
    expect(wrapper.find('.eqv3-hero-symbol-block').exists()).toBe(true)
    expect(wrapper.find('.eqv3-hero-symbol-block .eqv3-symbol').exists()).toBe(true)
    expect(wrapper.find('.eqv3-hero-price-block').exists()).toBe(true)
    expect(wrapper.find('.eqv3-hero-identity-block').exists()).toBe(true)
    expect(wrapper.find('.eqv3-hero-identity-block .eqv3-hero-company-name').text()).toBe('Apple Inc.')
    expect(wrapper.find('.eqv3-hero-identity-block .eqv3-hero-sic').text()).toBe('Electronic Computers')
  })
})

describe('Splits', () => {
  test('test_EnhancedQuoteV3_with_splits_in_quote_data_expect_splits_section_rendered', async () => {
    // Arrange
    const wrapper = mountWidget()
    wrapper.vm.manualTicker = 'TSLA'
    await nextTick()
    // Act
    wrapper.vm.quoteData = {
      ...SAMPLE_QUOTE,
      splits: [{ split_to: 3, split_from: 1, execution_date: '2024-10-15' }],
    }
    await nextTick()
    // Assert
    expect(wrapper.find('.eqv3-splits-card').exists()).toBe(true)
    expect(wrapper.find('.eqv3-splits-card').text()).toContain('3-for-1')
    expect(wrapper.find('.eqv3-splits-card').text()).toContain('2024-10-15')
  })
})

describe('Card visibility and chips toggles', () => {
  test('test_EnhancedQuoteV3_hiddenCardIds_with_no_setting_expect_empty_set', () => {
    // Arrange
    const wrapper = mountWidget()
    // Assert: no settings -> hiddenCardIds is empty set
    expect(wrapper.vm.hiddenCardIds.size).toBe(0)
  })

  test('test_EnhancedQuoteV3_hiddenCardIds_with_hiddenCards_setting_expect_correct_set', () => {
    // Arrange
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['short', 'volume'] } },
    })
    // Assert
    expect(wrapper.vm.hiddenCardIds.has('short')).toBe(true)
    expect(wrapper.vm.hiddenCardIds.has('volume')).toBe(true)
    expect(wrapper.vm.hiddenCardIds.has('today')).toBe(false)
  })

  test('test_EnhancedQuoteV3_chipCardIds_with_chipCards_setting_expect_correct_set', () => {
    // Arrange
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { chipCards: ['prev', 'session'] } },
    })
    // Assert
    expect(wrapper.vm.chipCardIds.has('prev')).toBe(true)
    expect(wrapper.vm.chipCardIds.has('session')).toBe(true)
    expect(wrapper.vm.chipCardIds.has('today')).toBe(false)
  })

  test('test_EnhancedQuoteV3_visibleCards_excludes_hidden_cards', () => {
    // Arrange: hide 'short'
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['short'] } },
    })
    // Assert: visibleCards does not contain 'short'; activeCards still does
    expect(wrapper.vm.visibleCards.map(c => c.id)).not.toContain('short')
    expect(wrapper.vm.activeCards.map(c => c.id)).toContain('short')
  })

  test('test_EnhancedQuoteV3_hiddenCards_computed_returns_only_hidden', () => {
    // Arrange: hide 'volume' and 'prev'
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['volume', 'prev'] } },
    })
    const ids = wrapper.vm.hiddenCards.map(c => c.id)
    expect(ids).toContain('volume')
    expect(ids).toContain('prev')
    expect(ids).not.toContain('today')
  })

  test('test_EnhancedQuoteV3_toggleCardVisibility_with_visible_card_expect_added_to_hiddenCards', async () => {
    // Arrange
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: {} },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    // Act
    wrapper.vm.toggleCardVisibility('short')
    // Assert
    expect(updateSettingsCalls.length).toBe(1)
    expect(updateSettingsCalls[0].hiddenCards).toContain('short')
  })

  test('test_EnhancedQuoteV3_toggleCardVisibility_with_hidden_card_expect_removed_from_hiddenCards', async () => {
    // Arrange: 'short' already hidden
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['short'] } },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    // Act: toggle again to re-show
    wrapper.vm.toggleCardVisibility('short')
    // Assert: 'short' removed from hiddenCards
    expect(updateSettingsCalls[0].hiddenCards).not.toContain('short')
  })

  test('test_EnhancedQuoteV3_toggleCardChips_with_normal_card_expect_added_to_chipCards', () => {
    // Arrange
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: {} },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    // Act
    wrapper.vm.toggleCardChips('prev')
    // Assert
    expect(updateSettingsCalls[0].chipCards).toContain('prev')
  })

  test('test_EnhancedQuoteV3_toggleCardChips_with_chip_card_expect_removed_from_chipCards', () => {
    // Arrange: 'prev' already in chips mode
    const updateSettingsCalls = []
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { chipCards: ['prev'] } },
      attrs: { 'onUpdate-settings': (payload) => updateSettingsCalls.push(payload) },
    })
    // Act: toggle off
    wrapper.vm.toggleCardChips('prev')
    // Assert
    expect(updateSettingsCalls[0].chipCards).not.toContain('prev')
  })

  test('test_EnhancedQuoteV3_hidden_tray_visible_when_cards_hidden_in_edit_mode', async () => {
    // Arrange: 'short' hidden, edit mode
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['short'] } },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    // Assert: tray visible with the hidden card's label
    const tray = wrapper.find('.eqv3-hidden-tray')
    expect(tray.exists()).toBe(true)
    expect(tray.text()).toContain('Short Interest')
  })

  test('test_EnhancedQuoteV3_hidden_tray_not_visible_when_locked', async () => {
    // Arrange: 'short' hidden but widget is locked
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: true, settings: { hiddenCards: ['short'] } },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    // Assert: tray not visible when locked
    expect(wrapper.find('.eqv3-hidden-tray').exists()).toBe(false)
  })

  test('test_EnhancedQuoteV3_hidden_card_absent_from_visible_layout', async () => {
    // Arrange: hide 'volume'
    const wrapper = mount(EnhancedQuoteV3, {
      props: { isLocked: false, settings: { hiddenCards: ['volume'] } },
    })
    wrapper.vm.manualTicker = 'TSLA'
    await wrapper.vm.$nextTick()
    wrapper.vm.quoteData = { ...SAMPLE_QUOTE }
    await wrapper.vm.$nextTick()
    // Assert: volume card not rendered in the column
    expect(wrapper.find('.eqv3-volume-card').exists()).toBe(false)
    // But it appears in the tray
    expect(wrapper.find('.eqv3-hidden-tray').text()).toContain('Volume')
  })
})

describe('Exposed interface', () => {
  test('test_EnhancedQuoteV3_exposes_required_properties', () => {
    // Arrange / Act
    const wrapper = mountWidget()

    // Assert
    expect(wrapper.vm.lastDataAt).toBeDefined()
    expect(wrapper.vm.isConnected).toBeDefined()
    expect(wrapper.vm.reconnecting).toBeDefined()
    expect(wrapper.vm.quoteData).toBeDefined()
    expect(wrapper.vm.manualTicker).toBeDefined()
    expect(wrapper.vm.companyData).toBeDefined()
    expect(wrapper.vm.companyLoading).toBeDefined()
    expect(wrapper.vm.shortInterestData).toBeDefined()
    expect(wrapper.vm.shortInterestLoading).toBeDefined()
    expect(wrapper.vm.activeCards).toBeDefined()
    expect(wrapper.vm.visibleCards).toBeDefined()
    expect(wrapper.vm.hiddenCards).toBeDefined()
    expect(wrapper.vm.hiddenCardIds).toBeDefined()
    expect(wrapper.vm.chipCardIds).toBeDefined()
    expect(typeof wrapper.vm.toggleCardVisibility).toBe('function')
    expect(typeof wrapper.vm.toggleCardChips).toBe('function')
    expect(wrapper.vm.isDragging).toBeDefined()
    expect(wrapper.vm.logoUrl).toBeDefined()
    expect(wrapper.vm.iconUrl).toBeDefined()
    expect(wrapper.vm.brandingMode).toBeDefined()
    expect(wrapper.vm.activeBrandingUrl).toBeDefined()
    expect(wrapper.vm.toggleBranding).toBeDefined()
    expect(wrapper.vm.fullRowCards).toBeDefined()
    expect(wrapper.vm.onFullRowDragEnd).toBeDefined()
    expect(wrapper.vm.onFullRowReorder).toBeDefined()
    expect(wrapper.vm._fullRow).toBeDefined()
    expect(typeof wrapper.vm.onColReorder).toBe('function')
    expect(typeof wrapper.vm.onDragEnd).toBe('function')
    expect(wrapper.vm.layoutMode).toBeDefined()
    expect(wrapper.vm.col3Cards).toBeDefined()
  })
})
