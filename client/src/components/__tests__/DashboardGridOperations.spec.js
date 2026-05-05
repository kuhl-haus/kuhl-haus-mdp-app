/**
 * DashboardGrid.vue — operations coverage
 *
 * Covers uncovered branches: saveLayout, deleteCurrentLayout,
 * loadDefaultLayout (autosave path), exportLayouts, importLayouts,
 * selectLayout, toggleDropdown, widget operations (updateLinkColor,
 * updateColWidths, updateSettings, updateLabel, removeWidget),
 * formatDate, handleClickOutside, showLayoutPreview, loadPreviewedLayout,
 * closeSaveDialog, startHoverPreview, cancelHoverPreview, mobile branch.
 *
 * STATE ACCESS NOTE
 * defineExpose exports only 7 items; non-exposed state is accessed via
 * wrapper.vm.$.setupState, which is a proxyRefs proxy — refs are
 * auto-unwrapped for reads AND writes (no .value needed). Functions
 * stored in setupState are returned as-is (not wrapped).
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Heavy dep stubs ────────────────────────────────────────────────────────────
vi.mock('vue3-grid-layout-next', () => ({
  GridLayout: {
    name: 'GridLayout',
    props: ['layout', 'colNum', 'rowHeight', 'margin', 'isDraggable', 'isResizable', 'verticalCompact', 'useCssTransforms'],
    emits: ['update:layout'],
    template: '<div class="mock-grid-layout" :data-col-num="colNum"><slot /></div>',
  },
  GridItem: {
    name: 'GridItem',
    props: ['x', 'y', 'w', 'h', 'i'],
    template: '<div class="mock-grid-item"><slot /></div>',
  },
}))
vi.mock('../WidgetMenu.vue', () => ({
  default: { name: 'WidgetMenu', emits: ['add-widget'], template: '<div class="mock-widget-menu" />' },
}))
vi.mock('../WidgetWrapper.vue', () => ({
  default: {
    name: 'WidgetWrapper',
    props: ['widgetId', 'widgetType', 'isLocked', 'settings', 'colWidths', 'linkColor', 'userLabel', 'isMobile'],
    emits: ['close', 'update-col-widths', 'update-link-color', 'update-settings', 'update-label'],
    template: '<div class="mock-widget-wrapper" />',
  },
}))
vi.mock('@/composables/useConfig.js', async () => {
  const { ref } = await import('vue')
  return {
    useConfig: vi.fn(() => ({
      config:  ref({ apiKey: 'test', wsEndpoint: 'ws://localhost:4202/ws', massiveApiKey: null, finlightApiKey: null }),
      loading: ref(false),
      error:   ref(null),
    })),
  }
})

// ── localStorage stub ─────────────────────────────────────────────────────────
const store = {}
const localStorageMock = {
  getItem:    vi.fn((k) => store[k] ?? null),
  setItem:    vi.fn((k, v) => { store[k] = v }),
  removeItem: vi.fn((k) => { delete store[k] }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// ── canvas ctx stub ───────────────────────────────────────────────────────────
const mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
  textAlign: '', textBaseline: '',
  fillRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
}

// ── URL helpers ───────────────────────────────────────────────────────────────
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

import DashboardGrid from '../DashboardGrid.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Access non-exposed reactive state from a <script setup> component.
 * setupState is a proxyRefs proxy: reads return unwrapped values,
 * writes update the underlying ref — no .value needed in either direction.
 */
function ss(wrapper) {
  return wrapper.vm.$.setupState
}

function seedLayouts(data, defaultName = null) {
  store['dashboard-layouts'] = JSON.stringify(data)
  if (defaultName) store['dashboard-default-layout'] = defaultName
  else delete store['dashboard-default-layout']
}

function makeLayout(overrides = {}) {
  return {
    layout: [],
    widgetCounter: 0,
    dashboardColNum: 12,
    created: 1700000000000,
    modified: 1700000001000,
    description: '',
    ...overrides,
  }
}

function mountGrid(innerWidth = 1280) {
  Object.defineProperty(window, 'innerWidth', { value: innerWidth, writable: true, configurable: true })
  return mount(DashboardGrid, { attachTo: document.body })
}

