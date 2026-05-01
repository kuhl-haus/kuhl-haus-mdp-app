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
import { useScannerLink } from '@/composables/useScannerLink.js'
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

  test('live event prepend: new event appears at index 0 after RAF flush', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()

    // Hydrate with one event (synchronous — array payload)
    onData([makeEvent({ symbol: 'OLD', timestamp: 1000 })])
    await nextTick()

    // Live event arrives — buffered until RAF fires
    onData(makeEvent({ symbol: 'NEW', timestamp: 2000 }))
    vi.advanceTimersByTime(20)
    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('NEW')
    expect(rows[1].text()).toContain('OLD')
    wrapper.unmount()
    vi.useRealTimers()
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

    // 4th live event arrives — buffered until RAF fires
    vi.useFakeTimers()
    onData(makeEvent({ symbol: 'E4', timestamp: 4000 }))
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(countDataRows(wrapper)).toBe(3)
    expect(wrapper.text()).toContain('E4')
    expect(wrapper.text()).toContain('E3')
    expect(wrapper.text()).toContain('E2')
    expect(wrapper.text()).not.toContain('E1')
    wrapper.unmount()
    vi.useRealTimers()
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

// Default column order — matches the `columns` array declaration in DailyRangeAlerts.vue.
// Use this constant instead of hardcoded arrays or magic numbers in column order tests.
const DEFAULT_COL_ORDER = [
  'timestamp', 'symbol', 'price', 'previous', 'note', 'pct_change',
  'accumulated_volume', 'relative_volume', 'session', 'close', 'change',
  'pct_change_since_open', 'free_float', 'avg_volume', 'vwap', 'prev_day_close', 'direction',
]

describe('Relative volume cell styling', () => {
  test('relative_volume >= 5 gets extreme class', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 5 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('extreme')
    wrapper.unmount()
  })

  test('relative_volume >= 3 and < 5 gets high class', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 3 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('high')
    wrapper.unmount()
  })

  test('relative_volume >= 2 and < 3 gets medium class', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 2 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('medium')
    wrapper.unmount()
  })

  test('relative_volume < 2 gets normal class', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 1.5 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('normal')
    wrapper.unmount()
  })

  test('relative_volume threshold boundary: 4.99 gets high not extreme', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 4.99 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('high')
    expect(cell.classes()).not.toContain('extreme')
    wrapper.unmount()
  })

  test('relative_volume threshold boundary: 2.99 gets medium not high', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 2.99 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('medium')
    expect(cell.classes()).not.toContain('high')
    wrapper.unmount()
  })

  test('relative_volume threshold boundary: 1.99 gets normal not medium', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ relative_volume: 1.99 })])
    await nextTick()

    // Act
    const cell = wrapper.find('td.relative_volume')

    // Assert
    expect(cell.classes()).toContain('normal')
    expect(cell.classes()).not.toContain('medium')
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
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()

    // Act
    const ths = wrapper.findAll('th')

    // Assert — first two visible columns by default are Time and Symbol
    expect(ths[0].text()).toContain('Time')
    expect(ths[1].text()).toContain('Symbol')
    wrapper.unmount()
  })

  test('moveCol up: ▲ button moves column up in settings panel list', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)
    const items = wrapper.findAll('.col-menu-item')

    // Act — click ▲ on second item (idx 1), moves it to idx 0
    await items[1].find('button[title="Move up"]').trigger('click')
    await nextTick()

    // Assert
    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    expect(emittedOrder[0]).toBe(DEFAULT_COL_ORDER[1])
    expect(emittedOrder[1]).toBe(DEFAULT_COL_ORDER[0])
    wrapper.unmount()
  })

  test('moveCol down: ▼ button moves column down in settings panel list', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)
    const items = wrapper.findAll('.col-menu-item')

    // Act — click ▼ on first item (idx 0), moves it to idx 1
    await items[0].find('button[title="Move down"]').trigger('click')
    await nextTick()

    // Assert
    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    expect(emittedOrder[0]).toBe(DEFAULT_COL_ORDER[1])
    expect(emittedOrder[1]).toBe(DEFAULT_COL_ORDER[0])
    wrapper.unmount()
  })

  test('▲ button disabled on first item', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)

    // Act
    const upBtn = wrapper.findAll('.col-menu-item')[0].find('button[title="Move up"]')

    // Assert
    expect(upBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('▼ button disabled on last item', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)

    // Act
    const items = wrapper.findAll('.col-menu-item')
    const downBtn = items[items.length - 1].find('button[title="Move down"]')

    // Assert
    expect(downBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('saved colOrder is restored from settings prop', async () => {
    // Arrange
    const reversed = [...DEFAULT_COL_ORDER].reverse()
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { colOrder: reversed } },
    })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()

    // Act
    const ths = wrapper.findAll('th')

    // Assert — first visible column should be VWAP (idx 0 in reversed order)
    expect(ths[0].text()).toContain('VWAP')
    wrapper.unmount()
  })

  test('colOrder in emitted settings contains all column keys', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })
    await openControls(wrapper)
    const items = wrapper.findAll('.col-menu-item')

    // Act
    await items[1].find('button[title="Move up"]').trigger('click')
    await nextTick()

    // Assert
    const emittedOrder = settingsCalls[settingsCalls.length - 1].colOrder
    expect(emittedOrder.length).toBe(DEFAULT_COL_ORDER.length)
    wrapper.unmount()
  })

  test('unknown saved colOrder keys are dropped; missing keys appended', async () => {
    // Arrange — settings has a stale key 'old_col' and is missing several columns
    const partialOrder = ['symbol', 'old_col', 'price']
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { colOrder: partialOrder } },
    })
    await openControls(wrapper)

    // Act
    const items = wrapper.findAll('.col-menu-item')

    // Assert — 'old_col' absent; all known columns present
    const labels = items.map(i => i.text())
    expect(labels.some(l => l.includes('old_col'))).toBe(false)
    expect(items.length).toBe(DEFAULT_COL_ORDER.length)
    wrapper.unmount()
  })

  test('column order reflected in table header order after move', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await openControls(wrapper)
    const onData = getOnData()
    onData([makeEvent()])
    await nextTick()
    const items = wrapper.findAll('.col-menu-item')

    // Act — move Symbol (idx 1) up to idx 0
    await items[1].find('button[title="Move up"]').trigger('click')
    await nextTick()

    // Assert
    const ths = wrapper.findAll('th')
    expect(ths[0].text()).toContain('Symbol')
    expect(ths[1].text()).toContain('Time')
    wrapper.unmount()
  })
})

