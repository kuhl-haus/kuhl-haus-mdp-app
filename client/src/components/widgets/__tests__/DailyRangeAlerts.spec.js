import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Mock useWebSocketClient ───────────────────────────────────────────────────
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:  ref(null),
      isConnected: ref(true),
      reconnecting: ref(false),
      feedName:    ref(config.feedName || ''),
      cacheKey:    ref(config.cacheKey || ''),
      connect:     vi.fn(),
      disconnect:  vi.fn(),
    })),
  }
})

// ── Mock useScannerLink ───────────────────────────────────────────────────────
vi.mock('@/composables/useScannerLink.js', async () => {
  const { ref } = await import('vue')
  return {
    useScannerLink: vi.fn(() => ({
      activeTicker: ref(null),
      onRowClick:   vi.fn(),
    })),
  }
})

vi.mock('@/composables/useWidgetBus.js', async () => {
  const { reactive } = await import('vue')
  return {
    getFlameVariant:  vi.fn(() => null),
    getFlameTooltip:  vi.fn(() => ''),
    newsTimestamps:   reactive({}),
    getActiveTicker:  vi.fn(() => null),
    setActiveTicker:  vi.fn(),
    clearActiveTicker: vi.fn(),
  }
})

import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { getFlameVariant } from '@/composables/useWidgetBus.js'
import DailyRangeAlerts from '../DailyRangeAlerts.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  isLocked:  true,
  colWidths: {},
  linkColor: null,
  isMobile:  false,
  settings:  {},
}

function makeEvent(overrides = {}) {
  return {
    symbol:             'AAPL',
    timestamp:          1_000_000,
    price:              10,
    previous:           9,
    note:               '',
    pct_change:         10,
    accumulated_volume: 1_000_000,
    relative_volume:    2,
    session:            'regular',
    avg_volume:         500_000,
    free_float:         10_000_000,
    change:             1,
    close:              10,
    direction:          'high',
    ...overrides,
  }
}

function getOnData(callIndex = 0) {
  return vi.mocked(useWebSocketClient).mock.calls[callIndex][0].onData
}

function getWsReturn(callIndex = 0) {
  return vi.mocked(useWebSocketClient).mock.results[callIndex].value
}

