import { describe, test, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NewsArticleModal from '../NewsArticleModal.vue'

// NewsArticleModal uses Teleport to="body" — content renders in document.body,
// not inside the wrapper's element. Use document.querySelector for assertions.
const q  = (sel) => document.querySelector(sel)
const qa = (sel) => [...document.querySelectorAll(sel)]

let _wrapper = null
afterEach(() => { _wrapper?.unmount(); _wrapper = null })

function mountModal(props = {}) {
  _wrapper = mount(NewsArticleModal, { props, attachTo: document.body })
  return _wrapper
}

const ARTICLE = {
  link: 'https://example.com/article',
  source: 'www.reuters.com',
  title: 'Apple beats earnings estimates',
  summary: 'Apple reported strong Q2 results.',
  publishDate: '2026-04-16T12:00:00Z',
  sentiment: 'positive',
  confidence: 0.95,
  images: ['https://example.com/img.jpg'],
  companies: [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      companyId: 1,
      primaryListing: { exchangeCode: 'XNAS', exchangeCountry: 'US' },
    },
    {
      ticker: 'AAPL.L',
      name: 'Apple Inc. (London)',
      companyId: 2,
      primaryListing: { exchangeCode: 'XLON', exchangeCountry: 'GB' },
    },
  ],
}

// ── Hidden when article is null ───────────────────────────────────────────────

describe('Visibility', () => {
  test('with article null expect modal not rendered', () => {
    // Arrange / Act
    mountModal({ article: null })

    // Assert
    expect(q('.modal-backdrop')).toBeNull()
  })

  test('with article set expect modal rendered', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert
    expect(q('.modal-backdrop')).not.toBeNull()
  })
})

// ── Content ───────────────────────────────────────────────────────────────────

describe('Content', () => {
  test('with article set expect title rendered', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert
    expect(document.body.textContent).toContain('Apple beats earnings estimates')
  })

  test('with article set expect summary rendered', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert
    expect(document.body.textContent).toContain('Apple reported strong Q2 results.')
  })

  test('with article set expect publishDate formatted and shown', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert — date is formatted (not the raw ISO string)
    const timeEl = q('.modal-time')
    expect(timeEl.textContent).not.toBe('')
    expect(timeEl.textContent).not.toContain('T12:00:00Z')
  })

  test('with null publishDate expect modal-time shows empty string', () => {
    // Arrange / Act
    mountModal({ article: { ...ARTICLE, publishDate: null } })

    // Assert
    expect(q('.modal-time').textContent).toBe('')
  })

  test('with source set expect source link rendered', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert
    const link = q('.modal-source')
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toContain('reuters.com')
  })

  test('with source null expect no source link rendered', () => {
    // Arrange / Act
    mountModal({ article: { ...ARTICLE, source: null } })

    // Assert — v-if removes the link entirely
    expect(q('.modal-source')).toBeNull()
  })
})

// ── Sentiment ─────────────────────────────────────────────────────────────────

describe('Sentiment', () => {
  test('with positive sentiment expect positive class applied', () => {
    // Arrange / Act
    mountModal({ article: { ...ARTICLE, sentiment: 'positive' } })

    // Assert
    expect(q('.modal-sentiment.positive')).not.toBeNull()
  })

  test('with negative sentiment expect negative class applied', () => {
    // Arrange / Act
    mountModal({ article: { ...ARTICLE, sentiment: 'negative' } })

    // Assert
    expect(q('.modal-sentiment.negative')).not.toBeNull()
  })

  test('with neutral sentiment expect neutral class applied', () => {
    // Arrange / Act
    mountModal({ article: { ...ARTICLE, sentiment: 'neutral' } })

    // Assert
    expect(q('.modal-sentiment.neutral')).not.toBeNull()
  })
})

// ── Companies / tickers ───────────────────────────────────────────────────────

describe('Companies', () => {
  test('with US company expect ticker-tag rendered without foreign class', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert — AAPL is US (XNAS)
    const tags = qa('.ticker-tag')
    const aaplTag = tags.find(t => t.textContent === 'AAPL')
    expect(aaplTag).toBeDefined()
    expect(aaplTag.classList.contains('ticker-foreign')).toBe(false)
  })

  test('with foreign company expect ticker-tag with ticker-foreign class', () => {
    // Arrange / Act
    mountModal({ article: ARTICLE })

    // Assert — AAPL.L is foreign (XLON)
    const tags = qa('.ticker-tag')
    const foreignTag = tags.find(t => t.textContent === 'AAPL.L')
    expect(foreignTag).toBeDefined()
    expect(foreignTag.classList.contains('ticker-foreign')).toBe(true)
  })
})

// ── Close events ──────────────────────────────────────────────────────────────

describe('Close events', () => {
  test('with X button click expect close emitted', async () => {
    // Arrange — VTU 2.4.x + <script setup>: capture emits via attrs onClose callback
    const calls = []
    _wrapper = mount(NewsArticleModal, {
      props: { article: ARTICLE },
      attrs: { onClose: () => calls.push(true) },
      attachTo: document.body,
    })

    // Act
    q('.modal-close').click()
    await nextTick()

    // Assert
    expect(calls).toHaveLength(1)
  })

  test('with backdrop click expect close emitted', async () => {
    // Arrange
    const calls = []
    _wrapper = mount(NewsArticleModal, {
      props: { article: ARTICLE },
      attrs: { onClose: () => calls.push(true) },
      attachTo: document.body,
    })

    // Act — @click.self on backdrop: fire a click whose target IS the backdrop
    q('.modal-backdrop').click()
    await nextTick()

    // Assert
    expect(calls).toHaveLength(1)
  })

  test('with Escape key expect close emitted', async () => {
    // Arrange
    const calls = []
    _wrapper = mount(NewsArticleModal, {
      props: { article: ARTICLE },
      attrs: { onClose: () => calls.push(true) },
      attachTo: document.body,
    })

    // Act
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    await nextTick()

    // Assert
    expect(calls).toHaveLength(1)
  })
})
