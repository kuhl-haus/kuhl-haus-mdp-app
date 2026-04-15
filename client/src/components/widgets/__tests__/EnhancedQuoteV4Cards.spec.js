import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import EQV4HeroCard    from '../EQV4HeroCard.vue'
import EQV4TodayCard   from '../EQV4TodayCard.vue'
import EQV4PrevCard    from '../EQV4PrevCard.vue'
import EQV4VolumeCard  from '../EQV4VolumeCard.vue'
import EQV4SessionCard from '../EQV4SessionCard.vue'
import EQV4ShortCard   from '../EQV4ShortCard.vue'
import EQV4CompanyCard from '../EQV4CompanyCard.vue'

// Minimal quote data shared across card tests.
const QUOTE = {
  symbol: 'AAPL',
  close: 189.5,
  change: 2.3,
  pct_change: 1.23,
  change_since_open: 1.1,
  pct_change_since_open: 0.58,
  end_timestamp: new Date('2026-04-15T16:00:00Z').getTime(),
  official_open_price: 188.0,
  aggregate_vwap: 188.7,
  prev_day_open: 185.0,
  prev_day_high: 190.0,
  prev_day_low: 184.5,
  prev_day_close: 187.2,
  prev_day_volume: 55000000,
  prev_day_vwap: 186.9,
  accumulated_volume: 62000000,
  avg_volume: 58000000,
  free_float: 15500000000,
  relative_volume: 3.2,
  pre_market_high: 188.5,
  pre_market_low: 187.0,
  regular_session_high: 190.0,
  regular_session_low: 187.5,
  after_hours_high: null,
  after_hours_low: null,
}

const SHORT_DATA = {
  short_interest: 125000000,
  days_to_cover: 2.1,
  short_volume_ratio: 38.5,
}

const COMPANY_DATA = {
  name: 'Apple Inc.',
  sic_description: 'Electronic Computers',
  description: 'Apple designs and sells consumer electronics.',
  homepage_url: 'https://apple.com',
  primary_exchange: 'XNAS',
  market_cap: 2900000000000,
  total_employees: 164000,
  list_date: '1980-12-12',
}

// ── EQV4HeroCard ─────────────────────────────────────────────────────────────

describe('EQV4HeroCard', () => {
  test('with quote data expect symbol and price rendered', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, companyData: COMPANY_DATA, isLocked: true, brandingMode: 'logo', activeBrandingUrl: null },
    })

    // Act — (mount is the act)

    // Assert
    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).toContain('189.50')
    expect(wrapper.text()).toContain('+2.30')
  })

  test('with empty quoteData object expect no crash and dashes rendered', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: {}, isLocked: true, brandingMode: 'logo', activeBrandingUrl: null },
    })

    // Act — (mount is the act)

    // Assert — no throw; dashes for numeric fields
    expect(wrapper.text()).toContain('—')
  })

  test('with null end_timestamp expect dataAge shows dash', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: { ...QUOTE, end_timestamp: null }, isLocked: true },
    })

    // Assert
    expect(wrapper.text()).toContain('as of —')
  })

  test('with positive change expect positive badge class', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: { ...QUOTE, pct_change: 1.5, change: 2.5 }, isLocked: true },
    })

    // Act
    const badge = wrapper.find('.eqv4-change-badge')

    // Assert
    expect(badge.classes()).toContain('positive')
  })

  test('with negative change expect negative badge class', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: { ...QUOTE, pct_change: -1.5, change: -2.5 }, isLocked: true },
    })

    // Act
    const badge = wrapper.find('.eqv4-change-badge')

    // Assert
    expect(badge.classes()).toContain('negative')
  })

  test('with isLocked false expect branding toggle button visible', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, isLocked: false, brandingMode: 'logo', activeBrandingUrl: null },
    })

    // Act
    const btn = wrapper.find('.eqv4-branding-toggle')

    // Assert
    expect(btn.exists()).toBe(true)
  })

  test('with isLocked true expect branding toggle hidden', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, isLocked: true, brandingMode: 'logo', activeBrandingUrl: null },
    })

    // Assert
    expect(wrapper.find('.eqv4-branding-toggle').exists()).toBe(false)
  })

  test('with branding toggle click expect toggle-branding event emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, isLocked: false, brandingMode: 'logo', activeBrandingUrl: null },
      attrs: { 'onToggle-branding': () => calls.push(true) },
    })

    // Act
    await wrapper.find('.eqv4-branding-toggle').trigger('click')

    // Assert
    expect(calls).toHaveLength(1)
  })

  test('with company data expect name and sic rendered', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, companyData: COMPANY_DATA, isLocked: true },
    })

    // Assert
    expect(wrapper.text()).toContain('Apple Inc.')
    expect(wrapper.text()).toContain('Electronic Computers')
  })

  test('with activeBrandingUrl expect logo img rendered', () => {
    // Arrange
    const wrapper = mount(EQV4HeroCard, {
      props: { quoteData: QUOTE, isLocked: true, brandingMode: 'logo', activeBrandingUrl: 'https://cdn.example.com/logo.png' },
    })

    // Assert
    expect(wrapper.find('img.eqv4-hero-logo').exists()).toBe(true)
    expect(wrapper.find('img.eqv4-hero-logo').attributes('src')).toContain('logo.png')
  })
})