function countDataRows(wrapper) {
  // data rows appear when filteredEvents.length > 0 (empty-state row hidden)
  const trs = wrapper.findAll('tbody tr')
  if (trs.length === 0) return 0
  // If the only row is the empty-state, return 0
  if (trs.length === 1 && trs[0].find('.empty-state').exists()) return 0
  return trs.length
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Filter isolation tests ────────────────────────────────────────────────────

describe('Filter isolation', () => {
  test('minPrice excludes events where price < threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 5 } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'LOW', price: 3 }), makeEvent({ symbol: 'HIGH', price: 7 })])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('HIGH')
    expect(wrapper.text()).not.toContain('LOW')
    wrapper.unmount()
  })

  test('maxPrice excludes events where price > threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxPrice: 10 } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'OK', price: 8 }), makeEvent({ symbol: 'TOO_HIGH', price: 15 })])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('OK')
    expect(wrapper.text()).not.toContain('TOO_HIGH')
    wrapper.unmount()
  })

  test('minPrice === 0 is valid; all events with price >= 0 pass', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 0 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'FREE', price: 0 }),
      makeEvent({ symbol: 'PAID', price: 5 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(2)
    wrapper.unmount()
  })

  test('minVolume excludes events where accumulated_volume < threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minVolume: 1_000_000 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'LOWVOL', accumulated_volume: 500_000 }),
      makeEvent({ symbol: 'HIVOL',  accumulated_volume: 2_000_000 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('HIVOL')
    wrapper.unmount()
  })

  test('minRelVol excludes events where relative_volume < threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minRelVol: 3 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'LOWRV', relative_volume: 1.5 }),
      makeEvent({ symbol: 'HIRV',  relative_volume: 5 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('HIRV')
    wrapper.unmount()
  })

  test('minAvgVol excludes events where avg_volume < threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minAvgVol: 1_000_000 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'LOAVG', avg_volume: 100_000 }),
      makeEvent({ symbol: 'HIAVG', avg_volume: 2_000_000 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('HIAVG')
    wrapper.unmount()
  })

  test('minFloat excludes events where free_float < threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minFloat: 5_000_000 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'SMFL', free_float: 1_000_000 }),
      makeEvent({ symbol: 'LGFL', free_float: 10_000_000 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('LGFL')
    wrapper.unmount()
  })

  test('maxFloat excludes events where free_float > threshold', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxFloat: 5_000_000 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'SMFL', free_float: 1_000_000 }),
      makeEvent({ symbol: 'LGFL', free_float: 10_000_000 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('SMFL')
    wrapper.unmount()
  })

  test('sessionFilter "regular" includes only regular session events', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { sessionFilter: 'regular' } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'REG', session: 'regular' }),
      makeEvent({ symbol: 'PRE', session: 'pre' }),
      makeEvent({ symbol: 'AH',  session: 'after' }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('REG')
    expect(wrapper.text()).not.toContain('PRE')
    wrapper.unmount()
  })

  test('pctChangeThreshold HOD feed value 5 excludes events where pct_change < 5', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod', pctChangeThreshold: 5 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'LOW', pct_change: 3 }),
      makeEvent({ symbol: 'HIGH', pct_change: 8 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('HIGH')
    wrapper.unmount()
  })

  test('pctChangeThreshold LOD feed value -5 excludes events where pct_change > -5', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'lod', pctChangeThreshold: -5 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'ABOVE', pct_change: -2 }),   // -2 > -5, excluded
      makeEvent({ symbol: 'BELOW', pct_change: -8 }),   // -8 <= -5, passes
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('BELOW')
    expect(wrapper.text()).not.toContain('ABOVE')
    wrapper.unmount()
  })

  test('pctChangeThreshold === 0 HOD: pct_change >= 0 passes, negative excluded', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod', pctChangeThreshold: 0 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'ZERO', pct_change: 0 }),
      makeEvent({ symbol: 'POS',  pct_change: 5 }),
      makeEvent({ symbol: 'NEG',  pct_change: -1 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(2)
    expect(wrapper.text()).toContain('ZERO')
    expect(wrapper.text()).toContain('POS')
    expect(wrapper.text()).not.toContain('NEG')
    wrapper.unmount()
  })

  test('pctChangeThreshold === 0 LOD: pct_change <= 0 passes, positive excluded', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'lod', pctChangeThreshold: 0 } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'ZERO', pct_change: 0 }),
      makeEvent({ symbol: 'NEG',  pct_change: -5 }),
      makeEvent({ symbol: 'POS',  pct_change: 1 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(2)
    expect(wrapper.text()).toContain('ZERO')
    expect(wrapper.text()).toContain('NEG')
    expect(wrapper.text()).not.toContain('POS')
    wrapper.unmount()
  })

  test('pctChangeThreshold === null disables filter; no events excluded', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod', pctChangeThreshold: null } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'NEG', pct_change: -10 }),
      makeEvent({ symbol: 'POS', pct_change: 10 }),
    ])
    await nextTick()

    expect(countDataRows(wrapper)).toBe(2)
    wrapper.unmount()
  })
})

// ── Data flow tests ───────────────────────────────────────────────────────────

