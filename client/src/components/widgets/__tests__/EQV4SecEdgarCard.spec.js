import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  const _configRef = ref({ massiveApiKey: 'test-massive-key' })
  return {
    useConfig: vi.fn(() => ({
      config: _configRef,
      loading: ref(false),
      error: ref(null),
      fetchConfig: vi.fn(),
      isAuthenticated: () => true,
    })),
    _configRef,
  }
})

const SAMPLE_FILINGS = [
  { filing_date: '2026-02-03', form_type: '10-K', filing_url: 'https://sec.gov/Archives/1', issuer_name: 'Apple Inc.', cik: '0000320193', accession_number: '0000320193-26-000001' },
  { filing_date: '2025-11-01', form_type: '10-Q', filing_url: 'https://sec.gov/Archives/2', issuer_name: 'Apple Inc.', cik: '0000320193', accession_number: '0000320193-25-000002' },
]

function mockFilingsSuccess(results = SAMPLE_FILINGS) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  })
}

function mockFilingsError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

import EQV4SecEdgarCard from '../EQV4SecEdgarCard.vue'

function mountCard(props = {}) {
  return mount(EQV4SecEdgarCard, {
    props: {
      ticker: null,
      isLocked: true,
      filingCount: 10,
      ...props,
    },
  })
}

// ── No ticker ─────────────────────────────────────────────────────────────────

describe('No ticker state', () => {
  test('test_EQV4SecEdgarCard_with_no_ticker_expect_prompt_shown', () => {
    // Arrange / Act
    const wrapper = mountCard({ ticker: null })

    // Assert
    expect(wrapper.text()).toContain('Enter a ticker to load filings')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── Fetch URL ─────────────────────────────────────────────────────────────────

describe('Fetch URL', () => {
  test('test_EQV4SecEdgarCard_with_ticker_expect_fetch_called_with_correct_url', async () => {
    // Arrange
    mockFilingsSuccess()

    // Act
    mountCard({ ticker: 'AAPL', filingCount: 10 })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('ticker=AAPL')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=10')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sort=filing_date.desc')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('apiKey=test-massive-key')
    )
  })

  test('test_EQV4SecEdgarCard_with_custom_filingCount_expect_limit_in_url_matches', async () => {
    // Arrange
    mockFilingsSuccess()

    // Act
    mountCard({ ticker: 'MSFT', filingCount: 25 })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=25')
    )
  })
})

// ── Data rows ─────────────────────────────────────────────────────────────────

describe('Data rows', () => {
  test('test_EQV4SecEdgarCard_with_filings_data_expect_rows_with_date_and_form_type_link', async () => {
    // Arrange
    mockFilingsSuccess()

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert — dates and form types rendered
    expect(wrapper.text()).toContain('2026-02-03')
    expect(wrapper.text()).toContain('10-K')
    expect(wrapper.text()).toContain('2025-11-01')
    expect(wrapper.text()).toContain('10-Q')

    // Assert — primary links use EDGAR index URL (text/html)
    const links = wrapper.findAll('.eqv4-edgar-link')
    expect(links.length).toBe(2)
    expect(links[0].attributes('href')).toBe(
      'https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000001/0000320193-26-000001-index.htm'
    )
    expect(links[0].attributes('target')).toBe('_blank')
    expect(links[1].attributes('href')).toBe(
      'https://www.sec.gov/Archives/edgar/data/0000320193/000032019325000002/0000320193-25-000002-index.htm'
    )

    // Assert — secondary raw links use filing_url (.txt backup)
    const rawLinks = wrapper.findAll('.eqv4-edgar-raw-link')
    expect(rawLinks.length).toBe(2)
    expect(rawLinks[0].attributes('href')).toBe('https://sec.gov/Archives/1')
    expect(rawLinks[0].attributes('target')).toBe('_blank')
    expect(rawLinks[0].text()).toBe('txt')
  })
})

// ── Filing count change ───────────────────────────────────────────────────────

describe('Filing count change', () => {
  test('test_EQV4SecEdgarCard_with_filing_count_change_expect_update_filing_count_emitted', async () => {
    // Arrange
    mockFilingsSuccess()
    const calls = []
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: 'AAPL', isLocked: true, filingCount: 10 },
      attrs: { onUpdateFilingCount: (n) => calls.push(n) },
    })
    await nextTick()
    await nextTick()

    // Act
    const select = wrapper.find('.eqv4-edgar-count-select')
    await select.setValue('25')
    await select.trigger('change')
    await nextTick()

    // Assert
    expect(calls).toContain(25)
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('Error state', () => {
  test('test_EQV4SecEdgarCard_with_fetch_error_expect_error_state_and_retry_button', async () => {
    // Arrange
    mockFilingsError(503)

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-edgar-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('HTTP 503')
    expect(wrapper.find('.eqv4-retry-btn').exists()).toBe(true)
  })
})

// ── Remove button ─────────────────────────────────────────────────────────────

describe('Remove button', () => {
  test('test_EQV4SecEdgarCard_with_isLocked_false_expect_remove_button_and_remove_emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: null, isLocked: false, filingCount: 10 },
      attrs: { onRemove: () => calls.push(true) },
    })

    // Assert — remove button visible
    expect(wrapper.find('.eqv4-edgar-remove').exists()).toBe(true)

    // Act
    await wrapper.find('.eqv4-edgar-remove').trigger('click')

    // Assert — remove emitted
    expect(calls).toHaveLength(1)
  })
})

