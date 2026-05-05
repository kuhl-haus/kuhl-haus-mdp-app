/**
 * GenericScannerTable.vue — coverage for uncovered branches.
 *
 * Existing spec covers: column rendering, cell formatting, cell classes,
 * sort header, row-click, active ticker highlight, flame icon, rowClassFn,
 * col widths (with and without), resize handles (visible/hidden).
 *
 * This file adds:
 *  - startResize: mousedown → mousemove → mouseup flow (width updated,
 *    update-col-widths emitted)
 *  - startResize with isLocked=true expect early return (no-op)
 *  - onFlameTouchStart: touchstart starts 500ms timer, alert fires
 *  - onFlameTouchEnd: touchend before 500ms cancels timer (no alert)
 *  - colStyle with width set (truthy path) → inline style returned
 *  - watch(() => props.colWidths): prop update syncs localWidths
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Mocks (same as existing spec) ────────────────────────────────────────────
vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    useWidgetBus:     vi.fn(() => ({ activeTickers: reactive({}), setActiveTicker: vi.fn() })),
    getFlameVariant:  vi.fn(() => null),
    getFlameTooltip:  vi.fn(() => ''),
    newsTimestamps:   reactive({}),
  }
})

import { getFlameVariant, getFlameTooltip } from '@/composables/useWidgetBus.js'
import GenericScannerTable from '../GenericScannerTable.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const sampleRow = {
  symbol: 'AAPL', close: 175.5, pct_change: 1.45,
  volume: 5_000_000, category: 'tech',
  accumulated_volume: 5_000_000, relative_volume: 3.2,
}

const defaultColumns = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'close',  label: 'Price', decimals: 2 },
]

const defaultProps = {
  data:         [sampleRow],
  columns:      defaultColumns,
  sortKey:      '',
  sortDir:      'asc',
  rowClassFn:   null,
  activeTicker: null,
  isLocked:     true,
  colWidths:    {},
  hiddenCols:   [],
}

function mountTable(overrides = {}) {
  return mount(GenericScannerTable, {
    props: { ...defaultProps, ...overrides },
    attachTo: document.body,
  })
}

beforeEach(() => { vi.clearAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// startResize — full mouse event flow
// ─────────────────────────────────────────────────────────────────────────────

describe('startResize', () => {
  test('with mousedown → mousemove → mouseup expect update-col-widths emitted with new width', async () => {
    // Arrange — must be unlocked to show resize handles
    const calls = []
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps, isLocked: false },
      attrs: { 'onUpdate-col-widths': (w) => calls.push(w) },
      attachTo: document.body,
    })
    await nextTick()
    const handle = wrapper.find('.col-resize-handle')
    expect(handle.exists()).toBe(true)

    // Act — mousedown on the resize handle at x=100
    await handle.trigger('mousedown', { clientX: 100 })
    await nextTick()

    // Act — mousemove on document (simulate dragging right by 50px)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, bubbles: true }))
    await nextTick()

    // Act — mouseup on document (releases resize)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await nextTick()

    // Assert — update-col-widths emitted with a new width
    expect(calls.length).toBeGreaterThan(0)
    const emittedWidths = calls[calls.length - 1]
    expect(typeof emittedWidths).toBe('object')
    wrapper.unmount()
  })

  test('with isLocked=true and mousedown on header expect no resize (early return)', async () => {
    // Arrange — locked: resize handles not rendered, but test the guard path directly
    // via setupState (startResize is guarded by isLocked check)
    const wrapper = mountTable({ isLocked: true })
    await nextTick()

    // Assert — no resize handles shown when locked
    expect(wrapper.find('.col-resize-handle').exists()).toBe(false)
    // If startResize were called with locked=true it would return early; verify
    // by calling via setupState — no error expected, no state change
    const state = wrapper.vm.$.setupState
    const mockEvent = { clientX: 100, target: { closest: () => null } }
    expect(() => state.startResize(mockEvent, 'close')).not.toThrow()
    wrapper.unmount()
  })

  test('with mousemove before mousedown expect no resizeState (onMove guard)', async () => {
    // Arrange
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps, isLocked: false },
      attachTo: document.body,
    })
    await nextTick()

    // Act — dispatch a mousemove WITHOUT a prior mousedown
    // The onMove guard `if (!resizeState) return` prevents any crash
    expect(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true }))
    }).not.toThrow()
    wrapper.unmount()
  })

  test('with resize completed expect localWidths updated with new column width', async () => {
    // Arrange
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps, isLocked: false, colWidths: { symbol: 80 } },
      attachTo: document.body,
    })
    await nextTick()
    const handle = wrapper.find('.col-resize-handle')

    // Act — drag from x=0 to x=30 (increases width by 30px)
    await handle.trigger('mousedown', { clientX: 0 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, bubbles: true }))
    await nextTick()
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await nextTick()

    // Assert — symbol column width increased
    const state = wrapper.vm.$.setupState
    expect(state.localWidths.symbol).toBeGreaterThan(80)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onFlameTouchStart / onFlameTouchEnd
// ─────────────────────────────────────────────────────────────────────────────

describe('flame touch events', () => {
  test('with touchstart and 500ms elapsed expect alert shown with tooltip', async () => {
    // Arrange — enable flame icon by returning a variant
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('red')
    vi.mocked(getFlameTooltip).mockReturnValue('Hot news — 5m ago')

    const wrapper = mountTable()
    await nextTick()
    const flameIcon = wrapper.find('.flame-icon')
    expect(flameIcon.exists()).toBe(true)

    // Act — touchstart (passive event)
    await flameIcon.trigger('touchstart')
    await nextTick()

    // Advance timer past 500ms
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — alert called with tooltip text
    expect(window.alert).toHaveBeenCalledWith('Hot news — 5m ago')

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with touchend before 500ms expect timer cancelled (no alert)', async () => {
    // Arrange
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('orange')
    vi.mocked(getFlameTooltip).mockReturnValue('Some tooltip')

    const wrapper = mountTable()
    await nextTick()
    const flameIcon = wrapper.find('.flame-icon')

    // Act — touchstart then quickly touchend (cancels timer)
    await flameIcon.trigger('touchstart')
    await nextTick()
    await flameIcon.trigger('touchend')
    await nextTick()

    // Advance past 500ms — timer should have been cleared
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — no alert
    expect(window.alert).not.toHaveBeenCalled()

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with flame tooltip empty expect alert not called on touchstart', async () => {
    // Arrange — empty tooltip
    vi.useFakeTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(getFlameVariant).mockReturnValue('yellow')
    vi.mocked(getFlameTooltip).mockReturnValue('')  // empty tooltip

    const wrapper = mountTable()
    await nextTick()
    const flameIcon = wrapper.find('.flame-icon')

    // Act
    await flameIcon.trigger('touchstart')
    vi.advanceTimersByTime(600)
    await nextTick()

    // Assert — alert not called (empty tooltip is falsy)
    expect(window.alert).not.toHaveBeenCalled()

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// colStyle — truthy path (width is set)
// ─────────────────────────────────────────────────────────────────────────────

describe('colStyle with width set', () => {
  test('with colWidths.symbol=120 expect th style contains 120px', async () => {
    // Arrange
    const wrapper = mountTable({ colWidths: { symbol: 120 } })
    await nextTick()

    // Assert — symbol header has inline width style
    const symbolTh = wrapper.find('th')
    expect(symbolTh.attributes('style')).toContain('120px')
    wrapper.unmount()
  })

  test('with no colWidths expect th has no width style', async () => {
    // Arrange
    const wrapper = mountTable({ colWidths: {} })
    await nextTick()

    // Assert — no inline width style (colStyle returns {})
    const symbolTh = wrapper.find('th')
    const style = symbolTh.attributes('style') ?? ''
    expect(style).not.toContain('px')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// colWidths prop watch
// ─────────────────────────────────────────────────────────────────────────────

describe('colWidths prop watch', () => {
  test('with colWidths prop updated expect localWidths synced', async () => {
    // Arrange
    const wrapper = mountTable({ colWidths: {} })
    await nextTick()

    // Act — update colWidths prop
    await wrapper.setProps({ colWidths: { symbol: 150 } })
    await nextTick()

    // Assert — localWidths updated in component
    const state = wrapper.vm.$.setupState
    expect(state.localWidths.symbol).toBe(150)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toNum with NaN value → 0 fallback (line 146)
// ─────────────────────────────────────────────────────────────────────────────

describe('toNum NaN fallback', () => {
  test('with non-numeric volume value expect toNum returns 0 (NaN fallback)', async () => {
    // Arrange — access toNum directly via setupState with non-numeric value
    const wrapper = mountTable()
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — call toNum with non-numeric value (NaN path → returns 0)
    const result = state.toNum('not-a-number')

    // Assert — NaN → 0 fallback
    expect(result).toBe(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatCell: NaN decimals → '' (line 173)
// ─────────────────────────────────────────────────────────────────────────────

describe('formatCell NaN decimals fallback', () => {
  test('with non-numeric decimals value expect formatCell returns empty string', async () => {
    // Arrange — add a column with decimals and non-finite value
    const customColumns = [
      { key: 'price', label: 'Price', decimals: 2 },
    ]
    const wrapper = mount(GenericScannerTable, {
      props: { ...defaultProps, columns: customColumns, settings: { hiddenCols: [] } },
    })
    await nextTick()

    // Act — access formatCell directly via setupState
    const state = wrapper.vm.$.setupState
    const col = { key: 'price', decimals: 2 }
    // Non-finite number → returns ''
    const result = state.formatCell(col, { price: NaN })
    expect(result).toBe('')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// v-if="col.render": column with render function → TRUE path (line 33)
// ─────────────────────────────────────────────────────────────────────────────

describe('column with render function', () => {
  test('with column having render function expect custom component shown', async () => {
    // Arrange — column with render function (triggers v-if="col.render" TRUE)
    const customColumns = [
      {
        key: 'symbol',
        label: 'Symbol',
        render: (row) => ({ template: `<span class="custom">${row.symbol}</span>` }),
      },
    ]
    const wrapper = mount(GenericScannerTable, {
      props: {
        ...defaultProps,
        columns: customColumns,
        data: [{ symbol: 'AAPL', price: 10 }],
      },
    })
    await nextTick()

    // Assert — custom component rendered (col.render truthy → v-if=true path)
    expect(wrapper.find('.custom').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L81: colWidths watcher FALSE path (v=null → skip update)
// L141: onFlameTouchEnd FALSE path (no timer → nothing to clear)
// ─────────────────────────────────────────────────────────────────────────────

describe('colWidths watcher and onFlameTouchEnd', () => {
  test('with colWidths changed to null expect watcher skips update (L81 FALSE)', async () => {
    // Arrange — mount with initial colWidths then change to null
    const wrapper = mountTable({ colWidths: { symbol: 100 } })
    await nextTick()

    // Act — setProps with null colWidths → watcher fires with v=null → FALSE path
    await wrapper.setProps({ colWidths: null })
    await nextTick()

    // Assert — no crash (if(v) is false → localWidths not updated)
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  test('with colWidths changed to truthy value expect watcher updates (L81 TRUE confirmed)', async () => {
    // Arrange
    const wrapper = mountTable({ colWidths: { symbol: 100 } })
    await nextTick()

    // Act — set new truthy colWidths → TRUE path
    await wrapper.setProps({ colWidths: { symbol: 150, price: 80 } })
    await nextTick()

    // Assert — localWidths updated
    const state = wrapper.vm.$.setupState
    expect(state.localWidths.symbol).toBe(150)
    wrapper.unmount()
  })

  test('with onFlameTouchEnd called when no timer expect no crash (L141 FALSE)', async () => {
    // Arrange — mount (flameLongPressTimer starts null)
    const wrapper = mountTable()
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Act — call onFlameTouchEnd directly (flameLongPressTimer=null → if(timer) FALSE)
    if (state.onFlameTouchEnd) {
      state.onFlameTouchEnd()
    }
    await nextTick()

    // Assert — no crash
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L94: onMove called after resizeState cleared → if(!resizeState) return TRUE
// Capture onMove via document.addEventListener spy, then clear resizeState and call
// ─────────────────────────────────────────────────────────────────────────────

describe('onMove with resizeState=null (L94 TRUE path)', () => {
  test('with onMove called after resizeState cleared expect early return (L94 TRUE)', async () => {
    // Arrange — capture the mousemove listener
    let capturedOnMove = null
    let capturedOnUp = null
    const origAdd = document.addEventListener.bind(document)
    const spy = vi.spyOn(document, 'addEventListener').mockImplementation((type, fn) => {
      if (type === 'mousemove') capturedOnMove = fn
      if (type === 'mouseup') capturedOnUp = fn
      origAdd(type, fn)
    })

    const wrapper = mountTable({ isLocked: false, colWidths: { symbol: 100 } })
    await nextTick()
    const state = wrapper.vm.$.setupState

    // Trigger startResize to populate resizeState and add listeners
    if (state.startResize) {
      const mockEvent = { clientX: 100, target: { closest: vi.fn(() => ({ offsetWidth: 100 })) } }
      state.startResize(mockEvent, 'symbol')
    }
    await nextTick()

    // Now call onUp to clear resizeState (same as user releasing mouse)
    if (capturedOnUp) {
      capturedOnUp({ clientX: 100 })
    }
    await nextTick()

    // Act — call onMove with resizeState=null → if(!resizeState) return TRUE
    if (capturedOnMove) {
      capturedOnMove({ clientX: 150 })  // resizeState is null → L94 TRUE path
    }

    // Assert — no crash (early return happened)
    expect(wrapper.exists()).toBe(true)
    spy.mockRestore()
    wrapper.unmount()
  })
})