describe('Data flow', () => {
  test('cache hydration: events sorted timestamp DESC regardless of server order', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()

    // Server sends in ascending order
    onData([
      makeEvent({ symbol: 'FIRST',  timestamp: 1000 }),
      makeEvent({ symbol: 'SECOND', timestamp: 2000 }),
      makeEvent({ symbol: 'THIRD',  timestamp: 3000 }),
    ])
    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    // THIRD should be first (highest timestamp)
    expect(rows[0].text()).toContain('THIRD')
    expect(rows[1].text()).toContain('SECOND')
    expect(rows[2].text()).toContain('FIRST')
    wrapper.unmount()
  })

  test('live event prepend: new event appears at index 0', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()

    // Hydrate with one event
    onData([makeEvent({ symbol: 'OLD', timestamp: 1000 })])
    await nextTick()

    // Live event arrives
    onData(makeEvent({ symbol: 'NEW', timestamp: 2000 }))
    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('NEW')
    expect(rows[1].text()).toContain('OLD')
    wrapper.unmount()
  })

  test('maxEvents cap value 3: when 4th event arrives oldest is dropped', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 3 } },
    })
    const onData = getOnData()

    // Hydrate with 3 events
    onData([
      makeEvent({ symbol: 'E1', timestamp: 1000 }),
      makeEvent({ symbol: 'E2', timestamp: 2000 }),
      makeEvent({ symbol: 'E3', timestamp: 3000 }),
    ])
    await nextTick()
    expect(countDataRows(wrapper)).toBe(3)

    // 4th live event arrives — oldest (E1) should be dropped
    onData(makeEvent({ symbol: 'E4', timestamp: 4000 }))
    await nextTick()

    expect(countDataRows(wrapper)).toBe(3)
    expect(wrapper.text()).toContain('E4')
    expect(wrapper.text()).toContain('E3')
    expect(wrapper.text()).toContain('E2')
    expect(wrapper.text()).not.toContain('E1')
    wrapper.unmount()
  })

  test('maxEvents === 0 is unlimited: events accumulate without cap', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 0 } },
    })
    const onData = getOnData()

    const manyEvents = Array.from({ length: 10 }, (_, i) =>
      makeEvent({ symbol: `E${i}`, timestamp: i * 1000 })
    )
    onData(manyEvents)
    await nextTick()

    expect(countDataRows(wrapper)).toBe(10)
    wrapper.unmount()
  })

  test('LOD widget connects to LOD feed on mount (not HOD)', () => {
    // Regression: initFeed must use config.value.feed, not DEFAULT_SETTINGS.feed.
    // A widget saved with feed: 'lod' must connect to daily_range_lod_alert on mount.
    mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'lod' } },
    })
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[
      vi.mocked(useWebSocketClient).mock.calls.length - 1
    ][0]
    expect(callArgs.feedName).toBe('daily_range_lod_alert')
    expect(callArgs.cacheKey).toBe('daily_range_lod_alert')
  })

  test('HOD widget connects to HOD feed on mount', () => {
    mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod' } },
    })
    const callArgs = vi.mocked(useWebSocketClient).mock.calls[
      vi.mocked(useWebSocketClient).mock.calls.length - 1
    ][0]
    expect(callArgs.feedName).toBe('daily_range_hod_alert')
    expect(callArgs.cacheKey).toBe('daily_range_hod_alert')
  })

  test('feed switch: events cleared before reconnect', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { feed: 'hod' } },
    })
    const onData = getOnData()

    // Inject some events
    onData([makeEvent({ symbol: 'AAPL' }), makeEvent({ symbol: 'TSLA' })])
    await nextTick()
    expect(countDataRows(wrapper)).toBe(2)

    // Switch feed — events should be cleared
    await wrapper.setProps({ settings: { feed: 'lod' } })
    await nextTick()

    expect(countDataRows(wrapper)).toBe(0)
    expect(wrapper.find('.empty-state').text()).toBe('No alerts yet')

    // Verify disconnect and connect were called
    const ws = getWsReturn(0)
    expect(ws.disconnect).toHaveBeenCalled()
    expect(ws.connect).toHaveBeenCalled()
    wrapper.unmount()
  })
})

// ── maxEvents input validation ────────────────────────────────────────────────