// ── Ticker filter input ───────────────────────────────────────────────────────

describe('Ticker filter input', () => {
  test('filter input is rendered by default', () => {
    // Arrange + Act
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-input"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('typing a ticker filters rows to matching symbol only', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'AAPL' }),
      makeEvent({ symbol: 'TSLA' }),
    ])
    await nextTick()

    // Act
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('AAPL')
    await nextTick()

    // Assert
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('AAPL')
    wrapper.unmount()
  })

  test('typing a non-matching ticker shows empty state', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Act
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('ZZZZ')
    await nextTick()

    // Assert
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    wrapper.unmount()
  })

  test('ticker filter is case-insensitive: lowercase input matches uppercase symbol', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'AAPL' }),
      makeEvent({ symbol: 'TSLA' }),
    ])
    await nextTick()

    // Act
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('aapl')
    await nextTick()

    // Assert — AAPL row is visible despite lowercase input
    const rows = wrapper.findAll('tbody tr').filter(r => !r.find('.empty-state').exists())
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('AAPL')
    wrapper.unmount()
  })

  test('clear button is absent when filter is empty', () => {
    // Arrange + Act
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-clear"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('clear button is present when filter is non-empty', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })

    // Act
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('AAPL')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-clear"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('clicking clear button removes the filter and shows all rows', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'AAPL' }),
      makeEvent({ symbol: 'TSLA' }),
    ])
    await nextTick()
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('AAPL')
    await nextTick()

    // Act
    await wrapper.find('[data-testid="ticker-filter-clear"]').trigger('click')
    await nextTick()

    // Assert — both rows visible again
    expect(countDataRows(wrapper)).toBe(2)
    wrapper.unmount()
  })

  test('tickerFilter is NOT included in emitted settings', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })

    // Act — set ticker filter, then trigger a real emitSettings via mode toggle
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('AAPL')
    await nextTick()
    await wrapper.find('[data-testid="row-click-mode-toggle"]').trigger('click')
    await nextTick()

    // Assert — guard against vacuous truth, then verify tickerFilter absent from all payloads
    expect(settingsCalls.length).toBeGreaterThan(0)
    expect(settingsCalls.every(s => !('tickerFilter' in s))).toBe(true)
    wrapper.unmount()
  })
})

// ── Row-click mode toggle ─────────────────────────────────────────────────────

