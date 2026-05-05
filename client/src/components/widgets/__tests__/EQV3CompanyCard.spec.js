import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EQV3CompanyCard from '../EQV3CompanyCard.vue'

// Sample company data for tests
const SAMPLE_DATA = {
  homepage_url: 'https://www.apple.com/',
  primary_exchange: 'NASDAQ',
  market_cap: 3_200_000_000_000,
  total_employees: 161_000,
  list_date: '1980-12-12',
  description: 'Apple Inc. designs, manufactures, and markets smartphones and personal computers.',
}

// Description that exceeds the 175-char truncation limit
const LONG_DESC = 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. The Company sells a variety of related services. Products include iPhone, Mac, iPad, and accessories.'

describe('EQV3CompanyCard', () => {
  describe('Loading state', () => {
    it('renders loading message when loading=true', () => {
      // Arrange / Act
      const wrapper = mount(EQV3CompanyCard, { props: { loading: true, allNull: false, data: {}, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv3-muted-msg').text()).toContain('loading')
      expect(wrapper.find('.eqv3-kv-list').exists()).toBe(false)
    })
  })

  describe('Unavailable state', () => {
    it('renders unavailable message when allNull=true and loading=false', () => {
      // Arrange / Act
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: true, data: {}, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv3-muted-msg').text()).toContain('unavailable')
      expect(wrapper.find('.eqv3-kv-list').exists()).toBe(false)
    })
  })

  describe('Data rendering', () => {
    it('renders exchange, mkt cap, employees, listed kv rows', () => {
      // Arrange / Act
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

      // Assert
      const text = wrapper.text()
      expect(text).toContain('NASDAQ')
      expect(text).toContain('Exchange')
      expect(text).toContain('Mkt Cap')
      expect(text).toContain('Employees')
      expect(text).toContain('Listed')
      expect(text).toContain('1980-12-12')
    })

    it('renders homepage_url as a web link when present', () => {
      // Arrange / Act
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

      // Assert
      const link = wrapper.find('.eqv3-link')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://www.apple.com/')
    })

    it('does not render web row when homepage_url is absent', () => {
      // Arrange
      const dataNoUrl = { ...SAMPLE_DATA, homepage_url: null }
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: dataNoUrl, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv3-link').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Web')
    })

    it('formats market cap with fmtVol (3.2T input → 3200.0B)', () => {
      // Arrange / Act
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

      // Assert: fmtVol has no T suffix — 3.2T (3_200_000_000_000) → 3200.0B
      expect(wrapper.text()).toContain('3200.0B')
    })
  })

  describe('Description truncation', () => {
    it('renders full short description without see-more button', () => {
      // Arrange
      const shortData = { ...SAMPLE_DATA, description: 'Short description.' }
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: shortData, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv3-company-desc-text').text()).toContain('Short description.')
      expect(wrapper.find('.eqv3-see-more').exists()).toBe(false)
    })

    it('truncates long description and shows see-more button when expanded=false', () => {
      // Arrange / Act
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: longData, expanded: false } })

      // Assert: description truncated, see-more present
      const descText = wrapper.find('.eqv3-company-desc-text').text()
      expect(descText.length).toBeLessThan(LONG_DESC.length)
      expect(wrapper.find('.eqv3-see-more').exists()).toBe(true)
      expect(wrapper.find('.eqv3-see-more').text()).toContain('see more')
    })

    it('renders full long description when expanded=true', () => {
      // Arrange / Act
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV3CompanyCard, { props: { loading: false, allNull: false, data: longData, expanded: true } })

      // Assert: full text, less button present instead of see-more
      expect(wrapper.find('.eqv3-company-desc-text').text()).toContain(LONG_DESC)
      expect(wrapper.find('.eqv3-see-more').text()).toContain('less')
    })
  })

  describe('Expand/collapse events', () => {
    // Note: wrapper.emitted() does not capture Vue emissions from <script setup>
    // components in VTU 2.4.x / jsdom. The attrs listener pattern is intentional —
    // same approach used in EnhancedQuoteV3.spec.js for update-settings.
    it('emits expand when see-more button is clicked', async () => {
      // Arrange
      const expandCalls = []
      const collapseCalls = []
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV3CompanyCard, {
        props: { loading: false, allNull: false, data: longData, expanded: false },
        attrs: {
          onExpand: () => expandCalls.push(true),
          onCollapse: () => collapseCalls.push(true),
        },
      })

      // Act
      await wrapper.find('.eqv3-see-more').trigger('click')

      // Assert
      expect(expandCalls.length).toBe(1)
      expect(collapseCalls.length).toBe(0)
    })

    it('emits collapse when less button is clicked', async () => {
      // Arrange
      const expandCalls = []
      const collapseCalls = []
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV3CompanyCard, {
        props: { loading: false, allNull: false, data: longData, expanded: true },
        attrs: {
          onExpand: () => expandCalls.push(true),
          onCollapse: () => collapseCalls.push(true),
        },
      })

      // Act
      await wrapper.find('.eqv3-see-more').trigger('click')

      // Assert
      expect(collapseCalls.length).toBe(1)
      expect(expandCalls.length).toBe(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// eqv3Utils branch coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('eqv3Utils edge cases', () => {
  test('with truncateUrl(null) expect empty string', async () => {
    // Arrange — call truncateUrl with null (if (!url) return '' guard)
    const { truncateUrl } = await import('../eqv3Utils.js')
    expect(truncateUrl(null)).toBe('')
    expect(truncateUrl(undefined)).toBe('')
    expect(truncateUrl('')).toBe('')
  })

  test('with fmtVol(NaN) expect dash', async () => {
    // Arrange — call fmtVol with non-finite (if (!isFinite(v)) return '—')
    const { fmtVol } = await import('../eqv3Utils.js')
    expect(fmtVol(NaN)).toBe('—')
    expect(fmtVol(null)).toBe('—')
    expect(fmtVol(undefined)).toBe('—')
  })
})