describe('maxEvents input validation', () => {
  async function getMaxEventsInput(wrapper) {
    // Open controls panel first
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
    return wrapper.find('[data-testid="max-events-input"]')
  }

  // Note: wrapper.emitted() does not capture Vue emissions from <script setup> components
  // in VTU 2.4.x / jsdom. The attrs listener pattern is used here intentionally.

  test('input -1 is clamped to 0', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)

    // VTU's setValue dispatches both input and change events — no separate trigger needed
    await input.setValue('-1')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[settingsCalls.length - 1].maxEvents).toBe(0)
    wrapper.unmount()
  })

  test('input 100001 is clamped to 100000', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)

    await input.setValue('100001')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[settingsCalls.length - 1].maxEvents).toBe(100_000)
    wrapper.unmount()
  })

  test('input 50 is stored as 50', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)

    await input.setValue('50')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[settingsCalls.length - 1].maxEvents).toBe(50)
    wrapper.unmount()
  })

  test('input 0 is stored as 0 (unlimited)', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)

    await input.setValue('0')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[settingsCalls.length - 1].maxEvents).toBe(0)
    wrapper.unmount()
  })

  test('empty input reverts to prior valid value — no new emission', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 50 } },
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)
    const countBefore = settingsCalls.length

    // setValue dispatches input + change; empty triggers revert path (no emit)
    await input.setValue('')
    await nextTick()

    expect(settingsCalls.length).toBe(countBefore)
    wrapper.unmount()
  })

  test('NaN input reverts to prior valid value — no new emission', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 75 } },
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    const input = await getMaxEventsInput(wrapper)
    const countBefore = settingsCalls.length

    // setValue dispatches input + change; NaN triggers revert path (no emit)
    await input.setValue('not-a-number')
    await nextTick()

    expect(settingsCalls.length).toBe(countBefore)
    wrapper.unmount()
  })
})

// ── _seq uniqueness and per-instance scope ────────────────────────────────────

describe('_seq uniqueness and per-instance scope', () => {
  test('two events with identical data get distinct _seq values (both rows rendered)', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData(0)

    const identical = makeEvent({ symbol: 'AAPL', timestamp: 1000, direction: 'high' })
    onData([identical, identical])
    await nextTick()

    // Both events must appear as separate rows (proves distinct _seq keys)
    expect(countDataRows(wrapper)).toBe(2)
    wrapper.unmount()
  })

  test('two independently mounted instances each start _seq from 0', async () => {
    const w1 = mount(DailyRangeAlerts, { props: defaultProps })
    const w2 = mount(DailyRangeAlerts, { props: defaultProps })

    const onData1 = getOnData(0)
    const onData2 = getOnData(1)

    // Instance 1: 3 events
    onData1([
      makeEvent({ symbol: 'A1', timestamp: 3000 }),
      makeEvent({ symbol: 'A2', timestamp: 2000 }),
      makeEvent({ symbol: 'A3', timestamp: 1000 }),
    ])
    // Instance 2: 2 events (after instance 1 has consumed _seq 0, 1, 2 if module-scoped)
    onData2([
      makeEvent({ symbol: 'B1', timestamp: 2000 }),
      makeEvent({ symbol: 'B2', timestamp: 1000 }),
    ])
    await nextTick()

    // Each instance should render exactly its own events independently
    expect(countDataRows(w1)).toBe(3)
    expect(countDataRows(w2)).toBe(2)

    w1.unmount()
    w2.unmount()
  })
})

// ── Column resize persistence (DOM/integration test) ─────────────────────────

describe('Column resize', () => {
  // DOM/integration test: dragging a column handle emits update-col-widths and update-settings
  // Note: wrapper.emitted() does not capture Vue emissions from <script setup> in VTU 2.4.x.
  // Using attrs listener pattern instead.
  test('dragging resize handle emits update-col-widths and update-settings with colWidths', async () => {
    const colWidthsCalls = []
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, isLocked: false },
      attrs: {
        'onUpdate-col-widths': (w) => colWidthsCalls.push(w),
        'onUpdate-settings': (s) => settingsCalls.push(s),
      },
      attachTo: document.body,
    })

    const th = wrapper.findAll('th')[0]
    const handle = th.find('.col-resize-handle')
    expect(handle.exists()).toBe(true)

    // mousedown on handle
    await handle.trigger('mousedown', { clientX: 100 })

    // mousemove on document (simulates drag)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, bubbles: true }))

    // mouseup on document (simulates release)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await nextTick()

    expect(colWidthsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls[settingsCalls.length - 1]).toHaveProperty('colWidths')

    wrapper.unmount()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('Empty state', () => {
  test('events empty and connected renders "No alerts yet"', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toBe('No alerts yet')
    wrapper.unmount()
  })

  test('events present but all filtered renders "No events match your filters"', async () => {
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { minPrice: 100 } },
    })
    const onData = getOnData()

    // Inject events that all fail the minPrice filter
    onData([makeEvent({ symbol: 'CHEAP', price: 5 })])
    await nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toBe('No events match your filters')
    wrapper.unmount()
  })
})