// ── Impact badge ────────────────────────────────────────────────────────────────────────────────

describe('Impact badge', () => {
  function mountWithFormType(form_type) {
    mockFilingsSuccess([
      { filing_date: '2026-01-01', form_type, filing_url: 'https://sec.gov/x', cik: '1234', accession_number: '0000001234-26-000001' },
    ])
    return mount(EQV4SecEdgarCard, { props: { ticker: 'TST', isLocked: true, filingCount: 10 } })
  }

  test('test_EQV4SecEdgarCard_with_S3_expect_high_shelf_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('S-3')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Shelf registration')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })

  test('test_EQV4SecEdgarCard_with_8K_expect_high_material_event_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('8-K')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Material event')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })

  test('test_EQV4SecEdgarCard_with_DEF14A_expect_medium_proxy_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('DEF 14A')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Proxy statement')
    expect(badge.classes()).toContain('eqv4-impact-badge--medium')
  })

  test('test_EQV4SecEdgarCard_with_SC13D_expect_high_activist_stake_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('SC 13D')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('>5% activist stake')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })

  test('test_EQV4SecEdgarCard_with_10Q_expect_medium_quarterly_earnings_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('10-Q')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Quarterly earnings')
    expect(badge.classes()).toContain('eqv4-impact-badge--medium')
  })

  test('test_EQV4SecEdgarCard_with_NT10K_expect_high_late_filing_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('NT 10-K')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Late filing notice')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })

  test('test_EQV4SecEdgarCard_with_10KA_expect_high_restated_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('10-K/A')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Annual report (restated)')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })

  test('test_EQV4SecEdgarCard_with_whitespace_form_type_expect_badge_rendered_via_trim', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType(' S-3 ')
    await nextTick()
    await nextTick()

    // Assert — trim normalization fires
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Shelf registration')
  })

  test('test_EQV4SecEdgarCard_with_S8_expect_no_badge_rendered', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('S-8')
    await nextTick()
    await nextTick()

    // Assert — S-8 not in map
    expect(wrapper.find('.eqv4-impact-badge').exists()).toBe(false)
  })

  test('test_EQV4SecEdgarCard_with_S1A_expect_high_dilution_risk_badge', async () => {
    // Arrange / Act
    const wrapper = mountWithFormType('S-1/A')
    await nextTick()
    await nextTick()

    // Assert
    const badge = wrapper.find('.eqv4-impact-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Dilution risk')
    expect(badge.classes()).toContain('eqv4-impact-badge--high')
  })
})

// ── Exposed interface ────────────────────────────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('test_EQV4SecEdgarCard_with_card_mounted_expect_fetchFilings_exposed', () => {
    // Arrange / Act
    const wrapper = mountCard()

    // Assert
    expect(typeof wrapper.vm.fetchFilings).toBe('function')
  })

  test('test_EQV4SecEdgarCard_with_filing_having_cik_and_accession_expect_edgarIndexUrl_returns_index_htm', () => {
    // Arrange
    const wrapper = mountCard()
    const filing = { cik: '0000320193', accession_number: '0000320193-26-000079' }

    // Act
    const url = wrapper.vm.edgarIndexUrl(filing)

    // Assert — index page (text/html) rather than raw filing_url (text/plain)
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000079/0000320193-26-000079-index.htm'
    )
  })
})