describe('Row-click mode toggle', () => {
  test('mode toggle button renders when isLocked is true', () => {
    // Arrange + Act
    const wrapper = mount(DailyRangeAlerts, { props: { ...defaultProps, isLocked: true } })

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('mode toggle button renders when isLocked is false', () => {
    // Arrange + Act
    const wrapper = mount(DailyRangeAlerts, { props: { ...defaultProps, isLocked: false } })

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('default mode is select (link) — button shows "select"', () => {
    // Arrange + Act
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').text()).toBe('select')
    wrapper.unmount()
  })

  test('default mode is select when saved settings have no rowClickMode field', () => {
    // Arrange + Act — saved settings pre-feature have no rowClickMode
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { hiddenCols: [] } },
    })

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').text()).toBe('select')
    wrapper.unmount()
  })

  test('clicking toggle switches mode to filter — button shows "filter"', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })

    // Act
    await wrapper.find('[data-testid="row-click-mode-toggle"]').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').text()).toBe('filter')
    wrapper.unmount()
  })

  test('clicking toggle again switches back to select', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await wrapper.find('[data-testid="row-click-mode-toggle"]').trigger('click')
    await nextTick()

    // Act
    await wrapper.find('[data-testid="row-click-mode-toggle"]').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="row-click-mode-toggle"]').text()).toBe('select')
    wrapper.unmount()
  })

  test('rowClickMode is included in emitted settings', async () => {
    // Arrange
    const settingsCalls = []
    const wrapper = mount(DailyRangeAlerts, {
      props: defaultProps,
      attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
    })

    // Act
    await wrapper.find('[data-testid="row-click-mode-toggle"]').trigger('click')
    await nextTick()

    // Assert
    const last = settingsCalls[settingsCalls.length - 1]
    expect(last.rowClickMode).toBe('filter')
    wrapper.unmount()
  })

  test('filter mode: row click sets tickerFilter', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Act
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('AAPL')
    wrapper.unmount()
  })

  test('filter mode: row click also activates linked widgets via onRowClick', async () => {
    // Arrange — capture the onRowClick mock for this specific wrapper instance
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const mockOnRowClick = vi.mocked(useScannerLink).mock.results[callsBefore].value.onRowClick
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Act
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert
    expect(mockOnRowClick).toHaveBeenCalled()
    wrapper.unmount()
  })

  test('filter mode: clicking same-symbol row clears tickerFilter', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()
    // Set filter by first click
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Act — click same row again
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert — filter cleared
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('')
    wrapper.unmount()
  })

  test('select (link) mode: row click does not set tickerFilter', async () => {
    // Arrange — rowClickMode: 'link' is the code value for the "select" UI label
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'link' } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Act
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert — filter remains empty
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('')
    wrapper.unmount()
  })
})

// ── Shared state (ticker filter + row-click mode) ─────────────────────────────

describe('Shared ticker filter state', () => {
  test('clear button removes filter set by row click', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([
      makeEvent({ symbol: 'AAPL' }),
      makeEvent({ symbol: 'TSLA' }),
    ])
    await nextTick()
    await wrapper.find('tbody tr').trigger('click')  // sets filter to AAPL
    await nextTick()

    // Act
    await wrapper.find('[data-testid="ticker-filter-clear"]').trigger('click')
    await nextTick()

    // Assert — both rows visible again
    expect(countDataRows(wrapper)).toBe(2)
    wrapper.unmount()
  })

  test('row click in filter mode populates the text input', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'TSLA' })])
    await nextTick()

    // Act
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('TSLA')
    wrapper.unmount()
  })
})

// ── Regression: symbol-less events crash filteredEvents when ticker filter active ──────
// Vue's production build catches thrown computeds and calls console.error.
// Spying on console.error gives a reliable red signal before the null guard fix.