// ── Reactive loop regression ──────────────────────────────────────────────────────────────

describe('Reactive loop regression', () => {
  // Regression: spreading hiddenColsLocal in the settings watcher always created a new
  // array reference, triggering the watch → emitSettings → props change → watch → ∞ loop.
  // Fix: preserve the array reference (no spread) so Vue detects no change when the
  // same hiddenCols reference comes back from the parent after emitSettings.
  // This test would have failed with the original spread code.
  test('settings watcher does not loop when hiddenCols reference is stable', async () => {
    const emitted = []
    const hiddenCols = []  // stable reference
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { hiddenCols } },
      attrs: { 'onUpdate-settings': (s) => emitted.push(s) },
    })
    const before = emitted.length

    // Simulate parent passing back the same hiddenCols reference (as updateSettings does
    // via { ...settings } spread which preserves the array reference)
    await wrapper.setProps({ settings: { hiddenCols } })
    await nextTick()
    await nextTick()

    // No additional emissions — the loop is broken
    expect(emitted.length - before).toBe(0)
    wrapper.unmount()
  })
})

// ── Flame icon ────────────────────────────────────────────────────────────────

describe('Flame icon', () => {
  test('renders flame img in symbol cell when variant is available', async () => {
    // Arrange
    vi.mocked(getFlameVariant).mockReturnValue('red')
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()

    // Act
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Assert — flame img present and src is non-empty
    // (In the test environment import.meta.url resolves to a data URL, not a filename)
    const img = wrapper.find('.symbol-cell img.flame-icon')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
    wrapper.unmount()
  })

  test('does not render flame img when no variant is available', async () => {
    // Arrange
    vi.mocked(getFlameVariant).mockReturnValue(null)
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()

    // Act
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Assert — no flame icon rendered
    expect(wrapper.find('.flame-icon').exists()).toBe(false)
    wrapper.unmount()
  })
})

// ── Relative volume styling ───────────────────────────────────────────────────

describe('Relative volume cell styling', () => {
  async function getRelVolCell(wrapper, relVol) {
    const onData = getOnData()
    onData([makeEvent({ relative_volume: relVol })])
    await nextTick()
    return wrapper.find('td.relative_volume')
  }

  test('relative_volume >= 5 gets extreme class', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const cell = await getRelVolCell(wrapper, 5)
    expect(cell.classes()).toContain('extreme')
    wrapper.unmount()
  })

  test('relative_volume >= 3 and < 5 gets high class', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const cell = await getRelVolCell(wrapper, 3)
    expect(cell.classes()).toContain('high')
    wrapper.unmount()
  })

  test('relative_volume >= 2 and < 3 gets medium class', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const cell = await getRelVolCell(wrapper, 2)
    expect(cell.classes()).toContain('medium')
    wrapper.unmount()
  })

  test('relative_volume < 2 gets normal class', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const cell = await getRelVolCell(wrapper, 1.5)
    expect(cell.classes()).toContain('normal')
    wrapper.unmount()
  })

  test('relative_volume threshold boundary: 4.99 gets high not extreme', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const cell = await getRelVolCell(wrapper, 4.99)
    expect(cell.classes()).toContain('high')
    expect(cell.classes()).not.toContain('extreme')
    wrapper.unmount()
  })
})

// ── Column order ──────────────────────────────────────────────────────────────

