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
  { filing_date: '2026-02-03', form_type: '10-K', filing_url: 'https://sec.gov/Archives/1', issuer_name: 'Apple Inc.' },
  { filing_date: '2025-11-01', form_type: '10-Q', filing_url: 'https://sec.gov/Archives/2', issuer_name: 'Apple Inc.' },
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

    // Assert — links with correct hrefs and target=_blank
    const links = wrapper.findAll('.eqv4-edgar-link')
    expect(links.length).toBe(2)
    expect(links[0].attributes('href')).toBe('https://sec.gov/Archives/1')
    expect(links[0].attributes('target')).toBe('_blank')
    expect(links[1].attributes('href')).toBe('https://sec.gov/Archives/2')
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

// ── Exposed interface ─────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('test_EQV4SecEdgarCard_with_card_mounted_expect_fetchFilings_exposed', () => {
    // Arrange / Act
    const wrapper = mountCard()

    // Assert
    expect(typeof wrapper.vm.fetchFilings).toBe('function')
  })
})
