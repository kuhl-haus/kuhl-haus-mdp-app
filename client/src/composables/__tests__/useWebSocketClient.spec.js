/**
 * Tests for useWebSocketClient composable.
 *
 * Mocks the global WebSocket with a minimal stub that captures sent messages
 * and allows manual triggering of connection lifecycle events (open, close,
 * message). autoConnect is always false to prevent real connections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useWebSocketClient } from '../useWebSocketClient.js'

// ── WebSocket mock ────────────────────────────────────────────────────────────

class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    this.sent = []
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    MockWebSocket.instances.push(this)
  }

  send(data) {
    this.sent.push(data)
  }

  close(code = 1000) {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code })
  }

  // Test helper: simulate server opening connection
  simulateOpen() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }

  // Test helper: simulate incoming message
  simulateMessage(data) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

MockWebSocket.instances = []
MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2
MockWebSocket.CLOSED = 3

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  await nextTick()  // wait for Vue watch([isConnected, ws]) to fire
  return mockWs
}

function parseSent(mockWs) {
  return mockWs.sent.map(s => JSON.parse(s))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWebSocketClient', () => {

  // ------------------------------------------------------------------
  // connect / disconnect
  // ------------------------------------------------------------------

  it('test_connect_creates_websocket_with_correct_url', async () => {
    const client = makeClient()
    client.connect()
    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:4202/ws')
  })

  it('test_connect_sets_isConnected_true_on_open', async () => {
    const client = makeClient()
    await connectAndOpen(client)
    expect(client.isConnected.value).toBe(true)
  })

  it('test_disconnect_sets_isConnected_false', async () => {
    const client = makeClient()
    await connectAndOpen(client)
    client.disconnect()
    expect(client.isConnected.value).toBe(false)
  })

  // ------------------------------------------------------------------
  // sendMessage
  // ------------------------------------------------------------------

  it('test_sendMessage_with_open_socket_expect_message_sent', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    // Clear auth/subscribe messages from onopen
    mockWs.sent = []
    client.sendMessage({ action: 'ping' })
    expect(parseSent(mockWs)).toContainEqual({ action: 'ping' })
  })

  it('test_sendMessage_with_closed_socket_expect_returns_false', async () => {
    const client = makeClient()
    const result = client.sendMessage({ action: 'ping' })
    expect(result).toBe(false)
  })

  // ------------------------------------------------------------------
  // getCache
  // ------------------------------------------------------------------

  it('test_getCache_with_no_limit_expect_message_sent_without_limit', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.getCache()
    const messages = parseSent(mockWs)
    const cacheMsg = messages.find(m => m.action === 'get')
    expect(cacheMsg).toBeDefined()
    expect(cacheMsg.cache).toBe('quote:AAPL')
    expect(cacheMsg.limit).toBeUndefined()
  })

  it('test_getCache_with_limit_expect_message_includes_limit', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.getCache(25)
    const messages = parseSent(mockWs)
    const cacheMsg = messages.find(m => m.action === 'get')
    expect(cacheMsg.limit).toBe(25)
  })

  it('test_getCache_with_zero_limit_expect_message_omits_limit', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.getCache(0)
    const messages = parseSent(mockWs)
    const cacheMsg = messages.find(m => m.action === 'get')
    expect(cacheMsg.limit).toBeUndefined()
  })

  it('test_cacheLimit_with_initial_value_expect_propagated_to_getCache', async () => {
    const client = makeClient({ cacheLimit: 10 })
    const mockWs = await connectAndOpen(client)
    // The watch fires getCache(cacheLimit.value) on connect — check it sent limit=10
    const messages = parseSent(mockWs)
    const cacheMsg = messages.find(m => m.action === 'get')
    expect(cacheMsg?.limit).toBe(10)
  })

  // ------------------------------------------------------------------
  // subscribe / unsubscribe
  // ------------------------------------------------------------------

  it('test_subscribe_sends_subscribe_message_with_feed_name', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.subscribe()
    const messages = parseSent(mockWs)
    expect(messages).toContainEqual({ action: 'subscribe', feed: 'quote:AAPL' })
  })

  it('test_unsubscribe_sends_unsubscribe_message_with_feed_name', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.unsubscribe()
    const messages = parseSent(mockWs)
    expect(messages).toContainEqual({ action: 'unsubscribe', feed: 'quote:AAPL' })
  })

  it('test_subscribe_with_empty_feedName_expect_no_message_sent', async () => {
    const client = makeClient({ feedName: '' })
    const mockWs = await connectAndOpen(client)
    mockWs.sent = []
    client.subscribe()
    const messages = parseSent(mockWs)
    expect(messages.find(m => m.action === 'subscribe')).toBeUndefined()
  })

  // ------------------------------------------------------------------
  // onData callback
  // ------------------------------------------------------------------

  it('test_onData_called_with_data_on_message_with_data_wrapper', async () => {
    const received = []
    const client = makeClient({ onData: d => received.push(d) })
    const mockWs = await connectAndOpen(client)
    mockWs.simulateMessage({ data: { symbol: 'AAPL', close: 170.0 } })
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ symbol: 'AAPL', close: 170.0 })
  })

  it('test_onData_called_with_raw_message_when_no_data_wrapper', async () => {
    const received = []
    const client = makeClient({ onData: d => received.push(d) })
    const mockWs = await connectAndOpen(client)
    mockWs.simulateMessage({ symbol: 'AAPL', close: 170.0 })
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ symbol: 'AAPL', close: 170.0 })
  })

  // ------------------------------------------------------------------
  // sendAuth on connect
  // ------------------------------------------------------------------

  it('test_sendAuth_sends_auth_message_on_open', async () => {
    const client = makeClient()
    const mockWs = await connectAndOpen(client)
    const messages = parseSent(mockWs)
    expect(messages).toContainEqual({ action: 'auth', api_key: 'test-key' })
  })

  // ------------------------------------------------------------------
  // auto-reconnect
  // ------------------------------------------------------------------

  it('test_connect_arms_autoReconnect_so_onclose_schedules_reconnect', async () => {
    // Arrange — autoConnect: false simulates EQv3's deferred-connect pattern.
    // connect() must arm auto-reconnect so a subsequent onclose triggers scheduleReconnect.
    vi.useFakeTimers()
    const client = makeClient({ autoConnect: false, reconnectBaseMs: 100, reconnectMaxMs: 1000 })
    const firstWs = await connectAndOpen(client)

    // Act — server closes the connection
    firstWs.close(1006)
    await nextTick()

    // Assert — a reconnect timer was scheduled (a new WebSocket is created after delay)
    expect(client.reconnecting.value).toBe(true)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(MockWebSocket.instances).toHaveLength(2)

    vi.useRealTimers()
  })

  it('test_disconnect_suppresses_reconnect_on_intentional_close', async () => {
    // Arrange — explicit disconnect() must prevent reconnect attempts.
    vi.useFakeTimers()
    const client = makeClient({ autoConnect: false, reconnectBaseMs: 100 })
    const mockWs = await connectAndOpen(client)

    // Act — intentional disconnect
    client.disconnect()
    await nextTick()

    vi.advanceTimersByTime(500)
    await nextTick()

    // Assert — no second WebSocket created; reconnecting stays false
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(client.reconnecting.value).toBe(false)

    vi.useRealTimers()
  })
})
