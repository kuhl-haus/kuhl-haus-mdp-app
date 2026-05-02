import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

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
  default: {
    name: 'WidgetMenu',
    emits: ['add-widget'],
    template: '<div class="mock-widget-menu" />',
  },
}))

vi.mock('../WidgetWrapper.vue', () => ({
  default: {
    name: 'WidgetWrapper',
    props: ['widgetId', 'widgetType', 'isLocked', 'settings'],
    template: '<div class="mock-widget-wrapper" />',
  },
}))

// localStorage stub
const store = {}
const localStorageMock = {
  getItem:    vi.fn((k) => store[k] ?? null),
  setItem:    vi.fn((k, v) => { store[k] = v }),
  removeItem: vi.fn((k) => { delete store[k] }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Mock useConfig — DashboardGrid now uses useConfig() instead of window.__APP_CONFIG__
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

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
})

import DashboardGrid from '../DashboardGrid.vue'

function mountGrid() {
  return mount(DashboardGrid, { attachTo: document.body })
}

function seedLayouts(data, defaultName = null) {
  store['dashboard-layouts'] = JSON.stringify(data)
  if (defaultName) store['dashboard-default-layout'] = defaultName
}

// ── Default ───────────────────────────────────────────────────────────────────

describe('dashboardColNum default', () => {
  test('with no saved layout expect GridLayout col-num is 12', async () => {
    // Arrange / Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert
    expect(wrapper.find('.mock-grid-layout').attributes('data-col-num')).toBe('12')
    wrapper.unmount()
  })
})

// ── Input control ─────────────────────────────────────────────────────────────

describe('dashboardColNum input control', () => {
  test('with isLocked true expect col-num input not rendered', async () => {
    // Arrange / Act — default is locked
    const wrapper = mountGrid()
    await nextTick()

    // Assert
    expect(wrapper.find('.col-num-input').exists()).toBe(false)
    wrapper.unmount()
  })

  test('with isLocked false expect col-num input visible', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act — unlock
    await wrapper.find('button[title="Unlock layout (edit mode)"]').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('.col-num-input').exists()).toBe(true)
    wrapper.unmount()
  })

  test('with col-num input changed to 8 expect dashboardColNum updated', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    await wrapper.find('button[title="Unlock layout (edit mode)"]').trigger('click')
    await nextTick()

    // Act
    const input = wrapper.find('.col-num-input')
    await input.setValue('8')
    await input.trigger('change')
    await nextTick()

    // Assert
    expect(wrapper.vm.dashboardColNum).toBe(8)
    wrapper.unmount()
  })

  test('with col-num input changed to 8 expect grid re-renders with col-num 8', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    await wrapper.find('button[title="Unlock layout (edit mode)"]').trigger('click')
    await nextTick()

    // Act
    const input = wrapper.find('.col-num-input')
    await input.setValue('8')
    await input.trigger('change')
    await nextTick()

    // Assert
    expect(wrapper.find('.mock-grid-layout').attributes('data-col-num')).toBe('8')
    wrapper.unmount()
  })
})

// ── Loaded from saved layout ──────────────────────────────────────────────────

describe('dashboardColNum loaded from saved layout', () => {
  test('with saved layout dashboardColNum=16 expect grid renders with col-num 16', async () => {
    // Arrange — seed before mount so onMounted picks it up
    seedLayouts({
      'my-layout': {
        layout: [], widgetCounter: 0, dashboardColNum: 16,
        created: Date.now(), modified: Date.now(), description: '',
      }
    }, 'my-layout')

    // Act
    const wrapper = mountGrid()
    await nextTick()
    await nextTick()

    // Assert
    expect(wrapper.vm.dashboardColNum).toBe(16)
    expect(wrapper.find('.mock-grid-layout').attributes('data-col-num')).toBe('16')
    wrapper.unmount()
  })

  test('with legacy saved layout (no dashboardColNum) expect default 12', async () => {
    // Arrange — legacy layout without dashboardColNum
    seedLayouts({
      'old-layout': {
        layout: [], widgetCounter: 0,
        created: Date.now(), modified: Date.now(), description: '',
      }
    }, 'old-layout')

    // Act
    const wrapper = mountGrid()
    await nextTick()
    await nextTick()

    // Assert — backward-compatible default
    expect(wrapper.vm.dashboardColNum).toBe(12)
    wrapper.unmount()
  })
})

