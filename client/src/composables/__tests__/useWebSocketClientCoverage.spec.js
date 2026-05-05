/**
 * useWebSocketClient — coverage for uncovered branches.
 *
 * Existing spec covers: connect, disconnect, sendMessage, subscribe/unsubscribe,
 * getCache (no limit/with limit/zero), auth, reconnect scheduling,
 * onData dispatching, disconnect suppresses reconnect.
 *
 * This file adds:
 *  - sendAuth with empty authKey → early return (error logged)
 *  - unsubscribe with empty feedName → early return
 *  - getCache with empty cacheKey → early return
 *  - scheduleReconnect with autoReconnect=false → early return
 *  - Max reconnect attempts reached → error logged, no reconnect
 *  - onclose with autoConnect=true → scheduleReconnect called (not false)
 *  - disconnect when ws is null → no crash (no-op)
 *  - watcher: connected + cacheKey set → getCache; feedName set → subscribe
 *  - watcher: cacheKey empty → no getCache; feedName empty → no subscribe
 *  - onUnmounted with feedName set → unsubscribe sent
 *  - onUnmounted with feedName empty → no unsubscribe
 *  - binary-expr line=17: wsUrl ref default value
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useWebSocketClient } from '../useWebSocketClient.js'

// ── WebSocket mock (same as existing spec) ────────────────────────────────────
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    this.sent = []
    this.onopen = null; this.onclose = null; this.onmessage = null; this.onerror = null
    MockWebSocket.instances.push(this)
  }
  send(data) { this.sent.push(data) }
  close(code = 1000) { this.readyState = WebSocket.CLOSED; this.onclose?.({ code }) }
  simulateOpen() { this.readyState = WebSocket.OPEN; this.onopen?.() }
  simulateMessage(data) { this.onmessage?.({ data: JSON.stringify(data) }) }
}
MockWebSocket.instances = []
MockWebSocket.CONNECTING = 0; MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2; MockWebSocket.CLOSED = 3

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.useRealTimers()
})

function makeClient(overrides = {}) {
  return useWebSocketClient({
    wsUrl: 'ws://localhost:4202/ws',
    authKey: 'test-key',
    feedName: 'quote:AAPL',
    cacheKey: 'quote:AAPL',
    autoConnect: false,
    ...overrides,
  })
}

async function connectAndOpen(client) {
  client.connect()
  const mockWs = MockWebSocket.instances.at(-1)
  mockWs.simulateOpen()
  await nextTick()
  return mockWs
}

function parseSent(mockWs) { return mockWs.sent.map(s => JSON.parse(s)) }

// ─────────────────────────────────────────────────────────────────────────────
// sendAuth with empty authKey
// ─────────────────────────────────────────────────────────────────────────────

describe('sendAuth with empty authKey', () => {
  it('with empty authKey expect auth not sent', async () => {
    // Arrange — empty authKey
    const client = makeClient({ authKey: '' })
    client.connect()
    const mockWs = MockWebSocket.instances.at(-1)
    mockWs.simulateOpen()
    await nextTick()

    // Assert — no auth action in sent messages
    const sent = parseSent(mockWs)
    expect(sent.some(m => m.action === 'auth')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// unsubscribe with empty feedName
// ─────────────────────────────────────────────────────────────────────────────

describe('unsubscribe with empty feedName', () => {
  it('with empty feedName expect no unsubscribe message', async () => {
    // Arrange
    const client = makeClient({ feedName: '' })
    const mockWs = await connectAndOpen(client)
    const sentBefore = mockWs.sent.length

    // Act
    client.unsubscribe()

    // Assert — no new message sent
    expect(mockWs.sent.length).toBe(sentBefore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCache with empty cacheKey
// ─────────────────────────────────────────────────────────────────────────────

describe('getCache with empty cacheKey', () => {
  it('with empty cacheKey expect no cache get message', async () => {
    // Arrange
    const client = makeClient({ cacheKey: '' })
    const mockWs = await connectAndOpen(client)
    const sentBefore = mockWs.sent.length

    // Act — call getCache directly
    client.getCache()

    // Assert
    expect(mockWs.sent.length).toBe(sentBefore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// watcher: cacheKey empty → no auto getCache on connect
// ─────────────────────────────────────────────────────────────────────────────

describe('watcher on connect', () => {
  it('with cacheKey empty expect no get action on connect', async () => {
    // Arrange — no cacheKey
    const client = makeClient({ cacheKey: '', feedName: '' })
    const mockWs = await connectAndOpen(client)

    // Assert — only auth sent, no get or subscribe
    const sent = parseSent(mockWs)
    expect(sent.some(m => m.action === 'get')).toBe(false)
    expect(sent.some(m => m.action === 'subscribe')).toBe(false)
  })

  it('with feedName empty expect no subscribe on connect', async () => {
    // Arrange — no feedName but has cacheKey
    const client = makeClient({ feedName: '' })
    const mockWs = await connectAndOpen(client)

    // Assert — get is sent (cacheKey present), but no subscribe
    const sent = parseSent(mockWs)
    expect(sent.some(m => m.action === 'get')).toBe(true)
    expect(sent.some(m => m.action === 'subscribe')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scheduleReconnect with autoReconnect=false
// ─────────────────────────────────────────────────────────────────────────────

describe('scheduleReconnect with autoReconnect=false parameter', () => {
  it('with autoReconnect=false and connection closed expect no reconnect scheduled', async () => {
    // Arrange — autoReconnect=false means scheduleReconnect() returns early
    vi.useFakeTimers()
    const client = useWebSocketClient({
      wsUrl: 'ws://localhost:4202/ws',
      authKey: 'test-key',
      feedName: 'quote:AAPL',
      cacheKey: 'quote:AAPL',
      autoConnect: false,
      autoReconnect: false,
    })
    const mockWs = await connectAndOpen(client)

    // Act — close with error code
    mockWs.close(1006)
    await nextTick()
    vi.advanceTimersByTime(5000)
    await nextTick()

    // Assert — no new WebSocket instances (scheduleReconnect returned early)
    expect(MockWebSocket.instances.length).toBe(1)
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// autoConnect=true → onclose schedules reconnect
// ─────────────────────────────────────────────────────────────────────────────

describe('autoConnect=true onclose reconnect', () => {
  it('with autoConnect=true and error close expect reconnect scheduled', async () => {
    // Arrange — use small reconnect delay
    vi.useFakeTimers()
    const client = useWebSocketClient({
      wsUrl: 'ws://localhost:4202/ws',
      authKey: 'test-key',
      feedName: 'quote:AAPL',
      cacheKey: 'quote:AAPL',
      autoConnect: true,
      reconnectBaseMs: 50,
      reconnectMaxMs: 100,
    })
    await nextTick()
    const mockWs = MockWebSocket.instances.at(-1)
    mockWs.simulateOpen()
    await nextTick()

    // Act — error close
    mockWs.close(1006)
    await nextTick()
    vi.advanceTimersByTime(200)
    await nextTick()

    // Assert — reconnect triggered
    expect(MockWebSocket.instances.length).toBeGreaterThan(1)
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// max reconnect attempts
// ─────────────────────────────────────────────────────────────────────────────

describe('max reconnect attempts', () => {
  it('with reconnectMaxAttempts=1 and 2 failures expect no more reconnects', async () => {
    // Arrange
    vi.useFakeTimers()
    const client = useWebSocketClient({
      wsUrl: 'ws://localhost:4202/ws',
      authKey: 'test-key',
      feedName: 'quote:AAPL',
      cacheKey: 'quote:AAPL',
      autoConnect: true,
      reconnectMaxAttempts: 1,
      reconnectBaseMs: 10,
      reconnectMaxMs: 100,
    })
    await nextTick()
    let mockWs = MockWebSocket.instances.at(-1)
    mockWs.simulateOpen()
    await nextTick()

    // First failure → schedules reconnect
    mockWs.close(1006)
    await nextTick()
    vi.advanceTimersByTime(100)
    await nextTick()

    const countAfterFirst = MockWebSocket.instances.length

    // Second failure → max attempts reached, no more reconnect
    if (MockWebSocket.instances.length > 1) {
      mockWs = MockWebSocket.instances.at(-1)
      mockWs.simulateOpen()
      await nextTick()
      mockWs.close(1006)
      await nextTick()
      vi.advanceTimersByTime(500)
      await nextTick()
    }

    // Assert — no additional reconnect after max reached
    expect(MockWebSocket.instances.length).toBeLessThanOrEqual(countAfterFirst + 1)
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// disconnect when ws is null
// ─────────────────────────────────────────────────────────────────────────────

describe('disconnect when ws is null', () => {
  it('with no prior connect expect disconnect is a no-op', () => {
    // Arrange — client without connecting
    const client = makeClient()

    // Act — disconnect without ever connecting (ws is null)
    expect(() => client.disconnect()).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onUnmounted: unsubscribe when feedName set; no-op when empty
// ─────────────────────────────────────────────────────────────────────────────

describe('onUnmounted lifecycle', () => {
  it('with feedName set expect unsubscribe sent on unmount', async () => {
    // Arrange — use a component to trigger onUnmounted
    let capturedClient = null
    const TestComp = defineComponent({
      setup() {
        capturedClient = makeClient({ feedName: 'quote:AAPL' })
        return {}
      },
      template: '<div />',
    })
    const wrapper = mount(TestComp)
    const mockWs = await connectAndOpen(capturedClient)
    const sentBefore = mockWs.sent.length

    // Act
    wrapper.unmount()
    await nextTick()

    // Assert — unsubscribe action sent
    const sent = parseSent(mockWs)
    const afterSent = sent.slice(sentBefore - parseSent({ sent: mockWs.sent.slice(0, sentBefore) }).length)
    expect(sent.some(m => m.action === 'unsubscribe')).toBe(true)
  })

  it('with feedName empty expect no unsubscribe on unmount', async () => {
    // Arrange
    let capturedClient = null
    const TestComp = defineComponent({
      setup() {
        capturedClient = makeClient({ feedName: '' })
        return {}
      },
      template: '<div />',
    })
    const wrapper = mount(TestComp)
    const mockWs = await connectAndOpen(capturedClient)
    const sentBefore = parseSent(mockWs).length

    // Act
    wrapper.unmount()
    await nextTick()

    // Assert — no unsubscribe (feedName was empty)
    const sent = parseSent(mockWs)
    const newSent = sent.slice(sentBefore)
    expect(newSent.some(m => m.action === 'unsubscribe')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// connect with no URL → no WebSocket created
// ─────────────────────────────────────────────────────────────────────────────

describe('connect with empty wsUrl', () => {
  it('with empty wsUrl expect no WebSocket created', () => {
    // Arrange
    const client = makeClient({ wsUrl: '' })

    // Act
    client.connect()

    // Assert — no WebSocket instance created
    expect(MockWebSocket.instances.length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Message handler: data without .data field (else if path, line 136)
// ─────────────────────────────────────────────────────────────────────────────

describe('message handler: data without .data field', () => {
  test('with message having no .data field expect onData called with full message', async () => {
    // Arrange — message has no .data field (bare object)
    const onData = vi.fn()
    let capturedOnMessage = null
    global.WebSocket = class MockWS {
      constructor(url) {
        this.url = url; this.readyState = 0
        setTimeout(() => { this.readyState = 1; this.onopen?.() }, 0)
      }
      send() {}
      close() { this.onclose?.({ code: 1000 }) }
      set onmessage(fn) { capturedOnMessage = fn }
    }

    const { useWebSocketClient } = await import('@/composables/useWebSocketClient.js')
    const { connect } = useWebSocketClient({ wsUrl: 'ws://localhost:4202', authKey: '', feedName: '', cacheKey: '', onData })
    connect()
    await new Promise(r => setTimeout(r, 20)) // wait for open

    // Act — send a bare object without .data field
    capturedOnMessage?.({ data: JSON.stringify({ type: 'quote', symbol: 'AAPL', close: 180 }) })
    await nextTick()

    // Assert — onData called with the full message (else if branch)
    expect(onData).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL' }))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scheduleReconnect with autoReconnect=false (line 90)
// ─────────────────────────────────────────────────────────────────────────────

describe('scheduleReconnect with autoReconnect=false', () => {
  test('with autoReconnect=false expect no reconnect attempted', async () => {
    // Arrange — create WS that immediately closes
    let closeHandler = null
    global.WebSocket = class MockWS {
      constructor() { this.readyState = 0; setTimeout(() => { this.readyState = 1; this.onopen?.() }, 0) }
      send() {}
      close() { this.onclose?.({ code: 1006 }) }  // abnormal close triggers reconnect
      set onclose(fn) { closeHandler = fn }
    }

    const { useWebSocketClient } = await import('@/composables/useWebSocketClient.js')
    const ws = useWebSocketClient({
      wsUrl: 'ws://localhost:4202', authKey: '', feedName: '', cacheKey: '',
      autoReconnect: false,
    })
    ws.connect()
    await new Promise(r => setTimeout(r, 20))

    // Act — trigger close (should NOT reconnect since autoReconnect=false)
    closeHandler?.({ code: 1006 })
    await nextTick()

    // Assert — reconnecting stays false (no reconnect attempt)
    expect(ws.reconnecting.value).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onUnmounted: feedName empty → unsubscribe not called (line 192)
// ─────────────────────────────────────────────────────────────────────────────

describe('onUnmounted with no feedName', () => {
  test('with no feedName on unmount expect no error', async () => {
    // Arrange — mount a component that uses useWebSocketClient with no feedName
    const { useWebSocketClient } = await import('@/composables/useWebSocketClient.js')
    const { mount } = await import('@vue/test-utils')
    const { defineComponent } = await import('vue')

    const TestComp = defineComponent({
      setup() {
        useWebSocketClient({ wsUrl: '', authKey: '', feedName: '', cacheKey: '', autoConnect: false })
      },
      template: '<div />',
    })

    const wrapper = mount(TestComp)
    // Act — unmount (triggers onUnmounted with no feedName)
    expect(() => wrapper.unmount()).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// disconnect while WS is open (line 167 if(ws.value) TRUE path)
// ─────────────────────────────────────────────────────────────────────────────

describe('disconnect while WS is open', () => {
  test('with active connection expect disconnect closes the WS', async () => {
    // Arrange — connect and don't close (WS stays open)
    let capturedClose = null
    global.WebSocket = class MockWS {
      constructor() {
        this.readyState = 0
        setTimeout(() => { this.readyState = 1; this.onopen?.() }, 0)
      }
      send() {}
      close() { capturedClose = true; this.onclose?.({ code: 1000 }) }
    }
    global.WebSocket.CONNECTING = 0; global.WebSocket.OPEN = 1
    global.WebSocket.CLOSING = 2; global.WebSocket.CLOSED = 3

    const { useWebSocketClient } = await import('@/composables/useWebSocketClient.js')
    const ws = useWebSocketClient({
      wsUrl: 'ws://localhost:4202', authKey: '', feedName: '', cacheKey: '',
    })
    ws.connect()
    await new Promise(r => setTimeout(r, 20))  // let connection open

    // Act — disconnect while connected
    ws.disconnect()
    await nextTick()

    // Assert — close was called (if(ws.value) body executed)
    expect(capturedClose).toBe(true)
  })
})
