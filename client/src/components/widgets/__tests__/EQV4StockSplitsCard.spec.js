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

const SAMPLE_SPLITS = [
  { execution_date: '2020-08-31', adjustment_type: 'forward_split', split_from: 1, split_to: 4 },
  { execution_date: '2014-06-09', adjustment_type: 'forward_split', split_from: 1, split_to: 7 },
]

function mockSplitsSuccess(results = SAMPLE_SPLITS) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  })
}

function mockSplitsError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

import EQV4StockSplitsCard from '../EQV4StockSplitsCard.vue'

function mountCard(props = {}) {
  return mount(EQV4StockSplitsCard, {
    props: {
      ticker: null,
      isLocked: true,
      ...props,
    },
  })
}

// ── No ticker ─────────────────────────────────────────────────────────────────

describe('No ticker state', () => {
  test('test_EQV4StockSplitsCard_with_no_ticker_expect_prompt_shown', () => {
    // Arrange / Act
    const wrapper = mountCard({ ticker: null })

    // Assert
    expect(wrapper.text()).toContain('Enter a ticker to load splits')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── Fetch URL ─────────────────────────────────────────────────────────────────

describe('Fetch URL', () => {
  test('test_EQV4StockSplitsCard_with_ticker_expect_fetch_called_with_correct_url', async () => {
    // Arrange
    mockSplitsSuccess()

    // Act
    mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('ticker=AAPL')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=5')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sort=execution_date.desc')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('apiKey=test-massive-key')
    )
  })
})

// ── Data rows ─────────────────────────────────────────────────────────────────

describe('Data rows', () => {
  test('test_EQV4StockSplitsCard_with_splits_data_expect_rows_with_date_type_ratio', async () => {
    // Arrange
    mockSplitsSuccess([
      { execution_date: '2020-08-31', adjustment_type: 'forward_split', split_from: 1, split_to: 4 },
      { execution_date: '2014-06-09', adjustment_type: 'reverse_split', split_from: 4, split_to: 1 },
      { execution_date: '2010-01-01', adjustment_type: 'stock_dividend', split_from: 1, split_to: 2 },
    ])

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert — humanized types
    expect(wrapper.text()).toContain('2020-08-31')
    expect(wrapper.text()).toContain('Forward')
    expect(wrapper.text()).toContain('4:1')
    expect(wrapper.text()).toContain('2014-06-09')
    expect(wrapper.text()).toContain('Reverse')
    expect(wrapper.text()).toContain('1:4')
    expect(wrapper.text()).toContain('Stock Div')
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('Error state', () => {
  test('test_EQV4StockSplitsCard_with_fetch_error_expect_error_state_and_retry_button', async () => {
    // Arrange
    mockSplitsError(500)

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-splits-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('HTTP 500')
    expect(wrapper.find('.eqv4-retry-btn').exists()).toBe(true)
  })
})

// ── Loading spinner ───────────────────────────────────────────────────────────

describe('Loading state', () => {
  test('test_EQV4StockSplitsCard_with_loading_expect_spinner_shown', async () => {
    // Arrange — fetch that never resolves so loading stays true
    let resolveFetch
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve })
    )

    // Act
    const wrapper = mountCard({ ticker: 'AAPL' })
    await nextTick()

    // Assert — loading state with spinner
    expect(wrapper.find('.eqv4-splits-spinner').exists()).toBe(true)

    // Cleanup
    resolveFetch({ ok: true, json: async () => ({ results: [] }) })
  })
})

// ── Remove button ─────────────────────────────────────────────────────────────

describe('Remove button', () => {
  test('test_EQV4StockSplitsCard_with_isLocked_false_expect_remove_button_and_remove_emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4StockSplitsCard, {
      props: { ticker: null, isLocked: false },
      attrs: { onRemove: () => calls.push(true) },
    })

    // Assert — remove button visible
    expect(wrapper.find('.eqv4-splits-remove').exists()).toBe(true)

    // Act
    await wrapper.find('.eqv4-splits-remove').trigger('click')

    // Assert — remove emitted
    expect(calls).toHaveLength(1)
  })
})

// ── Exposed interface ─────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('test_EQV4StockSplitsCard_with_card_mounted_expect_fetchSplits_exposed', () => {
    // Arrange / Act
    const wrapper = mountCard()

    // Assert
    expect(typeof wrapper.vm.fetchSplits).toBe('function')
  })
})