// ── EQV4TodayCard ────────────────────────────────────────────────────────────

describe('EQV4TodayCard', () => {
  test('with list mode expect kv-list rendered', () => {
    // Arrange
    const wrapper = mount(EQV4TodayCard, { props: { quoteData: QUOTE, chipsMode: false } })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('188.00')
    expect(wrapper.text()).toContain('188.70')
  })

  test('with chips mode expect chip row rendered', () => {
    // Arrange
    const wrapper = mount(EQV4TodayCard, { props: { quoteData: QUOTE, chipsMode: true } })

    // Assert
    expect(wrapper.find('.eqv4-chip-row').exists()).toBe(true)
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(false)
  })

  test('with null open price expect dash rendered', () => {
    // Arrange
    const wrapper = mount(EQV4TodayCard, {
      props: { quoteData: { ...QUOTE, official_open_price: null }, chipsMode: false },
    })

    // Assert
    expect(wrapper.text()).toContain('—')
  })
})

// ── EQV4PrevCard ─────────────────────────────────────────────────────────────

describe('EQV4PrevCard', () => {
  test('with list mode expect all OHLCV kv rows rendered', () => {
    // Arrange
    const wrapper = mount(EQV4PrevCard, { props: { quoteData: QUOTE, chipsMode: false } })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('185.00')  // Open
    expect(wrapper.text()).toContain('190.00')  // High
    expect(wrapper.text()).toContain('55.0M')   // Volume
  })

  test('with chips mode expect chip row rendered', () => {
    // Arrange
    const wrapper = mount(EQV4PrevCard, { props: { quoteData: QUOTE, chipsMode: true } })

    // Assert
    expect(wrapper.find('.eqv4-chip-row').exists()).toBe(true)
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(false)
  })
})

// ── EQV4VolumeCard ───────────────────────────────────────────────────────────

describe('EQV4VolumeCard', () => {
  test('with list mode expect volume kv-list and rv bar rendered', () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, { props: { quoteData: QUOTE, chipsMode: false } })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.find('.eqv4-rv-row').exists()).toBe(true)
    expect(wrapper.text()).toContain('62.0M')   // Volume
    expect(wrapper.text()).toContain('3.20x')   // RVol
  })

  test('with chips mode expect chip row with rvol rendered', () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, { props: { quoteData: QUOTE, chipsMode: true } })

    // Assert
    expect(wrapper.find('.eqv4-chip-row').exists()).toBe(true)
    expect(wrapper.text()).toContain('RVol')
  })

  test('with high rvol expect high class on rv value', () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...QUOTE, relative_volume: 4.1 }, chipsMode: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-rv-val.high').exists()).toBe(true)
  })

  test('with extreme rvol expect extreme class on rv value', () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...QUOTE, relative_volume: 6.0 }, chipsMode: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-rv-val.extreme').exists()).toBe(true)
  })

  test('with free_float null and shares_outstanding set expect float from shares_outstanding', () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: {
        quoteData: { ...QUOTE, free_float: null, share_class_shares_outstanding: 9000000000 },
        chipsMode: false,
      },
    })

    // Assert
    expect(wrapper.text()).toContain('9.0B')
  })
})

// ── EQV4SessionCard ──────────────────────────────────────────────────────────