describe('Null symbol regression', () => {
  test('undefined symbol in event does not trigger console.error when ticker filter is active', async () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('AAPL')
    await nextTick()
    consoleError.mockClear()  // clear any Vue setup noise before the Act step

    // Act — live event without symbol field (e.g. non-alert WS message in the feed)
    onData({ price: 100, pct_change: 5 })
    await nextTick()

    // Assert — no console.error from Vue catching a thrown computed
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
    wrapper.unmount()
  })

  test('null symbol in event does not trigger console.error when ticker filter is active', async () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'TSLA' })])
    await nextTick()
    await wrapper.find('[data-testid="ticker-filter-input"]').setValue('TSLA')
    await nextTick()
    consoleError.mockClear()

    // Act
    onData({ ...makeEvent({ symbol: null }) })
    await nextTick()

    // Assert
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
    wrapper.unmount()
  })

  test('undefined symbol in event does not trigger console.error when filterSetByClick is true', async () => {
    // Arrange: row click in filter mode sets filterSetByClick=true, exposing isRowActive’s toUpperCase path
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([makeEvent({ symbol: 'AAPL' })])
    await nextTick()
    // Set filter via row click (sets filterSetByClick=true)
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()
    consoleError.mockClear()

    // Act — new event without symbol arrives while filter+filterSetByClick are active
    onData({ price: 50, pct_change: 3 })
    await nextTick()

    // Assert — isRowActive’s toUpperCase call is guarded; no console.error
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
    wrapper.unmount()
  })

  test('clicking a row without symbol in filter mode does not trigger console.error', async () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const onData = getOnData()
    onData([{ price: 10, pct_change: 5 }])  // no symbol
    await nextTick()
    consoleError.mockClear()

    // Act — click the symbol-less row (handleRowClick’s toUpperCase path)
    await wrapper.find('tbody tr').trigger('click')
    await nextTick()

    // Assert — no crash; filter stays empty
    expect(consoleError).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('')
    consoleError.mockRestore()
    wrapper.unmount()
  })
})

// ── Bus sync in filter mode ───────────────────────────────────────────────────

describe('Bus sync in filter mode', () => {
  test('filter mode: activeTicker change on bus updates tickerFilter', async () => {
    // Arrange
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const onData = getOnData()
    onData([makeEvent({ symbol: 'TSLA' }), makeEvent({ symbol: 'AAPL' })])
    await nextTick()

    // Act — simulate another widget activating TSLA on the bus
    activeTicker.value = 'TSLA'
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('TSLA')
    expect(countDataRows(wrapper)).toBe(1)
    wrapper.unmount()
  })

  test('filter mode: activeTicker cleared on bus clears tickerFilter', async () => {
    // Arrange — set filter via bus first (activeTicker null→TSLA), then clear (TSLA→null)
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'filter' } },
    })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const onData = getOnData()
    onData([makeEvent({ symbol: 'TSLA' })])
    await nextTick()
    activeTicker.value = 'TSLA'
    await nextTick()
    // Pre-condition: filter must be set by bus before we test clearing it
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('TSLA')

    // Act — bus ticker cleared (e.g. user clicks same row again in another widget)
    activeTicker.value = null
    await nextTick()

    // Assert — filter cleared; all rows visible again
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('')
    expect(countDataRows(wrapper)).toBe(1)
    wrapper.unmount()
  })

  test('select (link) mode: activeTicker change on bus does not update tickerFilter', async () => {
    // Arrange
    const callsBefore = vi.mocked(useScannerLink).mock.calls.length
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { rowClickMode: 'link' } },
    })
    const { activeTicker } = vi.mocked(useScannerLink).mock.results[callsBefore].value
    const onData = getOnData()
    onData([makeEvent({ symbol: 'TSLA' })])
    await nextTick()

    // Act
    activeTicker.value = 'TSLA'
    await nextTick()

    // Assert — ticker filter unchanged in select mode
    expect(wrapper.find('[data-testid="ticker-filter-input"]').element.value).toBe('')
    wrapper.unmount()
  })
})

// ── Rec 3 — RAF batching (Option A: batching in widget, not in useWebSocketClient) ──
// Bug: each live WebSocket message immediately mutates events.value, triggering
// a reactive cycle, VDOM diff, and paint per message. A burst of 50 alerts in
// 2 seconds = 50 reactive updates. The fix is to buffer incoming live events in
// a non-reactive array and assign them to events.value in one RAF callback.
//
// Cache hydration (Array payload) must remain synchronous — it is a one-time
// load and does not need batching.

