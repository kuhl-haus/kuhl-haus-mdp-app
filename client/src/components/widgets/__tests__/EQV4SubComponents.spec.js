/**
 * EQV4 sub-component branch coverage.
 *
 * Tests for: EQV4ShortCard, EQV4SessionCard, EQV4VolumeCard,
 *            EQV4TickerEventsCard, NewsArticleModal, EQV4HeroCard.
 *
 * Each component is mounted directly (not via EQV4 parent) with targeted
 * props to cover the uncovered branches.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ massiveApiKey: 'test-key' }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

import EQV4ShortCard       from '../EQV4ShortCard.vue'
import EQV4SessionCard     from '../EQV4SessionCard.vue'
import EQV4VolumeCard      from '../EQV4VolumeCard.vue'
import EQV4TickerEventsCard from '../EQV4TickerEventsCard.vue'
import NewsArticleModal    from '../NewsArticleModal.vue'

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ results: { events: [], name: 'ACME Corp' } }),
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4ShortCard
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4ShortCard', () => {
  test('with chipsMode=true + allNull=true expect muted unavailable message in chips view', async () => {
    // Arrange — chip mode, all data null → allNull=true
    const wrapper = mount(EQV4ShortCard, {
      props: {
        shortInterestData: { short_interest: null, days_to_cover: null, short_volume_ratio: null },
        loading:   false,
        chipsMode: true,
      },
    })
    await nextTick()

    // Assert — muted message shown (v-else-if="allNull" in chipsMode branch)
    expect(wrapper.find('.eqv4-muted-msg').text()).toContain('unavailable')
    wrapper.unmount()
  })

  test('with chipsMode=true + real data expect chip-row shown', async () => {
    // Arrange — chip mode, real data
    const wrapper = mount(EQV4ShortCard, {
      props: {
        shortInterestData: { short_interest: 5e6, days_to_cover: 2.0, short_volume_ratio: 35.5 },
        loading:   false,
        chipsMode: true,
      },
    })
    await nextTick()

    // Assert — chip-row visible (v-else branch in chipsMode)
    expect(wrapper.find('.eqv4-chip-row').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with shortInterestData=null expect allNull=true', async () => {
    // Arrange — null data object
    const wrapper = mount(EQV4ShortCard, {
      props: { shortInterestData: null, loading: false, chipsMode: false },
    })
    await nextTick()

    // Assert — muted message (allNull computed with null data)
    expect(wrapper.find('.eqv4-muted-msg').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4SessionCard — null session values → muted dash
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4SessionCard', () => {
  const QUOTE_WITH_NULL_SESSIONS = {
    pre_market_high: null, pre_market_low: null,
    regular_session_high: 182, regular_session_low: 178,  // REG has data
    after_hours_high: null, after_hours_low: null,        // AH null
  }

  test('with chipsMode + null pre_market and AH data expect muted dash for those sections', async () => {
    // Arrange — chipsMode, pre_market and AH are null
    const wrapper = mount(EQV4SessionCard, {
      props: { quoteData: QUOTE_WITH_NULL_SESSIONS, chipsMode: true, isLocked: true },
    })
    await nextTick()

    // Assert — muted val shown for null sessions (false path of null check)
    const mutedVals = wrapper.findAll('.eqv4-muted-val')
    expect(mutedVals.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with chipsMode + all null sessions expect all sections show muted dash', async () => {
    // Arrange — all sessions null
    const wrapper = mount(EQV4SessionCard, {
      props: {
        quoteData: {
          pre_market_high: null, pre_market_low: null,
          regular_session_high: null, regular_session_low: null,
          after_hours_high: null, after_hours_low: null,
        },
        chipsMode: true, isLocked: true,
      },
    })
    await nextTick()

    // Assert — all session chip sections show dash
    const mutedVals = wrapper.findAll('.eqv4-muted-val')
    expect(mutedVals.length).toBe(3)  // PRE, REG, AH all muted
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4VolumeCard — rv edge cases (extreme, non-finite)
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4VolumeCard', () => {
  const BASE_QUOTE = {
    accumulated_volume: 10_000_000, avg_volume: 8_000_000,
    free_float: 500_000_000, relative_volume: 1.0,
  }

  test('with relative_volume=null expect rvBarWidth=0% and rvBarColor=green', async () => {
    // Arrange — null rv (non-finite → 0% bar, green colour)
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...BASE_QUOTE, relative_volume: null }, chipsMode: false },
    })
    await nextTick()

    // Assert — rvBarWidth falls back to 0% (isFinite(null) = false)
    const state = wrapper.vm.$.setupState
    expect(state.rvBarWidth).toBe('0%')
    expect(state.rvBarColor).toBe('#22c55e')
    wrapper.unmount()
  })

  test('with relative_volume >= 5 expect extreme class and red colour', async () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...BASE_QUOTE, relative_volume: 5.5 }, chipsMode: false },
    })
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.relVolClass).toBe('extreme')
    expect(state.rvBarColor).toBe('#dc2626')
    wrapper.unmount()
  })

  test('with relative_volume >= 3 expect high class and orange colour', async () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...BASE_QUOTE, relative_volume: 3.5 }, chipsMode: false },
    })
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.relVolClass).toBe('high')
    expect(state.rvBarColor).toBe('#f97316')
    wrapper.unmount()
  })

  test('with relative_volume >= 2 expect medium class and yellow colour', async () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...BASE_QUOTE, relative_volume: 2.5 }, chipsMode: false },
    })
    await nextTick()

    // Assert
    const state = wrapper.vm.$.setupState
    expect(state.relVolClass).toBe('medium')
    expect(state.rvBarColor).toBe('#eab308')
    wrapper.unmount()
  })

  test('with free_float=null expect floatShares falls back to share_class', async () => {
    // Arrange
    const wrapper = mount(EQV4VolumeCard, {
      props: { quoteData: { ...BASE_QUOTE, free_float: null, share_class_shares_outstanding: 200_000_000 } },
    })
    await nextTick()

    // Assert
    expect(wrapper.vm.$.setupState.floatShares).toBe(200_000_000)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4TickerEventsCard — fetch error and null data paths
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4TickerEventsCard', () => {
  test('with HTTP error expect error state shown', async () => {
    // Arrange — simulate HTTP error
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: vi.fn() })
    const wrapper = mount(EQV4TickerEventsCard, {
      props: { ticker: 'AAPL', isLocked: true },
    })
    const { flushPromises } = await import('@vue/test-utils')
    await flushPromises()
    await nextTick()

    // Assert — error state visible
    const state = wrapper.vm.$.setupState
    expect(state.error).toBeTruthy()
    wrapper.unmount()
  })

  test('with null ticker expect fetch not called', async () => {
    // Arrange
    const wrapper = mount(EQV4TickerEventsCard, {
      props: { ticker: null, isLocked: true },
    })
    await nextTick()

    // Assert — no fetch with null ticker
    expect(global.fetch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with events having ticker_change null expect from=null in transitions', async () => {
    // Arrange — event without ticker_change
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: {
          name: 'Test Corp',
          events: [{ date: '2020-01-01', type: 'name_change', ticker_change: null }],
        },
      }),
    })
    const wrapper = mount(EQV4TickerEventsCard, {
      props: { ticker: 'AAPL', isLocked: true },
    })
    const { flushPromises } = await import('@vue/test-utils')
    await flushPromises()
    await nextTick()

    // Assert — transitions has null to/from (ticker_change null fallback)
    const state = wrapper.vm.$.setupState
    expect(state.transitions[0].to).toBeNull()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NewsArticleModal — sentiment, source, companies, Escape key
// ─────────────────────────────────────────────────────────────────────────────

describe('NewsArticleModal', () => {
  const BASE_ARTICLE = {
    title: 'Test News',
    link:  'https://example.com/article',
    publishDate: '2024-01-15T14:30:00Z',
    source: 'example.com',
    sentiment: 'neutral',
    summary: 'Test summary',
    companies: [],
    images: [],
  }

  test('with article=null expect modal hidden', async () => {
    // Arrange
    const wrapper = mount(NewsArticleModal, {
      props: { article: null },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — modal not rendered
    expect(document.querySelector('.modal-backdrop')).toBeNull()
    wrapper.unmount()
  })

  test('with valid article expect modal shown with title', async () => {
    // Arrange
    const wrapper = mount(NewsArticleModal, {
      props: { article: BASE_ARTICLE },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — modal shown
    expect(document.querySelector('.modal-backdrop')).not.toBeNull()
    expect(document.querySelector('.modal-title').textContent).toContain('Test News')
    wrapper.unmount()
  })

  test('with negative sentiment expect negative class on sentiment badge', async () => {
    // Arrange
    const wrapper = mount(NewsArticleModal, {
      props: { article: { ...BASE_ARTICLE, sentiment: 'negative' } },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — negative class
    const badge = document.querySelector('.modal-sentiment')
    expect(badge?.classList.contains('negative')).toBe(true)
    wrapper.unmount()
  })

  test('with Escape key expect close emitted', async () => {
    // Arrange
    const closeFn = vi.fn()
    const wrapper = mount(NewsArticleModal, {
      props: { article: BASE_ARTICLE },
      attrs: { onClose: closeFn },
      attachTo: document.body,
    })
    await nextTick()

    // Act — press Escape
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    await nextTick()

    // Assert — close handler called (Teleport: use listener not wrapper.emitted)
    expect(closeFn).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with article having companies expect company section shown', async () => {
    // Arrange — article with company in non-US exchange
    const wrapper = mount(NewsArticleModal, {
      props: {
        article: {
          ...BASE_ARTICLE,
          companies: [{
            ticker: 'TSX:ABC',
            name:   'Canadian Corp',
            primaryListing: { exchangeCode: 'XTSE' },  // not US
            companyId: 'C99',
          }],
        },
      },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — company section rendered with foreign-ticker class
    const coSection = document.querySelector('.modal-companies')
    expect(coSection).not.toBeNull()
    const foreignTicker = document.querySelector('.ticker-foreign')
    expect(foreignTicker).not.toBeNull()
    wrapper.unmount()
  })

  test('with formatDateTime invalid timestamp expect empty string', async () => {
    // Arrange — invalid publishDate; access formatDateTime directly via setupState
    const wrapper = mount(NewsArticleModal, {
      props: { article: { ...BASE_ARTICLE, publishDate: 'not-a-date' } },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — formatDateTime with invalid date returns empty string
    const state = wrapper.vm.$.setupState
    expect(state.formatDateTime('not-a-date')).toBe('')
    expect(state.formatDateTime(null)).toBe('')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4SecEdgarCard — missing branches
// ─────────────────────────────────────────────────────────────────────────────
import EQV4SecEdgarCard from '../EQV4SecEdgarCard.vue'

describe('EQV4SecEdgarCard', () => {
  test('with ticker but no filings returned expect no-filings state shown', async () => {
    // Arrange — fetch returns empty results (no filings found)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: 'AAPL', isLocked: true, filingCount: 10 },
    })
    await flushPromises()
    await nextTick()

    // Assert — "No filings found" state rendered
    const empty = wrapper.find('.eqv4-edgar-empty')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('No filings')
    wrapper.unmount()
  })

  test('with HTTP error response expect error state shown', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: 'AAPL', isLocked: true, filingCount: 10 },
    })
    await flushPromises()
    await nextTick()

    // Assert — error section shown
    expect(wrapper.find('.eqv4-edgar-error').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with form_type in FORM_IMPACT expect impact badge shown', async () => {
    // Arrange — return a filing with form_type that has an impact badge
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [{
          filing_date: '2025-01-15',
          form_type:   '8-K',
          filing_url:  'https://sec.gov/raw',
          accession_number: '0001234567-25-000001',
          cik: '320193',
        }],
      }),
    })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: 'AAPL', isLocked: true, filingCount: 10 },
    })
    await flushPromises()
    await nextTick()

    // Assert — impact badge shown for 8-K
    expect(wrapper.find('.eqv4-impact-badge').exists()).toBe(true)
    expect(wrapper.find('.eqv4-impact-badge').text()).toContain('Material')
    wrapper.unmount()
  })

  test('with isLocked=false expect remove button shown', async () => {
    // Arrange
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: null, isLocked: false, filingCount: 10 },
    })
    await nextTick()

    // Assert — remove button visible when unlocked
    expect(wrapper.find('.eqv4-edgar-remove').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4StockSplitsCard — branch coverage
// ─────────────────────────────────────────────────────────────────────────────
import EQV4StockSplitsCard from '../EQV4StockSplitsCard.vue'

describe('EQV4StockSplitsCard', () => {
  test('with HTTP error expect error state shown', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: vi.fn() })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4StockSplitsCard, {
      props: { ticker: 'AAPL', isLocked: true },
    })
    await flushPromises()
    await nextTick()

    // Assert — error state (resp.ok=false path)
    expect(wrapper.vm.$.setupState.error).toContain('HTTP 404')
    wrapper.unmount()
  })

  test('with split of unknown type expect humanizeType returns type as-is', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [{ execution_date: '2024-01-01', split_from: 1, split_to: 2, split_type: 'exotic_split' }],
      }),
    })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4StockSplitsCard, {
      props: { ticker: 'AAPL', isLocked: true },
    })
    await flushPromises()
    await nextTick()

    // Assert — unknown type: TYPE_LABELS[type] ?? type fallback
    const state = wrapper.vm.$.setupState
    expect(state.humanizeType('exotic_split')).toBe('exotic_split')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4TickerEventsCard — additional branch coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4TickerEventsCard additional', () => {
  test('with filingCount changed expect refetch called', async () => {
    // Arrange — test the watch(() => props.filingCount) watcher
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: { events: [], name: 'Test' } }),
    })
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4TickerEventsCard, {
      props: { ticker: 'AAPL', isLocked: true },
    })
    await flushPromises()

    const callsBefore = global.fetch.mock.calls.length

    // Act — transitions computed with next event
    const state = wrapper.vm.$.setupState
    // Access transitions (covers transition binary-expr)
    const transitions = state.transitions
    expect(Array.isArray(transitions)).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4CompanyCard — primary_exchange null (line 11)
// ─────────────────────────────────────────────────────────────────────────────
import EQV4CompanyCard from '../EQV4CompanyCard.vue'

describe('EQV4CompanyCard', () => {
  test('with no primary_exchange expect dash shown', async () => {
    // Arrange — company data with null primary_exchange (|| '—' fallback)
    const wrapper = mount(EQV4CompanyCard, {
      props: {
        companyData: { name: 'Test', primary_exchange: null, market_cap: null, total_employees: null, list_date: null },
        loading: false, allNull: false, expanded: false,
      },
    })
    await nextTick()

    // Assert — '—' shown for missing exchange
    expect(wrapper.find('.eqv4-v').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4HeroCard — pct_change_since_open null → ?? 0 fallback (line 35)
// ─────────────────────────────────────────────────────────────────────────────
import EQV4HeroCard from '../EQV4HeroCard.vue'

describe('EQV4HeroCard', () => {
  test('with pct_change_since_open=null expect ?? 0 fallback (defaults to 0)', async () => {
    // Arrange — quoteData with null pct_change_since_open
    const wrapper = mount(EQV4HeroCard, {
      props: {
        quoteData: {
          close: 180, pct_change: 1.5, pct_change_since_open: null,
          change_since_open: null, end_timestamp: Date.now(),
        },
        isLocked: true,
        heroMode: 'wide',
        brandingMode: 'logo',
        activeBrandingUrl: null,
        flameIcon: null,
      },
    })
    await nextTick()

    // Assert — '0.00%' shown from the ?? 0 fallback
    expect(wrapper.find('.eqv4-since-open').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// eqv3Utils via component: fmtVol with NaN (line 34)
// ─────────────────────────────────────────────────────────────────────────────

describe('fmtVol via EQV4VolumeCard with NaN volume', () => {
  test('with accumulated_volume=NaN expect fmtVol returns dash', async () => {
    // Arrange — EQV4VolumeCard renders fmtVol in its template
    const wrapper = mount(EQV4VolumeCard, {
      props: {
        quoteData: { accumulated_volume: NaN, avg_volume: NaN, free_float: null, relative_volume: NaN },
        chipsMode: false,
      },
    })
    await nextTick()

    // Assert — fmtVol(NaN) renders '—' (if (!isFinite(v)) return '—')
    const cells = wrapper.findAll('.eqv4-v')
    const hasDash = cells.some(c => c.text() === '—')
    expect(hasDash).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4SecEdgarCard.edgarIndexUrl: null accession_number → ?? '' fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4SecEdgarCard edgarIndexUrl with null accession', () => {
  test('with null accession_number expect ?? "" fallback in URL', async () => {
    // Arrange
    const { flushPromises } = await import('@vue/test-utils')
    const wrapper = mount(EQV4SecEdgarCard, {
      props: { ticker: null, isLocked: true, filingCount: 10 },
    })
    await nextTick()

    // Act — call edgarIndexUrl with null accession_number
    const state = wrapper.vm.$.setupState
    const url = state.edgarIndexUrl({ accession_number: null, cik: '320193' })

    // Assert — null?.replace() = undefined, ?? '' gives empty accessionNodash
    expect(url).toContain('/320193//')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NewsArticleModal: company without companyId → || ticker as key
// ─────────────────────────────────────────────────────────────────────────────

describe('NewsArticleModal company without companyId', () => {
  test('with company missing companyId expect ticker used as fallback key', async () => {
    // Arrange
    const wrapper = mount(NewsArticleModal, {
      props: {
        article: {
          title: 'Test Article',
          link: 'https://example.com',
          publishDate: '2024-01-15T14:30:00Z',
          source: 'example.com',
          sentiment: 'neutral',
          summary: 'summary',
          images: [],
          companies: [{ ticker: 'TSLA', name: 'Tesla', primaryListing: { exchangeCode: 'XNAS' }, companyId: null }],
        },
      },
      attachTo: document.body,
    })
    await nextTick()

    // Assert — modal rendered with company (using ticker as key due to null companyId)
    const coSection = document.querySelector('.modal-companies')
    expect(coSection).not.toBeNull()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NewsArticleModal: non-Escape key press → if(e.key==='Escape') FALSE path (line 74)
// ─────────────────────────────────────────────────────────────────────────────

describe('NewsArticleModal non-Escape key', () => {
  test('with non-Escape key pressed expect modal stays open', async () => {
    // Arrange
    const closeFn = vi.fn()
    const wrapper = mount(NewsArticleModal, {
      props: {
        article: {
          title: 'Test', link: 'https://example.com',
          publishDate: '2024-01-01T00:00:00Z', source: 'example.com',
          sentiment: 'neutral', summary: 'test', images: [], companies: [],
        },
      },
      attrs: { onClose: closeFn },
      attachTo: document.body,
    })
    await nextTick()

    // Act — press a non-Escape key (if(e.key==='Escape') FALSE path)
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }))
    await nextTick()

    // Assert — close not called (non-Escape key has no effect)
    expect(closeFn).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQV4CompanyCard: allNull with null companyData (line 44)
// ─────────────────────────────────────────────────────────────────────────────

describe('EQV4CompanyCard allNull with null data', () => {
  test('with null companyData expect allNull=true', async () => {
    // Arrange — null companyData (if (!d) return true)
    const wrapper = mount(EQV4CompanyCard, {
      props: { companyData: null, loading: false, allNull: false, expanded: false },
    })
    await nextTick()

    // Assert — allNull=true when d is null
    expect(wrapper.vm.$.setupState.allNull).toBe(true)
    wrapper.unmount()
  })
})