// ── dashboardColNum persisted on save ───────────────────────────────────────────────

describe('dashboardColNum persisted on save', () => {
  test('with dashboardColNum=16 expect saveLayout writes it to localStorage', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.dashboardColNum = 16
    wrapper.vm.saveLayoutName = 'test-save'
    await nextTick()

    // Act
    wrapper.vm.saveLayout()
    await nextTick()

    // Assert — find the dashboard-layouts write in localStorage calls
    const call = localStorageMock.setItem.mock.calls
      .reverse()
      .find(([k]) => k === 'dashboard-layouts')
    expect(call).toBeDefined()
    const saved = JSON.parse(call[1])
    expect(saved['test-save']?.dashboardColNum).toBe(16)

    wrapper.unmount()
  })
})

// ── addWidget uses dashboardColNum ────────────────────────────────────────────

describe('addWidget with dashboardColNum', () => {
  test('with dashboardColNum=12 expect new widget w=6 (half of 12)', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    expect(wrapper.vm.dashboardColNum).toBe(12)

    // Act
    wrapper.vm.addWidget({ type: 'quote', label: 'Mini Quote' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].w).toBe(6)
    wrapper.unmount()
  })

  test('with dashboardColNum=24 expect new widget w=12 (half of 24)', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()
    wrapper.vm.dashboardColNum = 24
    await nextTick()

    // Act
    wrapper.vm.addWidget({ type: 'quote', label: 'Mini Quote' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].w).toBe(12)
    wrapper.unmount()
  })
})

// ── addWidget sets userLabel ─────────────────────────────────────────────────────────────

describe('addWidget userLabel', () => {
  test('with quote widget added expect userLabel set to friendly label', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    wrapper.vm.addWidget({ type: 'quote', label: 'Mini Quote' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].userLabel).toBe('Mini Quote')
    wrapper.unmount()
  })

  test('with top-gainers widget added expect userLabel set to friendly label', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    wrapper.vm.addWidget({ type: 'top-gainers', label: 'Top Gainers' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].userLabel).toBe('Top Gainers')
    wrapper.unmount()
  })

  test('with enhanced-quote-v4 added expect userLabel set to Enhanced Quote', async () => {
    // Arrange
    const wrapper = mountGrid()
    await nextTick()

    // Act
    wrapper.vm.addWidget({ type: 'enhanced-quote-v4', label: 'Enhanced Quote' })
    await nextTick()

    // Assert
    expect(wrapper.vm.layout[0].userLabel).toBe('Enhanced Quote')
    wrapper.unmount()
  })
})

// ── defineExpose includes addWidget ───────────────────────────────────────────────

describe('exposed interface', () => {
  test('with DashboardGrid mounted expect addWidget exposed on vm', async () => {
    // Arrange / Act
    const wrapper = mountGrid()
    await nextTick()

    // Assert
    expect(wrapper.vm.addWidget).toBeDefined()
    expect(wrapper.vm.layout).toBeDefined()
    expect(wrapper.vm.dashboardColNum).toBeDefined()
    wrapper.unmount()
  })
})

// ── Autosave on dashboardColNum change ──────────────────────────────────────────────────────

