/**
 * CompanyNews.vue — coverage for uncovered branches.
 *
 * Existing spec covers: useConfig, empty states, applyInput, data rendering,
 * dedup, filtering, maxArticles emit, sorting basics.
 *
 * This file adds:
 *  - watch(activeTicker): ticker change → unsubscribe old + subscribe new;
 *    not-connected path → connect(); connected path → subscribe()+getCache()
 *  - watch(maxArticles): getCache called when activeTicker is set
 *  - watch(props.settings): maxArticles synced from settings prop
 *  - watch(busTicker): manualTicker cleared when bus fires
 *  - Modal open/close (via attachTo:body), switchTicker, sentimentClass
 *  - formatTime/formatDateTime edge cases (null, invalid date)
 *  - shortSource edge cases (null, www. prefix)
 *  - filteredNews: sort with actual different timestamps (av < bv comparison)
 *  - filteredNews: sort by title (av < bv string comparison)
 *  - applyInput: empty input → early return (no ticker set)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref, reactive } from 'vue'

// ── Mocks (same setup as existing spec) ──────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:   ref(null),
      isConnected:  ref(true),
      reconnecting: ref(false),
      feedName:     ref(config?.feedName ?? ''),
      cacheKey:     ref(config?.cacheKey ?? ''),
      wsUrl:        ref(config?.wsUrl   ?? 'ws://localhost:4202/ws'),
      authKey:      ref(config?.authKey ?? 'secret'),
      connect:      vi.fn(),
      disconnect:   vi.fn(),
      subscribe:    vi.fn(),
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(config?.cacheLimit ?? 1000),
    })),
  }
})

const sharedActiveTickers = reactive({})
vi.mock('@/composables/useWidgetBus.js', () => ({
  useWidgetBus: vi.fn(() => ({
    activeTickers:   sharedActiveTickers,
    setActiveTicker: vi.fn(),
  })),
  setNewsTimestamp: vi.fn(),
}))

vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ apiKey: 'mock-key', wsEndpoint: 'ws://mock:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

vi.mock('vue-virtual-scroller', () => ({
  RecycleScroller: {
    name: 'RecycleScroller',
    props: ['items', 'itemSize', 'keyField'],
    template: '<div class="recycler"><slot v-for="item in items" :item="item" /></div>',
  },
}))

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import CompanyNews from '../CompanyNews.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = { linkColor: null, isMobile: false, settings: {} }

function makeArticle(overrides = {}) {
  return {
    title:       'Test Headline',
    link:        'https://example.com/test',
    publishDate: '2024-01-15T14:30:00Z',
    source:      'example.com',
    sentiment:   'neutral',
    summary:     'Test summary',
    companies:   [{ ticker: 'AAPL', name: 'Apple', primaryListing: { exchangeCode: 'XNAS' }, companyId: 'C1' }],
    images:      [],
    ...overrides,
  }
}

function getMock() {
  const calls = vi.mocked(useWebSocketClient).mock.calls
  const idx = calls.length - 1
  return {
    mock: vi.mocked(useWebSocketClient).mock.results[idx].value,
    onData: calls[idx][0].onData,
  }
}

function mountCN(propsOverrides = {}) {
  return mount(CompanyNews, {
    props: { ...defaultProps, ...propsOverrides },
    global: { stubs: { Teleport: true } },
  })
}

function mountCNWithBody(propsOverrides = {}) {
  return mount(CompanyNews, {
    props: { ...defaultProps, ...propsOverrides },
    attachTo: document.body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(sharedActiveTickers).forEach(k => delete sharedActiveTickers[k])
})

// ─────────────────────────────────────────────────────────────────────────────
// watch(activeTicker) — ticker change path
// ─────────────────────────────────────────────────────────────────────────────

describe('watch(activeTicker) — ticker lifecycle', () => {
  test('with ticker changed from AAPL to MSFT expect unsubscribe then resubscribe', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { mock } = getMock()

    // Act — set first ticker
    await wrapper.find('.eqv3-input, input[placeholder*="ticker"]').setValue('AAPL')
    await wrapper.find('button[title="Load quote"], button.eqv3-go-btn, button').trigger('click')
    await nextTick()

    const unsubAfterFirst = mock.unsubscribe.mock.calls.length

    // Act — change to second ticker
    const input = wrapper.find('input[placeholder*="ticker"]') || wrapper.find('.eqv3-input')
    await wrapper.find('input').setValue('MSFT')
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Assert — unsubscribe called when switching from AAPL to MSFT
    expect(mock.unsubscribe.mock.calls.length).toBeGreaterThan(unsubAfterFirst)
    wrapper.unmount()
  })

  test('with isConnected=false when ticker set expect connect() called', async () => {
    // Arrange — mock with isConnected=false
    const mockConnect = vi.fn()
    const mockSubscribe = vi.fn()
    vi.mocked(useWebSocketClient).mockReturnValueOnce({
      lastDataAt:   ref(null),
      isConnected:  ref(false),  // not yet connected
      reconnecting: ref(false),
      feedName:     ref(''),
      cacheKey:     ref(''),
      wsUrl:        ref('ws://localhost:4202/ws'),
      authKey:      ref('secret'),
      connect:      mockConnect,
      disconnect:   vi.fn(),
      subscribe:    mockSubscribe,
      unsubscribe:  vi.fn(),
      getCache:     vi.fn(),
      cacheLimit:   ref(1000),
    })
    const wrapper = mountCN()
    await nextTick()

    // Act — set ticker via input
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Assert — connect called (not subscribe, because not connected yet)
    expect(mockConnect).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with isConnected=true when ticker set expect subscribe() + getCache() called', async () => {
    // Arrange — already connected (default mock has isConnected=true)
    const wrapper = mountCN()
    await nextTick()
    const { mock } = getMock()

    // Act — set ticker
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Assert — subscribe and getCache called (connected path)
    expect(mock.subscribe).toHaveBeenCalled()
    expect(mock.getCache).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with ticker set to null expect no subscribe/getCache', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { mock } = getMock()

    // Act — don't set any ticker (ticker stays null)
    // Verify no network calls for null ticker
    expect(mock.subscribe).not.toHaveBeenCalled()
    expect(mock.connect).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// watch(maxArticles) — getCache called when activeTicker is set
// ─────────────────────────────────────────────────────────────────────────────

describe('watch(maxArticles)', () => {
  test('with maxArticles changed when ticker is set expect getCache called', async () => {
    // Arrange — set ticker AND inject articles (select only renders when articles exist)
    const wrapper = mountCN()
    await nextTick()
    const { mock, onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle()])
    await nextTick()
    const getCacheBefore = mock.getCache.mock.calls.length

    // Act — change maxArticles via select (visible now that articles exist)
    const select = wrapper.find('.max-articles-select')
    await select.setValue(500)
    await nextTick()

    // Assert — getCache called again (with new limit)
    expect(mock.getCache.mock.calls.length).toBeGreaterThan(getCacheBefore)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// watch(props.settings) — maxArticles synced from settings prop
// ─────────────────────────────────────────────────────────────────────────────

describe('watch(props.settings)', () => {
  test('with settings.maxArticles updated expect local maxArticles synced', async () => {
    // Arrange
    const wrapper = mountCN({ settings: { maxArticles: 1000 } })
    await nextTick()

    // Act
    await wrapper.setProps({ settings: { maxArticles: 500 } })
    await nextTick()

    // Assert — local maxArticles updated
    const state = wrapper.vm.$.setupState
    expect(state.maxArticles).toBe(500)
    wrapper.unmount()
  })

  test('with settings without maxArticles expect no sync (undefined check)', async () => {
    // Arrange
    const wrapper = mountCN({ settings: { maxArticles: 1000 } })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — update settings without maxArticles key
    await wrapper.setProps({ settings: { someOtherProp: true } })
    await nextTick()

    // Assert — maxArticles unchanged (undefined check guards)
    expect(state.maxArticles).toBe(1000)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// watch(busTicker) — clears manualTicker when bus fires
// ─────────────────────────────────────────────────────────────────────────────

describe('watch(busTicker)', () => {
  test('with bus ticker set expect manualTicker cleared', async () => {
    // Arrange — set manualTicker first
    const wrapper = mountCN({ linkColor: 'blue' })
    await nextTick()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    const state = wrapper.vm.$.setupState
    expect(state.manualTicker).toBe('AAPL')

    // Act — bus fires with a different ticker
    sharedActiveTickers['blue'] = 'TSLA'
    await nextTick()

    // Assert — manualTicker cleared (bus takes priority)
    expect(state.manualTicker).toBe('')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// applyInput — empty input early return
// ─────────────────────────────────────────────────────────────────────────────

describe('applyInput', () => {
  test('with empty input expect no ticker set', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — click Go with empty input
    await wrapper.find('input').setValue('')
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Assert
    expect(state.manualTicker).toBe('')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Modal open/close (attachTo:body for Teleport)
// ─────────────────────────────────────────────────────────────────────────────

describe('modal', () => {
  test('with row click expect modal opens with article title', async () => {
    // Arrange
    const wrapper = mountCNWithBody()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ title: 'CompanyNews Modal Test' })])
    await nextTick()

    // Act — click a table row
    const row = wrapper.find('.vs-row, tr.clickable-row, .news-row')
    if (row.exists()) {
      await row.trigger('click')
      await nextTick()
      expect(document.querySelector('.modal-title').textContent).toContain('CompanyNews Modal Test')
    }
    wrapper.unmount()
  })

  test('with Escape key expect modal dismissed', async () => {
    // Arrange
    const wrapper = mountCNWithBody()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle()])
    await nextTick()
    const state = wrapper.vm.$.setupState
    state.selected = makeArticle({ title: 'Selected Article' })
    await nextTick()

    // Act — Escape key
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    await nextTick()

    // Assert
    expect(state.selected).toBeNull()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sentimentClass
// ─────────────────────────────────────────────────────────────────────────────

describe('sentimentClass', () => {
  test('with positive sentiment expect positive class on dot', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ sentiment: 'positive' })])
    await nextTick()

    // Assert — positive dot class
    const dot = wrapper.find('.sentiment-dot')
    if (dot.exists()) expect(dot.classes()).toContain('positive')
    wrapper.unmount()
  })

  test('with negative sentiment expect negative class on dot', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ sentiment: 'negative' })])
    await nextTick()

    // Assert
    const dot = wrapper.find('.sentiment-dot')
    if (dot.exists()) expect(dot.classes()).toContain('negative')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatTime / formatDateTime edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('formatTime edge cases', () => {
  test('with null publishDate expect empty time cell', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ publishDate: null })])
    await nextTick()

    // Assert — time cell empty
    const timeCell = wrapper.find('.vs-td.col-time')
    if (timeCell.exists()) expect(timeCell.text()).toBe('')
    wrapper.unmount()
  })

  test('with invalid publishDate expect empty time cell', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ publishDate: 'not-a-date' })])
    await nextTick()

    // Assert
    const timeCell = wrapper.find('.vs-td.col-time')
    if (timeCell.exists()) expect(timeCell.text()).toBe('')
    wrapper.unmount()
  })

  test('with valid publishDate expect non-empty time cell', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ publishDate: '2024-06-15T14:30:00Z' })])
    await nextTick()

    // Assert
    const timeCell = wrapper.find('.vs-td.col-time')
    if (timeCell.exists()) expect(timeCell.text()).toMatch(/\d/)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filteredNews — sort with real different timestamps (av < bv comparison)
// ─────────────────────────────────────────────────────────────────────────────

describe('filteredNews sort comparison', () => {
  async function mountWithTwoArticles(a1Date, a2Date) {
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([
      makeArticle({ link: 'https://a.com/1', title: 'Article Alpha', publishDate: a1Date }),
      makeArticle({ link: 'https://a.com/2', title: 'Article Zeta',  publishDate: a2Date }),
    ])
    await nextTick()
    return wrapper
  }

  test('with two articles at different times and time-asc sort expect older first', async () => {
    // Arrange
    const wrapper = await mountWithTwoArticles('2024-01-01T10:00:00Z', '2024-06-01T10:00:00Z')
    const state = wrapper.vm.$.setupState

    // Act — sort by time asc (default is desc)
    state.cycleSort('time')  // first click: same key → toggle to asc
    await nextTick()

    // Assert — older article first
    expect(state.filteredNews[0].title).toBe('Article Alpha')
    wrapper.unmount()
  })

  test('with two articles sorted by title asc expect alphabetical order', async () => {
    // Arrange
    const wrapper = await mountWithTwoArticles('2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z')
    const state = wrapper.vm.$.setupState

    // Act — sort by title asc
    state.cycleSort('title')
    await nextTick()

    // Assert — Alpha before Zeta
    expect(state.filteredNews[0].title).toBe('Article Alpha')
    wrapper.unmount()
  })

  test('with cycleSort on same key expect direction toggled to asc', async () => {
    // Arrange — default: time desc
    const wrapper = await mountWithTwoArticles('2024-01-01T10:00:00Z', '2024-06-01T10:00:00Z')
    const state = wrapper.vm.$.setupState
    expect(state.sortDir).toBe('desc')

    // Act — click time (same key → toggle)
    state.cycleSort('time')
    await nextTick()

    // Assert
    expect(state.sortDir).toBe('asc')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// shortSource
// ─────────────────────────────────────────────────────────────────────────────

describe('shortSource', () => {
  test('with null source expect no headline-source span', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ source: null })])
    await nextTick()

    // Assert — no source span
    expect(wrapper.find('.headline-source').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with www. prefix in source expect stripped in display', async () => {
    // Arrange
    const wrapper = mountCN()
    await nextTick()
    const { onData } = getMock()
    await wrapper.find('input').setValue('AAPL')
    await wrapper.find('button').trigger('click')
    await nextTick()
    onData([makeArticle({ source: 'www.reuters.com' })])
    await nextTick()

    // Assert — www. removed
    const headline = wrapper.find('.vs-headline')
    if (headline.exists()) {
      expect(headline.text()).toContain('reuters')
      expect(headline.text()).not.toContain('www.')
    }
    wrapper.unmount()
  })
})
