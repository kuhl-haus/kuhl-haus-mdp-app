import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EQV2CompanyCard from '../EQV2CompanyCard.vue'

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

describe('EQV2CompanyCard', () => {
  describe('Loading state', () => {
    it('renders loading message when loading=true', () => {
      // Arrange / Act
      const wrapper = mount(EQV2CompanyCard, { props: { loading: true, allNull: false, data: {}, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv2-muted-msg').text()).toContain('loading')
      expect(wrapper.find('.eqv2-kv-list').exists()).toBe(false)
    })
  })

  describe('Unavailable state', () => {
    it('renders unavailable message when allNull=true and loading=false', () => {
      // Arrange / Act
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: true, data: {}, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv2-muted-msg').text()).toContain('unavailable')
      expect(wrapper.find('.eqv2-kv-list').exists()).toBe(false)
    })
  })

  describe('Data rendering', () => {
    it('renders exchange, mkt cap, employees, listed kv rows', () => {
      // Arrange / Act
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

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
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

      // Assert
      const link = wrapper.find('.eqv2-link')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://www.apple.com/')
    })

    it('does not render web row when homepage_url is absent', () => {
      // Arrange
      const dataNoUrl = { ...SAMPLE_DATA, homepage_url: null }
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: dataNoUrl, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv2-link').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Web')
    })

    it('formats market cap with fmtVol (B suffix for billions)', () => {
      // Arrange / Act
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: SAMPLE_DATA, expanded: false } })

      // Assert: 3.2T market cap → "3200.0B" ... actually >= 1e12 would be T if supported
      // fmtVol only goes to B — 3.2T = 3200.0B
      expect(wrapper.text()).toContain('B')
    })
  })

  describe('Description truncation', () => {
    it('renders full short description without see-more button', () => {
      // Arrange
      const shortData = { ...SAMPLE_DATA, description: 'Short description.' }
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: shortData, expanded: false } })

      // Assert
      expect(wrapper.find('.eqv2-company-desc-text').text()).toContain('Short description.')
      expect(wrapper.find('.eqv2-see-more').exists()).toBe(false)
    })

    it('truncates long description and shows see-more button when expanded=false', () => {
      // Arrange / Act
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: longData, expanded: false } })

      // Assert: description truncated, see-more present
      const descText = wrapper.find('.eqv2-company-desc-text').text()
      expect(descText.length).toBeLessThan(LONG_DESC.length)
      expect(wrapper.find('.eqv2-see-more').exists()).toBe(true)
      expect(wrapper.find('.eqv2-see-more').text()).toContain('see more')
    })

    it('renders full long description when expanded=true', () => {
      // Arrange / Act
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV2CompanyCard, { props: { loading: false, allNull: false, data: longData, expanded: true } })

      // Assert: full text, less button present instead of see-more
      expect(wrapper.find('.eqv2-company-desc-text').text()).toContain(LONG_DESC)
      expect(wrapper.find('.eqv2-see-more').text()).toContain('less')
    })
  })

  describe('Expand/collapse events', () => {
    it('emits expand when see-more button is clicked', async () => {
      // Arrange
      const expandCalls = []
      const collapseCalls = []
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV2CompanyCard, {
        props: { loading: false, allNull: false, data: longData, expanded: false },
        attrs: {
          onExpand: () => expandCalls.push(true),
          onCollapse: () => collapseCalls.push(true),
        },
      })

      // Act
      await wrapper.find('.eqv2-see-more').trigger('click')

      // Assert
      expect(expandCalls.length).toBe(1)
      expect(collapseCalls.length).toBe(0)
    })

    it('emits collapse when less button is clicked', async () => {
      // Arrange
      const expandCalls = []
      const collapseCalls = []
      const longData = { ...SAMPLE_DATA, description: LONG_DESC }
      const wrapper = mount(EQV2CompanyCard, {
        props: { loading: false, allNull: false, data: longData, expanded: true },
        attrs: {
          onExpand: () => expandCalls.push(true),
          onCollapse: () => collapseCalls.push(true),
        },
      })

      // Act
      await wrapper.find('.eqv2-see-more').trigger('click')

      // Assert
      expect(collapseCalls.length).toBe(1)
      expect(expandCalls.length).toBe(0)
    })
  })
})