describe('dashboardColNum autosave', () => {
  test('with autosave enabled and colNum changed expect dashboardColNum written to storage', async () => {
    // Arrange
    vi.useFakeTimers()
    seedLayouts({
      'my-layout': {
        layout: [], widgetCounter: 0, dashboardColNum: 12,
        created: Date.now(), modified: Date.now(), description: '',
      }
    }, 'my-layout')
    const wrapper = mountGrid()
    await nextTick()
    await nextTick()

    // Ensure edit mode and autosave on
    await wrapper.find('button[title="Unlock layout (edit mode)"]').trigger('click')
    await nextTick()
    const autosaveBtn = wrapper.find('button[title="Autosave ON \u2014 click to disable"]')
    if (!autosaveBtn.exists()) {
      // autosave already off — enable it
      await wrapper.find('button[title="Autosave OFF \u2014 click to enable"]').trigger('click')
      await nextTick()
    }

    // Act — change column count
    wrapper.vm.dashboardColNum = 24
    await nextTick()
    vi.runAllTimers()
    await nextTick()

    // Assert — storage contains updated dashboardColNum for the selected layout
    const call = localStorageMock.setItem.mock.calls
      .reverse()
      .find(([k]) => k === 'dashboard-layouts')
    expect(call).toBeDefined()
    const saved = JSON.parse(call[1])
    expect(saved['my-layout']?.dashboardColNum).toBe(24)

    vi.useRealTimers()
    wrapper.unmount()
  })

  test('with autosave disabled and colNum changed expect storage not updated', async () => {
    // Arrange
    vi.useFakeTimers()
    seedLayouts({
      'my-layout': {
        layout: [], widgetCounter: 0, dashboardColNum: 12,
        created: Date.now(), modified: Date.now(), description: '',
      }
    }, 'my-layout')
    const wrapper = mountGrid()
    await nextTick()
    await nextTick()

    // Unlock, then disable autosave
    await wrapper.find('button[title="Unlock layout (edit mode)"]').trigger('click')
    await nextTick()
    // Toggle autosave off (it's on by default)
    const autosaveOnBtn = wrapper.find('button[title="Autosave ON \u2014 click to disable"]')
    if (autosaveOnBtn.exists()) {
      await autosaveOnBtn.trigger('click')
      await nextTick()
    }

    localStorageMock.setItem.mockClear()

    // Act
    wrapper.vm.dashboardColNum = 24
    await nextTick()
    vi.runAllTimers()
    await nextTick()

    // Assert — no layout write triggered
    const layoutWrite = localStorageMock.setItem.mock.calls.find(([k]) => k === 'dashboard-layouts')
    expect(layoutWrite).toBeUndefined()

    vi.useRealTimers()
    wrapper.unmount()
  })
})

// ── Layout switch col-count ordering (BUG-2 regression) ────────────────────────────────

describe('dashboardColNum on layout switch', () => {
  test('with switch from 12-col layout to 24-col layout expect grid renders col-num 24', async () => {
    // Arrange — two layouts: source=12 cols, target=24 cols
    // Target has widget positions valid at 24 cols (x=12 is out-of-bounds at 12 cols)
    seedLayouts({
      'source-layout': {
        layout: [{ x: 0, y: 0, w: 6, h: 19, i: 'widget-0', type: 'quote' }],
        widgetCounter: 1, dashboardColNum: 12,
        created: Date.now(), modified: Date.now(), description: '',
      },
      'target-layout': {
        layout: [{ x: 12, y: 0, w: 12, h: 19, i: 'widget-0', type: 'quote' }],
        widgetCounter: 1, dashboardColNum: 24,
        created: Date.now(), modified: Date.now(), description: '',
      },
    }, 'source-layout')

    const wrapper = mountGrid()
    await nextTick()
    await nextTick()

    // Confirm loaded on source layout at 12 cols
    expect(wrapper.vm.dashboardColNum).toBe(12)

    // Act — switch to 24-col layout (mirrors selectLayout() flow)
    wrapper.vm.selectedLayoutName = 'target-layout'
    wrapper.vm.loadLayout()
    await nextTick()
    await nextTick()

    // Assert — col-num must be 24 (not mangled by intermediate 12-col render)
    expect(wrapper.vm.dashboardColNum).toBe(24)
    expect(wrapper.find('.mock-grid-layout').attributes('data-col-num')).toBe('24')

    wrapper.unmount()
  })
})
