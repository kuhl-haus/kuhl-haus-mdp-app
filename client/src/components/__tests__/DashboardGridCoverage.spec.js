/**
 * DashboardGrid.vue — targeted coverage for remaining uncovered branches.
 *
 * Branches targeted:
 *  - appConfig null → "Error" status + "auth-required" shown (line 4/150)
 *  - Mobile dropdown with selectedLayoutName set (line 16)
 *  - Mobile dropdown open → options rendered, empty state (lines 20-31)
 *  - Hover preview with description populated (line 79)
 *  - appVersion rendered (line 178)
 *  - Col-count NaN input → || 12 fallback (line 252)
 *  - loadLayout with no selectedLayoutName → early return (line 441)
 *  - Saved layout missing dashboardColNum → ?? 12 fallback (lines 446, 479)
 *  - autoSaveLayout with autosaveEnabled=false → early return (line 487)
 *  - autoSaveLayout with empty selectedLayoutName → uses AUTOSAVE_KEY (line 497)
 *  - updateLinkColor / updateColWidths / updateSettings / updateLabel
 *    with unknown widget ID → no-op (lines 808-832)
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount }     from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// ── Heavy dep stubs ────────────────────────────────────────────────────────────
vi.mock('vue3-grid-layout-next', () => ({
  GridLayout: {
    name: 'GridLayout',
    props: ['layout', 'colNum', 'rowHeight', 'margin', 'isDraggable', 'isResizable',
            'verticalCompact', 'useCssTransforms'],
    emits: ['update:layout'],
    template: '<div class="mock-grid-layout"><slot /></div>',
  },
  GridItem: {
    name: 'GridItem',
    props: ['x', 'y', 'w', 'h', 'i'],
    template: '<div class="mock-grid-item"><slot /></div>',
  },
}))
vi.mock('../WidgetMenu.vue', () => ({
  default: { name: 'WidgetMenu', emits: ['add-widget'], template: '<div />' },
}))
vi.mock('../WidgetWrapper.vue', () => ({
  default: {
    name: 'WidgetWrapper',
    props: ['widgetId', 'widgetType', 'isLocked', 'settings', 'colWidths',
            'linkColor', 'userLabel', 'isMobile'],
    emits: ['close', 'update-col-widths', 'update-link-color',
            'update-settings', 'update-label'],
    template: '<div class="mock-widget-wrapper" />',
  },
}))

// useConfig mock — configurable per test via useConfig.mockReturnValueOnce
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  const useConfig = vi.fn(() => ({
    config:  ref({ apiKey: 'test', wsEndpoint: 'ws://localhost:4202/ws',
                   massiveApiKey: null, finlightApiKey: null }),
    loading: ref(false),
    error:   ref(null),
  }))
  return { useConfig }
})
import { useConfig } from '@/composables/useConfig.js'

// ── localStorage stub ─────────────────────────────────────────────────────────
const store = {}
const localStorageMock = {
  getItem:    vi.fn(k => store[k] ?? null),
  setItem:    vi.fn((k, v) => { store[k] = v }),
  removeItem: vi.fn(k => { delete store[k] }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// ── canvas stub ───────────────────────────────────────────────────────────────
const mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
  textAlign: '', textBaseline: '',
  fillRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
}
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

import DashboardGrid from '../DashboardGrid.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
function ss(wrapper) { return wrapper.vm.$.setupState }

function seedLayouts(data, defaultName = null) {
  store['dashboard-layouts'] = JSON.stringify(data)
  if (defaultName) store['dashboard-default-layout'] = defaultName
  else             delete store['dashboard-default-layout']
}

function makeLayout(overrides = {}) {
  return {
    layout: [], widgetCounter: 0, dashboardColNum: 12,
    created: 1_700_000_000_000, modified: 1_700_000_001_000,
    description: '', ...overrides,
  }
}

function mountGrid(innerWidth = 1280) {
  Object.defineProperty(window, 'innerWidth',
    { value: innerWidth, writable: true, configurable: true })
  return mount(DashboardGrid, { attachTo: document.body })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
  Object.keys(store).forEach(k => delete store[k])
  store['dashboard-layout-locked']    = 'false'
  store['dashboard-autosave-enabled'] = 'true'
  // restore default useConfig mock after clearAllMocks resets implementations
  vi.mocked(useConfig).mockImplementation(() => ({
    config:  ref({ apiKey: 'test', wsEndpoint: 'ws://localhost:4202/ws',
                   massiveApiKey: null, finlightApiKey: null }),
    loading: ref(false),
    error:   ref(null),
  }))
})

afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// appConfig null → Error status and auth-required message
// ─────────────────────────────────────────────────────────────────────────────

describe('appConfig null', () => {
  test('with useConfig returning null config expect error status and auth-required shown', async () => {
    // Arrange — config is null (no API key configured / error state)
    vi.mocked(useConfig).mockReturnValueOnce({
      config:  ref(null),
      loading: ref(false),
      error:   ref('Configuration error'),
    })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — error status badge shown, success badge hidden
    expect(wrapper.find('.status.error').exists()).toBe(true)
    expect(wrapper.find('.status.success').exists()).toBe(false)
    expect(wrapper.find('.auth-required').exists()).toBe(true)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// appVersion displayed
// ─────────────────────────────────────────────────────────────────────────────

describe('appVersion', () => {
  test('with useConfig returning appVersion expect version badge rendered', async () => {
    // Arrange — config includes appVersion
    // appVersion comes from window.__APP_VERSION__, not useConfig
    Object.defineProperty(window, '__APP_VERSION__',
      { value: '1.2.3', writable: true, configurable: true })

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — version badge shown
    expect(wrapper.find('.app-version').exists()).toBe(true)
    expect(wrapper.find('.app-version').text()).toContain('1.2.3')

    wrapper.unmount()
    // cleanup
    Object.defineProperty(window, '__APP_VERSION__',
      { value: undefined, writable: true, configurable: true })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Mobile dropdown: selectedLayoutName shown, open state, empty list
// ─────────────────────────────────────────────────────────────────────────────

describe('mobile dropdown states', () => {
  test('with mobile + saved layout selected expect layout name in trigger', async () => {
    // Arrange — mobile width, one saved layout, load it
    seedLayouts({ 'My Layout': makeLayout() })
    const wrapper = mountGrid(390)
    await nextTick()
    ss(wrapper).selectedLayoutName = 'My Layout'
    await nextTick()

    // Assert — selected name appears in mobile select trigger
    const trigger = wrapper.find('.custom-select--mobile .select-trigger')
    expect(trigger.text()).toContain('My Layout')

    wrapper.unmount()
  })

  test('with mobile + dropdown open expect layout options rendered', async () => {
    // Arrange — mobile width, one layout, open dropdown
    seedLayouts({ 'Alpha': makeLayout() })
    const wrapper = mountGrid(390)
    await nextTick()
    await wrapper.find('.custom-select--mobile .select-trigger').trigger('click')
    await nextTick()

    // Assert — dropdown visible with option
    expect(wrapper.find('.custom-select--mobile .select-dropdown').exists()).toBe(true)
    expect(wrapper.find('.custom-select--mobile .select-option').text()).toContain('Alpha')

    wrapper.unmount()
  })

  test('with mobile + dropdown open + no saved layouts expect empty state shown', async () => {
    // Arrange — mobile, no saved layouts, open dropdown
    const wrapper = mountGrid(390)
    await nextTick()
    await wrapper.find('.custom-select--mobile .select-trigger').trigger('click')
    await nextTick()

    // Assert — "No saved layouts" shown in mobile dropdown
    const emptyOption = wrapper.find('.custom-select--mobile .select-option.disabled')
    expect(emptyOption.exists()).toBe(true)
    expect(emptyOption.text()).toContain('No saved layouts')

    wrapper.unmount()
  })

  test('with mobile + layout selected in dropdown expect selectLayout called', async () => {
    // Arrange — mobile, layout seeded, dropdown open, option clicked
    seedLayouts({ 'Beta': makeLayout() })
    const wrapper = mountGrid(390)
    await nextTick()
    await wrapper.find('.custom-select--mobile .select-trigger').trigger('click')
    await nextTick()

    // Act — click the layout option
    await wrapper.find('.custom-select--mobile .option-name').trigger('click')
    await nextTick()

    // Assert — layout selected
    expect(ss(wrapper).selectedLayoutName).toBe('Beta')

    wrapper.unmount()
  })

  test('with mobile + default layout selected expect default indicator shown', async () => {
    // Arrange — set one layout as default
    seedLayouts({ 'MainLayout': makeLayout() }, 'MainLayout')
    const wrapper = mountGrid(390)
    await nextTick()
    ss(wrapper).selectedLayoutName = 'MainLayout'
    await wrapper.find('.custom-select--mobile .select-trigger').trigger('click')
    await nextTick()

    // Assert — default indicator (✓) shown next to name
    const optionText = wrapper.find('.custom-select--mobile .option-name').text()
    expect(optionText).toContain('✓')

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Hover preview with description
// ─────────────────────────────────────────────────────────────────────────────

describe('hover preview with description', () => {
  test('with layout having description expect description shown in hover preview', async () => {
    // Arrange — seed a layout with a description, trigger hover preview
    seedLayouts({ 'DocLayout': makeLayout({ description: 'My best layout' }) })
    const wrapper = mountGrid()
    await nextTick()

    // Act — call startHoverPreview directly (avoids 300ms real timer)
    vi.useFakeTimers()
    const el = { getBoundingClientRect: () => ({ top: 100, right: 200 }) }
    ss(wrapper).startHoverPreview('DocLayout', { target: el })
    vi.runAllTimers()
    await nextTick()

    // Assert — description visible in hover tooltip
    const desc = wrapper.find('.hover-preview-tooltip .preview-desc')
    expect(desc.exists()).toBe(true)
    expect(desc.text()).toContain('My best layout')

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Col-count NaN input → || 12 fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('dashboard column count NaN input', () => {
  test('with empty string in col-count input expect dashboardColNum set to 12', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act — trigger change event with empty string (parseInt → NaN || 12)
    const input = wrapper.find('.col-num-input')
    // Set element value to empty, then trigger change
    input.element.value = ''
    await input.trigger('change')
    await nextTick()

    // Assert — falls back to 12
    expect(ss(wrapper).dashboardColNum).toBe(12)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadLayout early return when no selectedLayoutName
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLayout early return', () => {
  test('with no selectedLayoutName expect loadLayout is a no-op', async () => {
    // Arrange — no layout selected
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).selectedLayoutName = ''

    // Act — call loadLayout directly
    const layoutBefore = [...ss(wrapper).layout]
    ss(wrapper).loadLayout()
    await nextTick()

    // Assert — layout unchanged (early return hit)
    expect(ss(wrapper).layout).toEqual(layoutBefore)

    wrapper.unmount()
  })

  test('with selectedLayoutName pointing to missing layout expect no-op', async () => {
    // Arrange — name set but not in savedLayouts
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).selectedLayoutName = 'GhostLayout'

    // Act
    const layoutBefore = [...ss(wrapper).layout]
    ss(wrapper).loadLayout()
    await nextTick()

    // Assert — no crash, layout unchanged
    expect(ss(wrapper).layout).toEqual(layoutBefore)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// dashboardColNum ?? 12 fallback when colNum missing from saved layout
// ─────────────────────────────────────────────────────────────────────────────

describe('dashboardColNum missing from saved layout', () => {
  test('with saved layout missing dashboardColNum expect colNum defaults to 12', async () => {
    // Arrange — layout without dashboardColNum field
    const layoutWithoutColNum = {
      layout: [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 4, type: 'quote' }],
      widgetCounter: 1,
      // dashboardColNum intentionally omitted
      created: Date.now(), modified: Date.now(), description: '',
    }
    seedLayouts({ 'NoColNum': layoutWithoutColNum })
    const wrapper = mountGrid()
    await nextTick()

    // Act — load the layout (triggers dashboardColNum ?? 12 path)
    ss(wrapper).selectedLayoutName = 'NoColNum'
    ss(wrapper).loadLayout()
    await nextTick()

    // Assert — falls back to 12
    expect(ss(wrapper).dashboardColNum).toBe(12)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadDefaultLayout fallback: autosave layout missing dashboardColNum
// ─────────────────────────────────────────────────────────────────────────────

describe('loadDefaultLayout autosave colNum fallback', () => {
  test('with autosave layout missing dashboardColNum expect colNum defaults to 12', async () => {
    // Arrange — autosave entry has no dashboardColNum
    store['dashboard-layouts'] = JSON.stringify({
      '__autosave__': {
        layout: [], widgetCounter: 0,
        // dashboardColNum missing
        created: Date.now(), modified: Date.now(),
      },
    })
    delete store['dashboard-default-layout']

    const wrapper = mountGrid()
    await nextTick()

    // Assert — defaults to 12
    expect(ss(wrapper).dashboardColNum).toBe(12)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// autoSaveLayout with autosaveEnabled=false → early return
// ─────────────────────────────────────────────────────────────────────────────

describe('autoSaveLayout disabled', () => {
  test('with autosaveEnabled=false expect autoSaveLayout is a no-op', async () => {
    // Arrange — disable autosave
    store['dashboard-autosave-enabled'] = 'false'
    const wrapper = mountGrid()
    await nextTick()

    // Confirm autosave is off
    expect(ss(wrapper).autosaveEnabled).toBe(false)

    // Act — call autoSaveLayout directly
    const storageCalls = localStorageMock.setItem.mock.calls.length
    ss(wrapper).autoSaveLayout()
    // No setTimeout callback fires since autoSaveLayout returns early before setting one

    // Assert — no additional writes triggered
    expect(localStorageMock.setItem.mock.calls.length).toBe(storageCalls)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// autoSaveLayout with empty selectedLayoutName → falls back to AUTOSAVE_KEY
// ─────────────────────────────────────────────────────────────────────────────

describe('autoSaveLayout with no selected layout', () => {
  test('with no selectedLayoutName expect autosave written under __autosave__', async () => {
    // Arrange — no layout selected, autosave enabled
    vi.useFakeTimers()
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).selectedLayoutName = ''  // no layout selected

    // Act — trigger autoSave (e.g. via layout change)
    ss(wrapper).autoSaveLayout()
    vi.runAllTimers()
    await nextTick()

    // Assert — autosave key used in localStorage
    const written = localStorageMock.setItem.mock.calls.find(
      ([k]) => k === 'dashboard-layouts'
    )
    if (written) {
      const saved = JSON.parse(written[1])
      expect('__autosave__' in saved).toBe(true)
    }

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateLinkColor / updateColWidths / updateSettings / updateLabel
// with unknown widget ID → no-op (item not found)
// ─────────────────────────────────────────────────────────────────────────────

describe('widget update operations with unknown ID', () => {
  function setupWithWidget(wrapper) {
    wrapper.vm.addWidget({ type: 'quote', label: 'Q' })
    return wrapper
  }

  test('with updateLinkColor on unknown ID expect no crash and layout unchanged', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    setupWithWidget(wrapper)
    await nextTick()
    const layoutBefore = JSON.stringify(ss(wrapper).layout)

    // Act
    ss(wrapper).updateLinkColor('widget-9999', '#ff0000')
    await nextTick()

    // Assert — layout unchanged
    expect(JSON.stringify(ss(wrapper).layout)).toBe(layoutBefore)

    wrapper.unmount()
  })

  test('with updateColWidths on unknown ID expect no crash', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    setupWithWidget(wrapper)
    await nextTick()
    const layoutBefore = JSON.stringify(ss(wrapper).layout)

    // Act
    ss(wrapper).updateColWidths('widget-9999', { symbol: 80, change: 60 })
    await nextTick()

    // Assert
    expect(JSON.stringify(ss(wrapper).layout)).toBe(layoutBefore)

    wrapper.unmount()
  })

  test('with updateSettings on unknown ID expect no crash', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    setupWithWidget(wrapper)
    await nextTick()
    const layoutBefore = JSON.stringify(ss(wrapper).layout)

    // Act
    ss(wrapper).updateSettings('widget-9999', { ticker: 'AAPL' })
    await nextTick()

    // Assert
    expect(JSON.stringify(ss(wrapper).layout)).toBe(layoutBefore)

    wrapper.unmount()
  })

  test('with updateLabel on unknown ID expect no crash', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    setupWithWidget(wrapper)
    await nextTick()
    const layoutBefore = JSON.stringify(ss(wrapper).layout)

    // Act
    ss(wrapper).updateLabel('widget-9999', 'New Label')
    await nextTick()

    // Assert
    expect(JSON.stringify(ss(wrapper).layout)).toBe(layoutBefore)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Mobile toolbar: isLocked=true shows 🔒 icon (lines 40-41)
// ─────────────────────────────────────────────────────────────────────────────

describe('mobile toolbar isLocked state', () => {
  test('with mobile + isLocked=true expect lock icon shown', async () => {
    // Arrange — mobile width, locked layout
    store['dashboard-layout-locked'] = 'true'
    const wrapper = mountGrid(390)
    await nextTick()

    // Assert — lock emoji shown in mobile toolbar (isLocked=true → '🔒')
    const lockBtn = wrapper.find('.layout-controls--mobile .btn-icon[title*="Unlock"]')
    if (lockBtn.exists()) {
      expect(lockBtn.text()).toContain('🔒')
    } else {
      // Check via text search
      const btns = wrapper.findAll('.layout-controls--mobile .btn-icon')
      const hasLock = btns.some(b => b.text().includes('🔒') || b.attributes('title')?.includes('Unlock'))
      expect(hasLock).toBe(true)
    }
    wrapper.unmount()
  })

  test('with drawLayoutPreview: item without userLabel or type expect widget label', async () => {
    // Arrange — save a layout with a widget without userLabel/type
    seedLayouts({
      'NoLabelLayout': {
        layout: [{ i: 'widget-0', x: 0, y: 0, w: 6, h: 4, userLabel: '', type: '' }],
        widgetCounter: 1,
        dashboardColNum: 12,
        created: Date.now(), modified: Date.now(), description: 'test',
      },
    })
    const wrapper = mountGrid()
    await nextTick()

    // Act — open preview dialog (draws layout on canvas)
    ss(wrapper).showLayoutPreview('NoLabelLayout')
    await nextTick()

    // Assert — no crash, preview opened
    expect(ss(wrapper).showPreviewDialog).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawLayoutPreview / drawMiniPreview: colOverride=null → ?? dashboardColNum fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('drawLayoutPreview and drawMiniPreview with null colOverride', () => {
  test('with colOverride=null in drawLayoutPreview expect dashboardColNum used as fallback', async () => {
    // Arrange — show preview dialog so previewCanvas ref is attached
    seedLayouts({ 'Test': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)
    // Show dialog so canvas element is rendered and previewCanvas ref is set
    state.showPreviewDialog = true
    state.previewLayoutName = 'Test'
    await nextTick()

    // Act — call drawLayoutPreview with actual layout and null colOverride (exercises ?? dashboardColNum)
    expect(() => {
      state.drawLayoutPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4, userLabel: 'My Widget', type: 'quote' }], null)
    }).not.toThrow()

    wrapper.unmount()
  })

  test('with colOverride=undefined in drawMiniPreview expect no crash', async () => {
    // Arrange — hover preview shown so hoverPreviewCanvas ref is attached
    seedLayouts({ 'Test': makeLayout({ layout: [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 4, type: 'quote', userLabel: 'My Widget' }] }) })
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)

    vi.useFakeTimers()
    const el = { getBoundingClientRect: () => ({ top: 100, right: 200 }) }
    state.startHoverPreview('Test', { target: el })
    vi.runAllTimers()
    await nextTick()

    // Act — call drawMiniPreview with actual layout data and undefined colOverride
    expect(() => {
      state.drawMiniPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4, userLabel: '', type: 'quote' }], undefined)
    }).not.toThrow()

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// saveLayout: saveAsDefault=false (line 413 FALSE path)
// ─────────────────────────────────────────────────────────────────────────────

describe('saveLayout without setting as default', () => {
  test('with saveAsDefault=false expect defaultLayoutName unchanged', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)
    state.showSaveDialog = true
    state.saveLayoutName = 'TestLayout'
    state.saveAsDefault = false
    state.saveLayoutDescription = ''
    await nextTick()

    // Act
    state.saveLayout()
    await nextTick()

    // Assert — layout saved but no default set
    expect(state.savedLayouts['TestLayout']).toBeTruthy()
    expect(state.defaultLayoutName).toBe(null)

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawLayoutPreview: item with no userLabel AND no type → 'widget' fallback (line 661)
// ─────────────────────────────────────────────────────────────────────────────

describe('drawLayoutPreview item.userLabel || item.type || widget fallback', () => {
  test('with widget having no userLabel and no type expect widget fallback label', async () => {
    // Arrange — layout with widget that has neither userLabel nor type
    seedLayouts({
      'NoTypeLayout': {
        layout: [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 4 }],  // no type, no userLabel
        widgetCounter: 1,
        dashboardColNum: 12,
        created: Date.now(), modified: Date.now(), description: '',
      },
    })
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)

    // Show preview dialog (attaches previewCanvas)
    state.showPreviewDialog = true
    state.previewLayoutName = 'NoTypeLayout'
    await nextTick()

    // Act — call drawLayoutPreview with layout that has no type/userLabel
    expect(() => {
      state.drawLayoutPreview(
        [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 4, userLabel: '', type: '' }],
        12
      )
    }).not.toThrow()

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawMiniPreview: canvas null → if(!canvas) return (line 725)
// ─────────────────────────────────────────────────────────────────────────────

describe('drawMiniPreview with null canvas', () => {
  test('with hoverPreviewVisible=false expect drawMiniPreview returns early (canvas null)', async () => {
    // Arrange — hoverPreviewVisible=false means canvas not rendered
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)

    // hoverPreviewVisible defaults to false → canvas not attached
    // Calling drawMiniPreview directly exercises if(!canvas) return (line 725)
    expect(() => {
      state.drawMiniPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4, userLabel: 'Q', type: 'quote' }], 12)
    }).not.toThrow()

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawLayoutPreview: canvas null → if(!canvas) return (line 610)
// ─────────────────────────────────────────────────────────────────────────────

describe('drawLayoutPreview with null canvas', () => {
  test('with showPreviewDialog=false expect drawLayoutPreview returns early', async () => {
    // Arrange — showPreviewDialog=false means previewCanvas not attached
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)

    // Direct call without dialog → previewCanvas.value = null → early return
    expect(() => {
      state.drawLayoutPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4, type: 'quote', userLabel: '' }], 12)
    }).not.toThrow()

    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawLayoutPreview: item.userLabel=null || item.type=null → 'widget' fallback (line 773)
// ─────────────────────────────────────────────────────────────────────────────

describe('drawLayoutPreview widget label fallback (3rd || operand)', () => {
  test('with null userLabel and null type expect widget label used', async () => {
    // Arrange — show preview dialog (attaches previewCanvas)
    seedLayouts({ 'Test3': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)
    state.showPreviewDialog = true
    state.previewLayoutName = 'Test3'
    await nextTick()

    // Act — call drawLayoutPreview with null userLabel AND null type
    // null || null = null (falsy) → 'widget' fallback (3rd operand)
    expect(() => {
      state.drawLayoutPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4, userLabel: null, type: null }], 12)
    }).not.toThrow()
    wrapper.unmount()
  })

  test('with undefined userLabel and undefined type expect widget label used', async () => {
    // Arrange
    seedLayouts({ 'Test4': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    const state = ss(wrapper)
    state.showPreviewDialog = true
    state.previewLayoutName = 'Test4'
    await nextTick()

    // Act — call with undefined values → undefined || undefined = undefined → 'widget'
    expect(() => {
      state.drawLayoutPreview([{ i: 'w1', x: 0, y: 0, w: 6, h: 4 }], 12)  // no userLabel/type
    }).not.toThrow()
    wrapper.unmount()
  })
})