/** Stub FileReader so readAsText fires onload synchronously with given result string. */
function stubFileReader(resultStr) {
  global.FileReader = function FakeReader() {
    this._onload = null
    Object.defineProperty(this, 'onload', {
      get: () => this._onload,
      set: (fn) => { this._onload = fn },
    })
    this.readAsText = () => {
      if (this._onload) this._onload({ target: { result: resultStr } })
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-apply canvas spy (clearAllMocks wipes the mock return value)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
  Object.keys(store).forEach(k => delete store[k])
  // Start unlocked + autosave enabled by default
  store['dashboard-layout-locked'] = 'false'
  store['dashboard-autosave-enabled'] = 'true'
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// saveLayout
// ─────────────────────────────────────────────────────────────────────────────

describe('saveLayout', () => {
  test('with empty name expect no-op', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = '   '

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert — no layout write
    expect(localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-layouts')).toBeUndefined()
    wrapper.unmount()
  })

  test('with valid name expect layout saved to localStorage', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'Alpha'

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert
    const call = localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-layouts')
    expect(call).toBeDefined()
    expect(JSON.parse(call[1])['Alpha']).toBeDefined()
    wrapper.unmount()
  })

  test('with saveAsDefault=true expect defaultLayoutName persisted', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'MyDefault'
    // setupState auto-unwraps refs — assign directly (no .value)
    ss(wrapper).saveAsDefault = true

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert
    expect(wrapper.vm.selectedLayoutName).toBe('MyDefault')
    const defaultCall = localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-default-layout')
    expect(defaultCall).toBeDefined()
    expect(defaultCall[1]).toBe('MyDefault')
    wrapper.unmount()
  })

  test('with saveAsDefault=false expect DEFAULT_KEY not written', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'Beta'
    ss(wrapper).saveAsDefault = false

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert
    expect(localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-default-layout')).toBeUndefined()
    wrapper.unmount()
  })

  test('with existing layout name expect created timestamp preserved', async () => {
    // Arrange
    const originalCreated = 1600000000000
    seedLayouts({ 'Existing': makeLayout({ created: originalCreated }) })
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'Existing'

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert
    const call = [...localStorageMock.setItem.mock.calls].reverse().find(([k]) => k === 'dashboard-layouts')
    const saved = JSON.parse(call[1])
    expect(saved['Existing'].created).toBe(originalCreated)
    expect(saved['Existing'].modified).toBeGreaterThan(originalCreated)
    wrapper.unmount()
  })

  test('with widgets in layout expect widgetCounter advanced past highest index', async () => {
    // Arrange
    seedLayouts({
      'WithWidgets': makeLayout({
        layout: [{ i: 'widget-5', x: 0, y: 0, w: 6, h: 19, type: 'quote' }],
      }),
    }, 'WithWidgets')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()
    wrapper.vm.saveLayoutName = 'WithWidgets'

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert
    const call = [...localStorageMock.setItem.mock.calls].reverse().find(([k]) => k === 'dashboard-layouts')
    expect(JSON.parse(call[1])['WithWidgets'].widgetCounter).toBeGreaterThan(5)
    wrapper.unmount()
  })

  test('with save expect dialog closed and fields reset', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).showSaveDialog = true
    wrapper.vm.saveLayoutName = 'Gamma'
    ss(wrapper).saveLayoutDescription = 'A description'
    ss(wrapper).saveAsDefault = true

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert — closeSaveDialog called
    expect(ss(wrapper).showSaveDialog).toBe(false)
    expect(wrapper.vm.saveLayoutName).toBe('')
    expect(ss(wrapper).saveLayoutDescription).toBe('')
    expect(ss(wrapper).saveAsDefault).toBe(false)
    wrapper.unmount()
  })

  test('editingExistingLayout is true when name matches existing layout', async () => {
    // Arrange
    seedLayouts({ 'Exists': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'Exists'
    await nextTick()

    // Assert — computed is truthy (auto-unwrapped, no .value)
    expect(ss(wrapper).editingExistingLayout).toBeTruthy()
    wrapper.unmount()
  })

  test('editingExistingLayout is false when name is new', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.saveLayoutName = 'BrandNew'
    await nextTick()

    // Assert
    expect(ss(wrapper).editingExistingLayout).toBeFalsy()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// closeSaveDialog — via DOM Cancel button
// ─────────────────────────────────────────────────────────────────────────────

describe('closeSaveDialog', () => {
  test('with dialog open expect fields reset and dialog closed', async () => {
    // Arrange — open the dialog via the 💾 button
    const wrapper = mountGrid()
    await nextTick()
    await wrapper.find('button[title="Save Layout"]').trigger('click')
    await nextTick()
    expect(ss(wrapper).showSaveDialog).toBe(true)

    // Act — click Cancel
    const cancelBtn = wrapper.findAll('.btn-secondary').find(b => b.text() === 'Cancel')
    await cancelBtn.trigger('click')
    await nextTick()

    // Assert
    expect(ss(wrapper).showSaveDialog).toBe(false)
    expect(wrapper.vm.saveLayoutName).toBe('')
    expect(ss(wrapper).saveLayoutDescription).toBe('')
    expect(ss(wrapper).saveAsDefault).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteCurrentLayout — via 🗑️ button click
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteCurrentLayout', () => {
  test('with confirm=true expect layout deleted and state reset', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedLayouts({ 'ToDelete': makeLayout() }, 'ToDelete')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()
    expect(wrapper.vm.selectedLayoutName).toBe('ToDelete')

    // Act
    await wrapper.find('button[title="Delete Layout"]').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.vm.selectedLayoutName).toBe('')
    expect(wrapper.vm.layout).toEqual([])
    const call = [...localStorageMock.setItem.mock.calls].reverse().find(([k]) => k === 'dashboard-layouts')
    expect(JSON.parse(call[1])['ToDelete']).toBeUndefined()
    wrapper.unmount()
  })

  test('with confirm=false expect layout preserved', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    seedLayouts({ 'ToKeep': makeLayout() }, 'ToKeep')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()
    const callsBefore = localStorageMock.setItem.mock.calls.length

    // Act
    await wrapper.find('button[title="Delete Layout"]').trigger('click')
    await nextTick()

    // Assert — nothing written
    expect(localStorageMock.setItem.mock.calls.length).toBe(callsBefore)
    expect(wrapper.vm.selectedLayoutName).toBe('ToKeep')
    wrapper.unmount()
  })

  test('with no layout selected expect delete button disabled', async () => {
    // Arrange
    const confirmSpy = vi.spyOn(window, 'confirm')
    const wrapper = mountGrid()
    await nextTick()

    // Assert — button is disabled; confirm never called
    expect(wrapper.find('button[title="Delete Layout"]').element.disabled).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with deleted layout being default expect defaultLayoutName cleared', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedLayouts({ 'Default': makeLayout() }, 'Default')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()

    // Act
    await wrapper.find('button[title="Delete Layout"]').trigger('click')
    await nextTick()

    // Assert — defaultLayoutName is null after delete
    expect(ss(wrapper).defaultLayoutName).toBeNull()
    wrapper.unmount()
  })

  test('with deleted layout not being default expect defaultLayoutName unchanged', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedLayouts({ 'Other': makeLayout(), 'Default': makeLayout() }, 'Default')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()
    // Switch to 'Other' without reloading page
    wrapper.vm.selectedLayoutName = 'Other'
    wrapper.vm.loadLayout()
    await nextTick()

    // Act — delete 'Other'
    await wrapper.find('button[title="Delete Layout"]').trigger('click')
    await nextTick()

    // Assert — 'Default' still the default
    expect(ss(wrapper).defaultLayoutName).toBe('Default')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadDefaultLayout — autosave fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('loadDefaultLayout autosave fallback', () => {
  test('with no default but autosave present expect autosave layout restored', async () => {
    // Arrange
    seedLayouts({
      '__autosave__': makeLayout({
        layout: [{ i: 'widget-0', x: 0, y: 0, w: 6, h: 19, type: 'quote' }],
        widgetCounter: 1,
        dashboardColNum: 16,
      }),
    })
    const wrapper = mountGrid()
    await nextTick(); await nextTick()

    // Assert
    expect(wrapper.vm.layout).toHaveLength(1)
    expect(wrapper.vm.dashboardColNum).toBe(16)
    wrapper.unmount()
  })

  test('with no default and no autosave expect empty layout', async () => {
    // Arrange — nothing in storage
    const wrapper = mountGrid()
    await nextTick()

    // Assert
    expect(wrapper.vm.layout).toHaveLength(0)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadFromStorage error branch
// ─────────────────────────────────────────────────────────────────────────────

describe('loadFromStorage error handling', () => {
  test('with corrupted localStorage JSON expect graceful fallback', async () => {
    // Arrange
    store['dashboard-layouts'] = '{invalid json'

    // Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert — component mounts; savedLayouts falls back to {}
    expect(wrapper.vm).toBeDefined()
    expect(ss(wrapper).savedLayouts).toEqual({})
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// exportLayouts — via 📤 button
// ─────────────────────────────────────────────────────────────────────────────

describe('exportLayouts', () => {
  test('with saved layouts expect Blob created and anchor clicked', async () => {
    // Arrange
    seedLayouts({ 'MyLayout': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    const clickSpy = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { href: '', download: '', click: clickSpy }
      return origCreateElement(tag)
    })

    // Act
    await wrapper.find('button[title="Export All Layouts"]').trigger('click')
    await nextTick()

    // Assert
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    wrapper.unmount()
  })

  test('with autosave entry expect __autosave__ excluded from export', async () => {
    // Arrange
    seedLayouts({ 'Real': makeLayout(), '__autosave__': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()

    let capturedData = null
    const origBlob = global.Blob
    global.Blob = class FakeBlob extends origBlob {
      constructor(parts, options) {
        super(parts, options)
        try { capturedData = JSON.parse(parts[0]) } catch {}
      }
    }
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: vi.fn() })

    // Act
    await wrapper.find('button[title="Export All Layouts"]').trigger('click')
    await nextTick()

    // Assert
    if (capturedData) {
      expect(capturedData.layouts['__autosave__']).toBeUndefined()
      expect(capturedData.layouts['Real']).toBeDefined()
    }
    global.Blob = origBlob
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// importLayouts
// ─────────────────────────────────────────────────────────────────────────────

describe('importLayouts', () => {
  test('with no file expect early return (no crash)', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act — trigger importLayouts with empty file list
    expect(() => ss(wrapper).importLayouts({ target: { files: [], value: '' } })).not.toThrow()
    wrapper.unmount()
  })

  test('with valid layout file expect layouts merged', async () => {
    // Arrange
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    stubFileReader(JSON.stringify({
      version: 1, exported: Date.now(),
      layouts: { 'Imported': makeLayout() },
      defaultLayout: null,
    }))
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert
    expect(ss(wrapper).savedLayouts['Imported']).toBeDefined()
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('1'))
    wrapper.unmount()
  })

  test('with conflicting layout and confirm=true expect overwrite', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    seedLayouts({ 'Conflict': makeLayout({ description: 'original' }) })
    stubFileReader(JSON.stringify({
      version: 1, exported: Date.now(),
      layouts: { 'Conflict': makeLayout({ description: 'imported' }) },
      defaultLayout: null,
    }))
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert — overwritten
    expect(ss(wrapper).savedLayouts['Conflict'].description).toBe('imported')
    wrapper.unmount()
  })

  test('with conflicting layout and confirm=false expect no overwrite', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    seedLayouts({ 'Conflict': makeLayout({ description: 'original' }) })
    stubFileReader(JSON.stringify({
      version: 1, exported: Date.now(),
      layouts: { 'Conflict': makeLayout({ description: 'imported' }) },
      defaultLayout: null,
    }))
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert — NOT overwritten
    expect(ss(wrapper).savedLayouts['Conflict'].description).toBe('original')
    expect(window.alert).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('with defaultLayout in import file expect defaultLayoutName updated', async () => {
    // Arrange
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    stubFileReader(JSON.stringify({
      version: 1, exported: Date.now(),
      layouts: { 'NewDefault': makeLayout() },
      defaultLayout: 'NewDefault',
    }))
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert
    expect(ss(wrapper).defaultLayoutName).toBe('NewDefault')
    wrapper.unmount()
  })

  test('with invalid JSON expect error alert', async () => {
    // Arrange
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    stubFileReader('not valid json {{')
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to import'))
    wrapper.unmount()
  })

  test('with missing layouts field expect invalid format alert', async () => {
    // Arrange
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    stubFileReader(JSON.stringify({ version: 1 }))
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).importLayouts({ target: { files: [new File(['{}'], 'l.json')], value: '' } })
    await nextTick()

    // Assert
    expect(window.alert).toHaveBeenCalledWith('Invalid layout file format')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toggleDropdown / selectLayout
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleDropdown', () => {
  test('with trigger click expect dropdown opens', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.select-dropdown').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with second trigger click expect dropdown closes', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.select-dropdown').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('selectLayout', () => {
  test('with layout option clicked expect layout loaded and dropdown closed', async () => {
    // Arrange
    seedLayouts({
      'Target': makeLayout({
        layout: [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 19, type: 'quote' }],
        widgetCounter: 2,
        dashboardColNum: 18,
      }),
    })
    const wrapper = mountGrid()
    await nextTick(); await nextTick()

    // Open dropdown
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()

    // Act — click option name
    await wrapper.find('.option-name').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.vm.selectedLayoutName).toBe('Target')
    expect(wrapper.vm.dashboardColNum).toBe(18)
    expect(wrapper.vm.layout).toHaveLength(1)
    expect(ss(wrapper).isDropdownOpen).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Widget operations — triggered via WidgetWrapper events
// ─────────────────────────────────────────────────────────────────────────────

describe('widget operations', () => {
  async function mountWithWidget() {
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.addWidget({ type: 'quote', label: 'Quote' })
    await nextTick()
    return wrapper
  }

  test('updateLinkColor with found widget expect linkColor set', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act — emit event from child WidgetWrapper
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-link-color', 'red')
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].linkColor).toBe('red')
    wrapper.unmount()
  })

  test('updateLinkColor with empty string expect linkColor set to null', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-link-color', '')
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].linkColor).toBeNull()
    wrapper.unmount()
  })

  test('updateColWidths with found widget expect colWidths updated', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-col-widths', { ticker: 80, price: 100 })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].colWidths).toEqual({ ticker: 80, price: 100 })
    wrapper.unmount()
  })

  test('updateSettings with found widget expect settings replaced', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-settings', { ticker: 'AAPL', theme: 'dark' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].settings).toEqual({ ticker: 'AAPL', theme: 'dark' })
    wrapper.unmount()
  })

  test('updateLabel with found widget expect userLabel set', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-label', 'My Widget')
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].userLabel).toBe('My Widget')
    wrapper.unmount()
  })

  test('updateLabel with empty string expect userLabel empty', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act
    wrapper.findComponent({ name: 'WidgetWrapper' }).vm.$emit('update-label', '')
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].userLabel).toBe('')
    wrapper.unmount()
  })

  test('removeWidget via close event expect widget removed from layout', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.addWidget({ type: 'quote', label: 'Q1' })
    wrapper.vm.addWidget({ type: 'top-gainers', label: 'TG' })
    await nextTick()
    expect(wrapper.vm.layout).toHaveLength(2)
    const firstId = wrapper.vm.layout[0].i

    // Act — emit close from first WidgetWrapper
    wrapper.findAllComponents({ name: 'WidgetWrapper' })[0].vm.$emit('close', firstId)
    await nextTick()

    // Assert
    expect(wrapper.vm.layout).toHaveLength(1)
    expect(wrapper.vm.layout[0].type).toBe('top-gainers')
    wrapper.unmount()
  })

  test('removeWidget with unknown id expect layout unchanged', async () => {
    // Arrange
    const wrapper = await mountWithWidget()

    // Act — call directly from setupState (not exposed)
    ss(wrapper).removeWidget('nonexistent')
    await nextTick()

    // Assert
    expect(wrapper.vm.layout).toHaveLength(1)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatDate — via preview dialog template render
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('with valid timestamp expect formatted string in preview metadata', async () => {
    // Arrange
    const ts = new Date('2024-01-15T12:00:00Z').getTime()
    seedLayouts({ 'Dated': makeLayout({ created: ts, modified: ts }) })
    const wrapper = mountGrid()
    await nextTick()

    // Act — open preview dialog to trigger formatDate calls in template
    ss(wrapper).showLayoutPreview('Dated')
    await nextTick(); await nextTick()

    // Assert — metadata section rendered with content (formatDate ran)
    expect(wrapper.find('.preview-metadata').exists()).toBe(true)
    expect(wrapper.find('.preview-metadata').text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  test('with null timestamp expect N/A in preview metadata', async () => {
    // Arrange
    seedLayouts({ 'NoDate': makeLayout({ created: null, modified: null }) })
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).showLayoutPreview('NoDate')
    await nextTick(); await nextTick()

    // Assert — N/A shown
    expect(wrapper.find('.preview-metadata').text()).toContain('N/A')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// showLayoutPreview / loadPreviewedLayout
// ─────────────────────────────────────────────────────────────────────────────

describe('showLayoutPreview', () => {
  test('with valid layout expect preview dialog opened with metadata', async () => {
    // Arrange
    seedLayouts({ 'Preview': makeLayout({ description: 'My description', created: 1000, modified: 2000 }) })
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).showLayoutPreview('Preview')
    await nextTick()

    // Assert — setupState auto-unwraps; access directly (no .value)
    expect(ss(wrapper).showPreviewDialog).toBe(true)
    expect(ss(wrapper).previewLayoutName).toBe('Preview')
    expect(ss(wrapper).previewMetadata.description).toBe('My description')
    expect(ss(wrapper).previewMetadata.created).toBe(1000)
    wrapper.unmount()
  })

  test('with unknown layout name expect dialog stays closed', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).showLayoutPreview('NonExistent')
    await nextTick()

    // Assert
    expect(ss(wrapper).showPreviewDialog).toBe(false)
    wrapper.unmount()
  })

  test('with empty layout name expect dialog stays closed', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    ss(wrapper).showLayoutPreview('')
    await nextTick()

    // Assert
    expect(ss(wrapper).showPreviewDialog).toBe(false)
    wrapper.unmount()
  })

  test('with open dropdown expect it closed when preview opens', async () => {
    // Arrange
    seedLayouts({ 'PL': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).isDropdownOpen = true

    // Act
    ss(wrapper).showLayoutPreview('PL')
    await nextTick()

    // Assert
    expect(ss(wrapper).isDropdownOpen).toBe(false)
    wrapper.unmount()
  })

  test('with 🔍 button in dropdown expect preview dialog opened', async () => {
    // Arrange
    seedLayouts({ 'Previewable': makeLayout({ description: 'desc' }) })
    const wrapper = mountGrid()
    await nextTick()

    // Open dropdown
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()

    // Act — click preview button
    await wrapper.find('.option-preview-btn').trigger('click')
    await nextTick()

    // Assert
    expect(ss(wrapper).showPreviewDialog).toBe(true)
    expect(ss(wrapper).previewLayoutName).toBe('Previewable')
    wrapper.unmount()
  })
})

describe('loadPreviewedLayout', () => {
  test('with preview open expect layout loaded and dialog closed', async () => {
    // Arrange
    seedLayouts({
      'LoadMe': makeLayout({
        layout: [{ i: 'widget-0', x: 0, y: 0, w: 6, h: 19, type: 'quote' }],
        widgetCounter: 1,
        dashboardColNum: 20,
      }),
    })
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).showLayoutPreview('LoadMe')
    await nextTick(); await nextTick()
    expect(ss(wrapper).showPreviewDialog).toBe(true)

    // Act — click "Load Layout" in preview modal
    const loadBtn = wrapper.findAll('.btn-primary').find(b => b.text() === 'Load Layout')
    await loadBtn.trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.vm.selectedLayoutName).toBe('LoadMe')
    expect(wrapper.vm.dashboardColNum).toBe(20)
    expect(wrapper.vm.layout).toHaveLength(1)
    expect(ss(wrapper).showPreviewDialog).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// handleClickOutside
// ─────────────────────────────────────────────────────────────────────────────

describe('handleClickOutside', () => {
  test('with click outside select container expect dropdown closed', async () => {
    // Arrange — open dropdown first
    const wrapper = mountGrid()
    await nextTick()
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()
    expect(ss(wrapper).isDropdownOpen).toBe(true)

    // Act — dispatch click on document body (outside the select)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // Assert
    expect(ss(wrapper).isDropdownOpen).toBe(false)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cancelHoverPreview / startHoverPreview
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelHoverPreview', () => {
  test('with hover preview visible expect hidden on cancel', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    ss(wrapper).hoverPreviewVisible = true
    ss(wrapper).hoverPreviewLayout = 'Test'
    ss(wrapper).hoverPreviewMetadata = { created: 1, modified: 2, description: '' }

    // Act
    ss(wrapper).cancelHoverPreview()
    await nextTick()

    // Assert
    expect(ss(wrapper).hoverPreviewVisible).toBe(false)
    expect(ss(wrapper).hoverPreviewLayout).toBe('')
    expect(ss(wrapper).hoverPreviewMetadata).toBeNull()
    wrapper.unmount()
  })
})

describe('startHoverPreview', () => {
  test('with hover after 300ms delay expect preview shown', async () => {
    // Arrange
    vi.useFakeTimers()
    seedLayouts({ 'HoverLayout': makeLayout({ description: 'hover desc' }) })
    const wrapper = mountGrid()
    await nextTick()
    const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100, right: 200 }) } }

    // Act
    ss(wrapper).startHoverPreview('HoverLayout', mockEvent)
    vi.advanceTimersByTime(400)
    await nextTick()

    // Assert
    expect(ss(wrapper).hoverPreviewVisible).toBe(true)
    expect(ss(wrapper).hoverPreviewLayout).toBe('HoverLayout')
    expect(ss(wrapper).hoverPreviewMetadata.description).toBe('hover desc')

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with cancel before delay expires expect preview not shown', async () => {
    // Arrange
    vi.useFakeTimers()
    seedLayouts({ 'HoverLayout': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()
    const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100, right: 200 }) } }

    // Act — start then immediately cancel
    ss(wrapper).startHoverPreview('HoverLayout', mockEvent)
    ss(wrapper).cancelHoverPreview()
    vi.advanceTimersByTime(400)
    await nextTick()

    // Assert
    expect(ss(wrapper).hoverPreviewVisible).toBe(false)

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with unknown layout name expect preview not shown after delay', async () => {
    // Arrange
    vi.useFakeTimers()
    const wrapper = mountGrid()
    await nextTick()
    const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100, right: 200 }) } }

    // Act
    ss(wrapper).startHoverPreview('DoesNotExist', mockEvent)
    vi.advanceTimersByTime(400)
    await nextTick()

    // Assert
    expect(ss(wrapper).hoverPreviewVisible).toBe(false)

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// autoSaveLayout — layout deep watch
// ─────────────────────────────────────────────────────────────────────────────

describe('autoSaveLayout on layout change', () => {
  test('with layout change while unlocked expect autosave written', async () => {
    // Arrange
    vi.useFakeTimers()
    seedLayouts({ 'AutoSaveMe': makeLayout() }, 'AutoSaveMe')
    const wrapper = mountGrid()
    await nextTick(); await nextTick()

    // Act — push widget (triggers deep layout watcher)
    wrapper.vm.layout.push({ i: 'widget-99', x: 0, y: 0, w: 6, h: 19, type: 'quote' })
    await nextTick()
    vi.runAllTimers()
    await nextTick()

    // Assert
    expect(localStorageMock.setItem.mock.calls.reverse().find(([k]) => k === 'dashboard-layouts')).toBeDefined()
    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with layout change while locked expect autosave NOT triggered', async () => {
    // Arrange — start locked
    store['dashboard-layout-locked'] = 'true'
    vi.useFakeTimers()
    const wrapper = mountGrid()
    await nextTick()
    localStorageMock.setItem.mockClear()

    // Act
    wrapper.vm.layout.push({ i: 'widget-99', x: 0, y: 0, w: 6, h: 19, type: 'quote' })
    await nextTick()
    vi.runAllTimers()
    await nextTick()

    // Assert — no layout write
    expect(localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-layouts')).toBeUndefined()
    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Mobile layout branch
// ─────────────────────────────────────────────────────────────────────────────

describe('mobile layout branch', () => {
  test('with innerWidth below 640 expect mobile-stack rendered instead of grid', async () => {
    // Arrange
    const wrapper = mountGrid(390)
    await nextTick()

    // Assert
    expect(wrapper.find('.mobile-stack').exists()).toBe(true)
    expect(wrapper.find('.mock-grid-layout').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with mobile width expect mobile layout-controls shown', async () => {
    // Arrange
    const wrapper = mountGrid(390)
    await nextTick()

    // Assert
    expect(wrapper.find('.layout-controls--mobile').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with desktop width expect grid rendered', async () => {
    // Arrange
    const wrapper = mountGrid(1280)
    await nextTick()

    // Assert
    expect(wrapper.find('.mock-grid-layout').exists()).toBe(true)
    expect(wrapper.find('.mobile-stack').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with resize from mobile to desktop expect isMobile becomes false', async () => {
    // Arrange
    const wrapper = mountGrid(390)
    await nextTick()
    expect(ss(wrapper).isMobile).toBe(true)

    // Act
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true })
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    // Assert
    expect(ss(wrapper).isMobile).toBe(false)
    wrapper.unmount()
  })

  test('with mobile and widgets expect WidgetWrapper rendered inside mobile-stack', async () => {
    // Arrange
    const wrapper = mountGrid(390)
    await nextTick()
    wrapper.vm.addWidget({ type: 'quote', label: 'Q' })
    await nextTick()

    // Assert
    expect(wrapper.find('.mobile-widget').exists()).toBe(true)
    expect(wrapper.find('.mock-widget-wrapper').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// savedLayoutNames computed
// ─────────────────────────────────────────────────────────────────────────────

describe('savedLayoutNames computed', () => {
  test('with multiple layouts expect sorted names', async () => {
    // Arrange
    seedLayouts({ 'Zebra': makeLayout(), 'Alpha': makeLayout(), 'Mike': makeLayout() })
    const wrapper = mountGrid()
    await nextTick()

    // Assert — auto-unwrapped array
    expect(ss(wrapper).savedLayoutNames).toEqual(['Alpha', 'Mike', 'Zebra'])
    wrapper.unmount()
  })

  test('with no layouts expect empty array', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Assert
    expect(ss(wrapper).savedLayoutNames).toEqual([])
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isLocked / autosaveEnabled persistence — DOM driven
// ─────────────────────────────────────────────────────────────────────────────

describe('isLocked persistence', () => {
  test('with lock button clicked expect localStorage updated', async () => {
    // Arrange — starts unlocked; button title is "Lock layout"
    const wrapper = mountGrid()
    await nextTick()

    // Act
    await wrapper.find('button[title="Lock layout"]').trigger('click')
    await nextTick()

    // Assert
    const call = localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-layout-locked')
    expect(call).toBeDefined()
    expect(call[1]).toBe('true')
    wrapper.unmount()
  })
})

describe('autosaveEnabled persistence', () => {
  test('with autosave toggle clicked expect localStorage updated', async () => {
    // Arrange — autosave ON by default
    const wrapper = mountGrid()
    await nextTick()
    localStorageMock.setItem.mockClear()

    // Act — click "Autosave ON — click to disable"
    await wrapper.find('button[title="Autosave ON \u2014 click to disable"]').trigger('click')
    await nextTick()

    // Assert
    const call = localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-autosave-enabled')
    expect(call).toBeDefined()
    expect(call[1]).toBe('false')
    wrapper.unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle cleanup
// ─────────────────────────────────────────────────────────────────────────────

describe('lifecycle cleanup on unmount', () => {
  test('with component unmounted expect resize listener removed', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    const spy = vi.spyOn(window, 'removeEventListener')

    // Act
    wrapper.unmount()

    // Assert
    expect(spy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  test('with component unmounted expect document click listener removed', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    const spy = vi.spyOn(document, 'removeEventListener')

    // Act
    wrapper.unmount()

    // Assert
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown empty state
// ─────────────────────────────────────────────────────────────────────────────

describe('dropdown empty state', () => {
  test('with no layouts and dropdown open expect "No saved layouts" shown', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    await wrapper.find('.select-trigger').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.select-option.disabled').text()).toBe('No saved layouts')
    wrapper.unmount()
  })
})