describe('Column order', () => {
  async function openControls(wrapper) {
    await wrapper.find('.col-menu-btn').trigger('click')
    await nextTick()
  }

  test('default order matches columns array order', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()

    const ths = wrapper.findAll('th')
    // First two visible columns by default are Time and Symbol
    expect(ths[0].text()).toContain('Time')
    expect(ths[1].text()).toContain('Symbol')
    wrapper.unmount()
  })

  test('moveCol up: ▲ button moves column up in settings panel list', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)

    // Click ▲ on the second column item (idx 1) — should move it to idx 0
    const items = wrapper.findAll('.col-menu-item')
    const upBtn = items[1].find('button[title="Move up"]')
    await upBtn.trigger('click')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    // The item that was at idx 1 should now be at idx 0
    const defaultOrder = ['timestamp', 'symbol', 'price', 'previous', 'note', 'pct_change',
      'accumulated_volume', 'relative_volume', 'session', 'close', 'change',
      'pct_change_since_open', 'free_float', 'avg_volume', 'vwap', 'prev_day_close', 'direction']
    expect(emittedOrder[0]).toBe(defaultOrder[1])
    expect(emittedOrder[1]).toBe(defaultOrder[0])
    wrapper.unmount()
  })

  test('moveCol down: ▼ button moves column down in settings panel list', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)

    // Click ▼ on the first column item (idx 0)
    const items = wrapper.findAll('.col-menu-item')
    const downBtn = items[0].find('button[title="Move down"]')
    await downBtn.trigger('click')
    await nextTick()

    expect(settingsCalls.length).toBeGreaterThan(0)
    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    const defaultOrder = ['timestamp', 'symbol', 'price', 'previous', 'note', 'pct_change',
      'accumulated_volume', 'relative_volume', 'session', 'close', 'change',
      'pct_change_since_open', 'free_float', 'avg_volume', 'vwap', 'prev_day_close', 'direction']
    expect(emittedOrder[0]).toBe(defaultOrder[1])
    expect(emittedOrder[1]).toBe(defaultOrder[0])
    wrapper.unmount()
  })

  test('▲ button disabled on first item', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)

    const items = wrapper.findAll('.col-menu-item')
    const upBtn = items[0].find('button[title="Move up"]')
    expect(upBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('▼ button disabled on last item', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)

    const items = wrapper.findAll('.col-menu-item')
    const lastItem = items[items.length - 1]
    const downBtn = lastItem.find('button[title="Move down"]')
    expect(downBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('saved colOrder is restored from settings prop', async () => {
    const reversed = ['direction', 'prev_day_close', 'vwap', 'avg_volume', 'free_float',
      'pct_change_since_open', 'change', 'close', 'session', 'relative_volume',
      'accumulated_volume', 'pct_change', 'note', 'previous', 'price', 'symbol', 'timestamp']
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { colOrder: reversed } },
    })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()

    const ths = wrapper.findAll('th')
    // First visible column should be direction (not hidden; it's at idx 0 in reversed order)
    expect(ths[0].text()).toContain('Direction')
    wrapper.unmount()
  })

  test('colOrder in emitted settings contains all column keys', async () => {
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)

    const items = wrapper.findAll('.col-menu-item')
    await items[1].find('button[title="Move up"]').trigger('click')
    await nextTick()

    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    expect(emittedOrder.length).toBe(17)  // total column count
    wrapper.unmount()
  })

  test('unknown saved colOrder keys are dropped; missing keys appended', async () => {
    // Settings has a stale key 'old_col' and is missing several columns
    const partialOrder = ['symbol', 'old_col', 'price']
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { colOrder: partialOrder } },
    })
    await openControls(wrapper)

    const items = wrapper.findAll('.col-menu-item')
    // 'old_col' must not appear; total items = all known columns
    const labels = items.map(i => i.text())
    expect(labels.some(l => l.includes('old_col'))).toBe(false)
    expect(items.length).toBe(17)
    wrapper.unmount()
  })

  test('column order reflected in table header order after move', async () => {
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()

    // Move Symbol (idx 1) up to idx 0
    const items = wrapper.findAll('.col-menu-item')
    await items[1].find('button[title="Move up"]').trigger('click')
    await nextTick()

    const ths = wrapper.findAll('th')
    expect(ths[0].text()).toContain('Symbol')
    expect(ths[1].text()).toContain('Time')
    wrapper.unmount()
  })
})
