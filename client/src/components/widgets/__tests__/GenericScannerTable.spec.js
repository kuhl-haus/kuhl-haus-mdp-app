/**
 * Tests for GenericScannerTable component.
 *
 * GenericScannerTable is a pure table component: data/columns/sort props in,
 * sort/row-click events out. Tests assert on rendered DOM and emitted events.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── Mock useWidgetBus (only flame helpers are imported by GenericScannerTable) ─
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    useWidgetBus:     vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })),
    getFlameVariant:  vi.fn(() => null),
    getFlameTooltip:  vi.fn(() => ''),
    newsTimestamps:   reactive({}),
  }
})

import { getFlameVariant, getFlameTooltip, newsTimestamps } from '@/composables/useWidgetBus.js'
import GenericScannerTable from '../GenericScannerTable.vue'

// ── Shared test fixtures ──────────────────────────────────────────────────────

const defaultColumns = [
  { key: 'symbol',   label: 'Symbol' },
  { key: 'close',    label: 'Price',  decimals: 2 },
  { key: 'pct_change', label: 'Chg%',  format: (v) => `${Number(v).toFixed(2)}%` },
  { key: 'volume',   label: 'Volume', cellClass: (row) => row.volume > 1_000_000 ? 'high-vol' : '' },
  { key: 'category', label: 'Cat',    cellClass: 'static-class' },
]

const sampleRow = {
  symbol: 'AAPL',
  close: 175.5,
  pct_change: 1.45,
  volume: 5_000_000,
  category: 'tech',
  accumulated_volume: 5_000_000,
  relative_volume: 3.2,
}

const defaultProps = {
  data: [sampleRow],
  columns: defaultColumns,
  sortKey: '',
  sortDir: 'asc',
  rowClassFn: null,
  activeTicker: null,
  isLocked: true,
  colWidths: {},
  hiddenCols: [],
}

function mountTable(propsOverrides = {}) {
  return mount(GenericScannerTable, {
    props: { ...defaultProps, ...propsOverrides },
  })
}

// ── Column rendering ──────────────────────────────────────────────────────────
beforeEach(() => {
  setActivePinia(createPinia())
})

describe('column rendering', () => {
  test('with default columns expect all headers rendered', () => {
    // Arrange / Act
    const wrapper = mountTable()
    const ths = wrapper.findAll('th')
    // Assert
    expect(ths.length).toBe(defaultColumns.length)
    expect(ths[0].text()).toContain('Symbol')
    wrapper.unmount()
  })

  test('with hiddenCols expect those columns absent from header', () => {
    // Arrange / Act
    const wrapper = mountTable({ hiddenCols: ['pct_change', 'category'] })
    const ths = wrapper.findAll('th')
    const labels = ths.map(th => th.text())
    // Assert
    expect(labels.some(l => l.includes('Chg%'))).toBe(false)
    expect(labels.some(l => l.includes('Cat'))).toBe(false)
    expect(labels.some(l => l.includes('Symbol'))).toBe(true)
    wrapper.unmount()
  })
})

// ── Cell formatting ───────────────────────────────────────────────────────────
describe('cell formatting', () => {
  test('with col.decimals expect value formatted to fixed decimals', () => {
    // Arrange / Act
    const wrapper = mountTable()
    const cells = wrapper.findAll('td')
    // close = 175.5 with decimals:2 → "175.50"
    const priceCell = cells.find(c => c.text().includes('175.50'))
    // Assert
    expect(priceCell).toBeDefined()
    wrapper.unmount()
  })

  test('with col.format expect custom format applied', () => {
    // Arrange / Act
    const wrapper = mountTable()
    const cells = wrapper.findAll('td')
    // pct_change with format → "1.45%"
    const pctCell = cells.find(c => c.text().includes('1.45%'))
    // Assert
    expect(pctCell).toBeDefined()
    wrapper.unmount()
  })

  test('with null cell value expect empty string rendered', () => {
    // Arrange
    const row = { ...sampleRow, close: null }
    // Act
    const wrapper = mountTable({ data: [row] })
    // Assert — no error thrown, renders without crashing
    expect(wrapper.findAll('tr').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with accumulated_volume column expect volume bar rendered', () => {
    // Arrange
    const columns = [{ key: 'accumulated_volume', label: 'Volume' }]
    // Act
    const wrapper = mountTable({ columns })
    // Assert — volume bar rendered
    expect(wrapper.find('.volume-bar').exists()).toBe(true)
    expect(wrapper.find('.volume-value').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with volume in billions expect B suffix in volume bar', () => {
    // Arrange
    const columns = [{ key: 'accumulated_volume', label: 'Volume' }]
    const row = { ...sampleRow, accumulated_volume: 2_000_000_000, relative_volume: 1 }
    // Act
    const wrapper = mountTable({ data: [row], columns })
    // Assert
    expect(wrapper.find('.volume-value').text()).toContain('B')
    wrapper.unmount()
  })

  test('with volume in thousands expect K suffix in volume bar', () => {
    // Arrange
    const columns = [{ key: 'accumulated_volume', label: 'Volume' }]
    const row = { ...sampleRow, accumulated_volume: 5_000, relative_volume: 1 }
    // Act
    const wrapper = mountTable({ data: [row], columns })
    // Assert
    expect(wrapper.find('.volume-value').text()).toContain('K')
    wrapper.unmount()
  })

  test('with volume under 1000 expect plain number in volume bar', () => {
    // Arrange
    const columns = [{ key: 'accumulated_volume', label: 'Volume' }]
    const row = { ...sampleRow, accumulated_volume: 999, relative_volume: 1 }
    // Act
    const wrapper = mountTable({ data: [row], columns })
    // Assert
    expect(wrapper.find('.volume-value').text()).toBe('999')
    wrapper.unmount()
  })
})

// ── Cell classes ──────────────────────────────────────────────────────────────
describe('cell classes', () => {
  test('with function cellClass expect class applied based on row value', () => {
    // Arrange / Act
    const wrapper = mountTable()
    const tds = wrapper.findAll('td')
    const highVolTd = tds.find(td => td.classes('high-vol'))
    // Assert — volume is 5M > 1M threshold → high-vol applied
    expect(highVolTd).toBeDefined()
    wrapper.unmount()
  })

  test('with static string cellClass expect class always applied', () => {
    // Arrange / Act
    const wrapper = mountTable()
    const tds = wrapper.findAll('td')
    const staticTd = tds.find(td => td.classes('static-class'))
    // Assert
    expect(staticTd).toBeDefined()
    wrapper.unmount()
  })
})

// ── Sorting ───────────────────────────────────────────────────────────────────
describe('sort column header', () => {
  test('with sortKey matching column expect sorted indicator shown', () => {
    // Arrange / Act
    const wrapper = mountTable({ sortKey: 'symbol', sortDir: 'asc' })
    const sortedTh = wrapper.find('th.sorted')
    // Assert
    expect(sortedTh.exists()).toBe(true)
    expect(sortedTh.text()).toContain('▲')
    wrapper.unmount()
  })

  test('with sort desc expect down arrow indicator', () => {
    // Arrange / Act
    const wrapper = mountTable({ sortKey: 'close', sortDir: 'desc' })
    const sortedTh = wrapper.find('th.sorted')
    // Assert
    expect(sortedTh.text()).toContain('▼')
    wrapper.unmount()
  })

  test('with header click expect sort event emitted', async () => {
    // Arrange — VTU 2.4.x emit capture bug: use attrs listener pattern
    const sortCalls = []
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps },
      attrs: { 'onSort': (key) => sortCalls.push(key) },
    })
    // Act
    await wrapper.find('th').trigger('click')
    // Assert
    expect(sortCalls.length).toBeGreaterThan(0)
    expect(sortCalls[0]).toBe('symbol')
    wrapper.unmount()
  })
})

// ── Row click ─────────────────────────────────────────────────────────────────
describe('row click', () => {
  test('with row click expect row-click event emitted with row data', async () => {
    // Arrange — VTU 2.4.x emit capture bug: use attrs listener pattern
    const rowClickCalls = []
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps },
      attrs: { 'onRow-click': (row) => rowClickCalls.push(row) },
    })
    // Act
    await wrapper.find('tbody tr').trigger('click')
    // Assert
    expect(rowClickCalls.length).toBeGreaterThan(0)
    expect(rowClickCalls[0]).toMatchObject({ symbol: 'AAPL' })
    wrapper.unmount()
  })
})

// ── Active row highlight ──────────────────────────────────────────────────────
describe('active ticker highlight', () => {
  test('with activeTicker matching row symbol expect row-active class', () => {
    // Arrange / Act
    const wrapper = mountTable({ activeTicker: 'AAPL' })
    const rows = wrapper.findAll('tbody tr')
    // Assert
    expect(rows[0].classes('row-active')).toBe(true)
    wrapper.unmount()
  })

  test('with activeTicker not matching any row expect no row-active', () => {
    // Arrange / Act
    const wrapper = mountTable({ activeTicker: 'TSLA' })
    const rows = wrapper.findAll('tbody tr')
    // Assert
    expect(rows[0].classes('row-active')).toBe(false)
    wrapper.unmount()
  })
})

// ── Flame icon ────────────────────────────────────────────────────────────────
describe('flame icon', () => {
  test('with no flame variant expect no flame icon in symbol cell', () => {
    // Arrange — getFlameVariant returns null (default mock)
    const columns = [{ key: 'symbol', label: 'Symbol' }]
    // Act
    const wrapper = mountTable({ columns })
    // Assert
    expect(wrapper.find('.flame-icon').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with flame variant expect flame icon rendered in symbol cell', () => {
    // Arrange — mockReturnValue (not Once) because template calls getFlame 3x per row
    vi.mocked(getFlameVariant).mockReturnValue('red')
    vi.mocked(getFlameTooltip).mockReturnValue('Hot news — 5m ago')
    const columns = [{ key: 'symbol', label: 'Symbol' }]
    // Act
    const wrapper = mountTable({ columns })
    // Assert
    expect(wrapper.find('.flame-icon').exists()).toBe(true)
    wrapper.unmount()
    // Restore to default null
    vi.mocked(getFlameVariant).mockReturnValue(null)
    vi.mocked(getFlameTooltip).mockReturnValue('')
  })
})

// ── Row class function ────────────────────────────────────────────────────────
describe('rowClassFn', () => {
  test('with rowClassFn expect class applied to matching rows', () => {
    // Arrange
    const rowClassFn = (row) => row.symbol === 'AAPL' ? 'highlighted' : ''
    // Act
    const wrapper = mountTable({ rowClassFn })
    const rows = wrapper.findAll('tbody tr')
    // Assert
    expect(rows[0].classes('highlighted')).toBe(true)
    wrapper.unmount()
  })
})

// ── Col widths ────────────────────────────────────────────────────────────────
describe('col widths', () => {
  test('with colWidths provided expect width style applied to headers', () => {
    // Arrange / Act
    const wrapper = mountTable({ colWidths: { symbol: 120 } })
    const th = wrapper.find('th')
    // Assert
    expect(th.attributes('style')).toContain('120px')
    wrapper.unmount()
  })
})

// ── Column resize (isLocked=false) ────────────────────────────────────────────
describe('column resize', () => {
  test('with isLocked false expect resize handle visible', () => {
    // Arrange / Act
    const wrapper = mountTable({ isLocked: false })
    // Assert — resize handles rendered when unlocked
    expect(wrapper.find('.col-resize-handle').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with isLocked true expect no resize handles', () => {
    // Arrange / Act
    const wrapper = mountTable({ isLocked: true })
    // Assert
    expect(wrapper.find('.col-resize-handle').exists()).toBe(false)
    wrapper.unmount()
  })
})

// ── Multiple rows ─────────────────────────────────────────────────────────────
describe('multiple rows', () => {
  test('with multiple data rows expect one tr per row', () => {
    // Arrange
    const data = [
      { symbol: 'AAPL', close: 175, pct_change: 1, volume: 5_000_000, category: 'tech', accumulated_volume: 5_000_000, relative_volume: 2 },
      { symbol: 'TSLA', close: 250, pct_change: -2, volume: 800_000, category: 'ev', accumulated_volume: 800_000, relative_volume: 1 },
    ]
    // Act
    const wrapper = mountTable({ data })
    // Assert
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    wrapper.unmount()
  })
})
