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

// Multi-event sample: newest-first as returned by the API.
// META (2022) then FB (2012) — FB was the original ticker.
const SAMPLE_MULTI_EVENTS = {
  results: {
    name: 'Meta Platforms, Inc.',
    events: [
      { date: '2022-06-09', type: 'ticker_change', ticker_change: { ticker: 'META' } },
      { date: '2012-05-18', type: 'ticker_change', ticker_change: { ticker: 'FB' } },
    ],
  },
}

// Single-event sample: company has only ever had one ticker.
const SAMPLE_SINGLE_EVENT = {
  results: {
    name: 'Some Corp',
    events: [
      { date: '2015-01-01', type: 'ticker_change', ticker_change: { ticker: 'SC' } },
    ],
  },
}

const SAMPLE_EMPTY_EVENTS = {
  results: { name: 'Empty Corp', events: [] },
}

function mockEventsSuccess(data = SAMPLE_MULTI_EVENTS) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  })
}

function mockEventsError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: { name: null, events: [] } }),
  })
})

import EQV4TickerEventsCard from '../EQV4TickerEventsCard.vue'

function mountCard(props = {}) {
  return mount(EQV4TickerEventsCard, {
    props: {
      ticker: null,
      isLocked: true,
      ...props,
    },
  })
}

// ── No ticker ─────────────────────────────────────────────────────────────────

describe('No ticker state', () => {
  test('test_EQV4TickerEventsCard_with_no_ticker_expect_prompt_shown', () => {
    // Arrange / Act
    const wrapper = mountCard({ ticker: null })

    // Assert
    expect(wrapper.text()).toContain('Enter a ticker to load events')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── Fetch URL ─────────────────────────────────────────────────────────────────

describe('Fetch URL', () => {
  test('test_EQV4TickerEventsCard_with_ticker_expect_fetch_called_with_correct_url', async () => {
    // Arrange
    mockEventsSuccess()

    // Act
    mountCard({ ticker: 'META' })
    await nextTick()
    await nextTick()

    // Assert — ticker in path, apiKey as query param
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/vX/reference/tickers/META/events')
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('apiKey=test-massive-key')
    )
  })
})

// ── Multi-event rendering ─────────────────────────────────────────────────────

describe('Multi-event rendering', () => {
  test('test_EQV4TickerEventsCard_with_multi_event_data_expect_newest_first_standard_row', async () => {
    // Arrange
    mockEventsSuccess(SAMPLE_MULTI_EVENTS)

    // Act
    const wrapper = mountCard({ ticker: 'META' })
    await nextTick()
    await nextTick()

    // Assert — first row (newest): FB → META
    const rows = wrapper.findAll('.eqv4-events-row')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('FB → META')
  })

  test('test_EQV4TickerEventsCard_with_multi_event_data_expect_oldest_row_shows_original', async () => {
    // Arrange
    mockEventsSuccess(SAMPLE_MULTI_EVENTS)

    // Act
    const wrapper = mountCard({ ticker: 'META' })
    await nextTick()
    await nextTick()

    // Assert — second row (oldest, no predecessor): FB (original)
    const rows = wrapper.findAll('.eqv4-events-row')
    expect(rows[1].text()).toContain('FB (original)')
  })
})

// ── Single-event rendering ────────────────────────────────────────────────────

describe('Single-event rendering', () => {
  test('test_EQV4TickerEventsCard_with_single_event_data_expect_original_label', async () => {
    // Arrange
    mockEventsSuccess(SAMPLE_SINGLE_EVENT)

    // Act
    const wrapper = mountCard({ ticker: 'SC' })
    await nextTick()
    await nextTick()

    // Assert — the one row has no predecessor: SC (original)
    const rows = wrapper.findAll('.eqv4-events-row')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('SC (original)')
  })
})

// ── Empty events array ────────────────────────────────────────────────────────

describe('Empty events', () => {
  test('test_EQV4TickerEventsCard_with_empty_events_array_expect_no_events_state', async () => {
    // Arrange
    mockEventsSuccess(SAMPLE_EMPTY_EVENTS)

    // Act
    const wrapper = mountCard({ ticker: 'EMPTY' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.text()).toContain('No events found for EMPTY')
    expect(wrapper.findAll('.eqv4-events-row').length).toBe(0)
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('Error state', () => {
  test('test_EQV4TickerEventsCard_with_fetch_error_expect_error_state_and_retry_button', async () => {
    // Arrange
    mockEventsError(404)

    // Act
    const wrapper = mountCard({ ticker: 'UNKNOWN' })
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.find('.eqv4-events-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('HTTP 404')
    expect(wrapper.find('.eqv4-retry-btn').exists()).toBe(true)
  })
})

// ── Remove button ─────────────────────────────────────────────────────────────

describe('Remove button', () => {
  test('test_EQV4TickerEventsCard_with_isLocked_false_expect_remove_button_and_remove_emitted', async () => {
    // Arrange
    const calls = []
    const wrapper = mount(EQV4TickerEventsCard, {
      props: { ticker: null, isLocked: false },
      attrs: { onRemove: () => calls.push(true) },
    })

    // Assert — remove button visible
    expect(wrapper.find('.eqv4-events-remove').exists()).toBe(true)

    // Act
    await wrapper.find('.eqv4-events-remove').trigger('click')

    // Assert — remove emitted
    expect(calls).toHaveLength(1)
  })
})

// ── results.name subtitle ─────────────────────────────────────────────────────

describe('Entity name subtitle', () => {
  test('test_EQV4TickerEventsCard_with_results_name_expect_subtitle_shown_in_card_header', async () => {
    // Arrange
    mockEventsSuccess(SAMPLE_MULTI_EVENTS)

    // Act
    const wrapper = mountCard({ ticker: 'META' })
    await nextTick()
    await nextTick()

    // Assert — subtitle visible in header
    expect(wrapper.find('.eqv4-events-subtitle').exists()).toBe(true)
    expect(wrapper.find('.eqv4-events-subtitle').text()).toBe('Meta Platforms, Inc.')
  })
})

// ── Exposed interface ─────────────────────────────────────────────────────────

describe('Exposed interface', () => {
  test('test_EQV4TickerEventsCard_with_card_mounted_expect_fetchEvents_exposed', () => {
    // Arrange / Act
    const wrapper = mountCard()

    // Assert
    expect(typeof wrapper.vm.fetchEvents).toBe('function')
  })
})