describe('RAF batching of live events', () => {
  // Use vi.stubGlobal to guarantee RAF control independent of fake-timer interop
  // with jsdom's native requestAnimationFrame implementation.
  let pendingRafCallbacks = []

  const flushRaf = async () => {
    const cbs = [...pendingRafCallbacks]
    pendingRafCallbacks = []
    cbs.forEach(cb => cb(performance.now()))
    await nextTick()
  }

  beforeEach(() => {
    pendingRafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      pendingRafCallbacks.push(cb)
      return pendingRafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.mocked(useWebSocketClient).mockClear()  // reset call tracking so getOnData(0) = THIS mount
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('live event is not immediately added to events — remains buffered until RAF fires', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()
    const onData = getOnData()

    // Act — send a live event (non-array = single live alert)
    onData(makeEvent({ symbol: 'AAPL', price: 10 }))
    await nextTick()

    // Assert — event is still buffered; events.value not yet updated
    expect(countDataRows(wrapper)).toBe(0)

    wrapper.unmount()
  })

  test('RAF flush delivers all buffered events in one reactive update', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()
    const onData = getOnData()

    // Act — send 3 rapid live events without flushing RAF
    onData(makeEvent({ symbol: 'AAPL', price: 10 }))
    onData(makeEvent({ symbol: 'TSLA', price: 20 }))
    onData(makeEvent({ symbol: 'NVDA', price: 30 }))
    await nextTick()

    // Assert — still buffered; no rows visible before RAF fires
    expect(countDataRows(wrapper)).toBe(0)

    // Flush RAF — one reactive assignment for all 3
    await flushRaf()

    // Assert — all 3 events delivered in one flush
    expect(countDataRows(wrapper)).toBe(3)

    wrapper.unmount()
  })

  test('burst order is preserved after RAF flush (newest first)', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()
    const onData = getOnData()

    // Act — simulate 3 live events in arrival order
    onData(makeEvent({ symbol: 'FIRST',  price: 1, timestamp: 1000 }))
    onData(makeEvent({ symbol: 'SECOND', price: 2, timestamp: 2000 }))
    onData(makeEvent({ symbol: 'THIRD',  price: 3, timestamp: 3000 }))

    // Assert — still buffered before RAF fires
    expect(countDataRows(wrapper)).toBe(0)

    await flushRaf()

    // Assert — DailyRangeAlerts prepends new events; newest (THIRD) should be first row.
    // v-if empty-state tr is not rendered when filteredEvents has items, so [0] = first data row.
    expect(countDataRows(wrapper)).toBe(3)
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('THIRD')

    wrapper.unmount()
  })

  test('maxEvents limit is enforced at RAF flush, not per-event', async () => {
    // Arrange — maxEvents: 2
    const wrapper = mount(DailyRangeAlerts, {
      props: { ...defaultProps, settings: { maxEvents: 2 } },
    })
    await nextTick()
    const onData = getOnData()

    // Act — send 4 events in one burst
    onData(makeEvent({ symbol: 'A', price: 1, timestamp: 1000 }))
    onData(makeEvent({ symbol: 'B', price: 2, timestamp: 2000 }))
    onData(makeEvent({ symbol: 'C', price: 3, timestamp: 3000 }))
    onData(makeEvent({ symbol: 'D', price: 4, timestamp: 4000 }))

    // Assert — still buffered before RAF fires
    expect(countDataRows(wrapper)).toBe(0)

    await flushRaf()

    // Assert — only 2 rows (maxEvents applied at flush)
    expect(countDataRows(wrapper)).toBe(2)

    wrapper.unmount()
  })

  test('second burst after first flush is also batched', async () => {
    // Arrange
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()
    const onData = getOnData()

    // First burst + flush
    onData(makeEvent({ symbol: 'AAPL', price: 10 }))
    await flushRaf()

    const countAfterFirst = countDataRows(wrapper)
    expect(countAfterFirst).toBe(1)

    // Second burst — must remain buffered until RAF fires again
    onData(makeEvent({ symbol: 'TSLA', price: 20 }))
    onData(makeEvent({ symbol: 'NVDA', price: 30 }))
    await nextTick()

    // Still only 1 row (second burst buffered)
    expect(countDataRows(wrapper)).toBe(1)

    // Flush second burst
    await flushRaf()

    // Now 3 rows total
    expect(countDataRows(wrapper)).toBe(3)

    wrapper.unmount()
  })

  test('cache hydration (Array payload) remains synchronous — not affected by RAF', async () => {
    // Cache hydration is a one-time load; it must appear immediately without RAF flush
    const wrapper = mount(DailyRangeAlerts, { props: defaultProps })
    await nextTick()
    const onData = getOnData()

    // Act — hydrate with array (cache load path)
    onData([makeEvent({ symbol: 'AAPL' }), makeEvent({ symbol: 'TSLA' })])
    await nextTick()

    // Assert — available without flushing RAF (synchronous)
    expect(countDataRows(wrapper)).toBe(2)

    wrapper.unmount()
  })
})