describe('EQV4SessionCard', () => {
  test('with list mode expect pre/reg/ah kv rows', () => {
    // Arrange
    const wrapper = mount(EQV4SessionCard, { props: { quoteData: QUOTE, chipsMode: false } })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Pre High')
    expect(wrapper.text()).toContain('188.50')
    expect(wrapper.text()).toContain('Reg High')
  })

  test('with chips mode expect session chips rendered', () => {
    // Arrange
    const wrapper = mount(EQV4SessionCard, { props: { quoteData: QUOTE, chipsMode: true } })

    // Assert
    expect(wrapper.find('.eqv4-session-chips').exists()).toBe(true)
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(false)
    expect(wrapper.text()).toContain('PRE')
    expect(wrapper.text()).toContain('REG')
    expect(wrapper.text()).toContain('AH')
  })

  test('with null after_hours values expect dash in chips mode', () => {
    // Arrange
    const wrapper = mount(EQV4SessionCard, {
      props: {
        quoteData: { ...QUOTE, after_hours_high: null, after_hours_low: null },
        chipsMode: true,
      },
    })

    // Assert — AH chip shows muted dash
    const ahChip = wrapper.findAll('.eqv4-session-chip')[2]
    expect(ahChip.find('.eqv4-muted-val').exists()).toBe(true)
  })
})

// ── EQV4ShortCard ────────────────────────────────────────────────────────────

describe('EQV4ShortCard', () => {
  test('with short data in list mode expect si/dtc/svr rows', () => {
    // Arrange
    const wrapper = mount(EQV4ShortCard, {
      props: { shortInterestData: SHORT_DATA, loading: false, chipsMode: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('125.0M')
    expect(wrapper.text()).toContain('2.1')
    expect(wrapper.text()).toContain('38.5%')
  })

  test('with short data in chips mode expect chip row', () => {
    // Arrange
    const wrapper = mount(EQV4ShortCard, {
      props: { shortInterestData: SHORT_DATA, loading: false, chipsMode: true },
    })

    // Assert
    expect(wrapper.find('.eqv4-chip-row').exists()).toBe(true)
    expect(wrapper.text()).toContain('SI')
    expect(wrapper.text()).toContain('DTC')
    expect(wrapper.text()).toContain('SVR')
  })

  test('with loading true expect loading message', () => {
    // Arrange
    const wrapper = mount(EQV4ShortCard, {
      props: { shortInterestData: {}, loading: true, chipsMode: false },
    })

    // Assert
    expect(wrapper.text()).toContain('loading')
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(false)
  })

  test('with all null values expect unavailable message', () => {
    // Arrange
    const wrapper = mount(EQV4ShortCard, {
      props: {
        shortInterestData: { short_interest: null, days_to_cover: null, short_volume_ratio: null },
        loading: false,
        chipsMode: false,
      },
    })

    // Assert
    expect(wrapper.text()).toContain('unavailable')
  })
})

// ── EQV4CompanyCard ──────────────────────────────────────────────────────────

describe('EQV4CompanyCard', () => {
  test('with company data expect kv rows rendered', () => {
    // Arrange
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: COMPANY_DATA, loading: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('XNAS')
    expect(wrapper.text()).toContain('$2900.0B')
    expect(wrapper.text()).toContain('164.0K')
  })

  test('with loading true expect loading message', () => {
    // Arrange
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: {}, loading: true },
    })

    // Assert
    expect(wrapper.text()).toContain('loading')
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(false)
  })

  test('with all null data expect unavailable message', () => {
    // Arrange
    const wrapper = mount(EQV4CompanyCard, {
      props: {
        companyData: {
          name: null, sic_description: null, description: null, homepage_url: null,
          primary_exchange: null, market_cap: null, total_employees: null, list_date: null,
        },
        loading: false,
      },
    })

    // Assert
    expect(wrapper.text()).toContain('unavailable')
  })

  test('with only primary_exchange set expect kv rows rendered not unavailable message', () => {
    // Arrange
    const wrapper = mount(EQV4CompanyCard, {
      props: {
        companyData: {
          name: null, sic_description: null, description: null, homepage_url: null,
          primary_exchange: 'XNAS', market_cap: null, total_employees: null, list_date: null,
        },
        loading: false,
      },
    })

    // Assert
    expect(wrapper.find('.eqv4-kv-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('XNAS')
    expect(wrapper.text()).not.toContain('unavailable')
  })

  test('with long description expect see more button and truncated text', () => {
    // Arrange
    const longDesc = 'A'.repeat(300)
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: { ...COMPANY_DATA, description: longDesc }, loading: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-see-more').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(longDesc)
  })

  test('with see more click expect full description rendered', async () => {
    // Arrange
    const longDesc = 'B'.repeat(300)
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: { ...COMPANY_DATA, description: longDesc }, loading: false },
    })

    // Act
    await wrapper.find('.eqv4-see-more').trigger('click')

    // Assert
    expect(wrapper.text()).toContain(longDesc)
  })

  test('with description shorter than maxLen expect no see more button', () => {
    // Arrange
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: { ...COMPANY_DATA, description: 'Short desc.' }, loading: false },
    })

    // Assert
    expect(wrapper.find('.eqv4-see-more').exists()).toBe(false)
  })
})
