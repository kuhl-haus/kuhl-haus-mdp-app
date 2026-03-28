import { ref, watch, onUnmounted } from 'vue'

export function useWebSocketClient(config = {}) {
  const {
    wsUrl: initialWsUrl = 'ws://localhost:4202/ws',
    authKey: initialAuthKey = 'secret',
    feedName: initialFeedName = '',
    cacheKey: initialCacheKey = '',
    cacheLimit: initialCacheLimit = 0,
    onData = null,
    autoReconnect = true,
    reconnectBaseMs = 1000,
    reconnectMaxMs = 30000,
    reconnectMaxAttempts = 0
  } = config

  let autoConnect = config.autoConnect ?? false

  const ws = ref(null)
  const isConnected = ref(false)
  const lastDataAt = ref(null)
  const wsUrl = ref(initialWsUrl)
  const authKey = ref(initialAuthKey)
  const feedName = ref(initialFeedName)
  const cacheKey = ref(initialCacheKey)
  const cacheLimit = ref(initialCacheLimit)
  const reconnecting = ref(false)
  const reconnectAttempts = ref(0)
  let reconnectTimer = null

  function logMessage(content, type = 'message') {
    const time = new Date().toTimeString().split(' ')[0]
    console.log(`[${time}][${type.toUpperCase()}] ${content}`)
  }

  function sendMessage(message, noLog = false) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      logMessage('✗ ERROR: WebSocket not connected', 'error')
      return false
    }
    const msgStr = JSON.stringify(message)
    if (!noLog) {
      logMessage(`⬆ ${msgStr}`, 'info')
    }
    ws.value.send(msgStr)
    return true
  }

  function sendAuth() {
    const key = authKey.value.trim()
    if (!key) {
      logMessage('✗ ERROR: Auth key is required', 'error')
      return
    }
    logMessage('Sending auth request', 'info')
    sendMessage({ action: 'auth', api_key: key }, true)
  }

  function subscribe() {
    const feed = feedName.value.trim()
    if (!feed) {
      logMessage('✗ ERROR: Feed name is required', 'error')
      return
    }
    sendMessage({ action: 'subscribe', feed })
  }

  function unsubscribe() {
    const feed = feedName.value.trim()
    if (!feed) {
      logMessage('✗ ERROR: Feed name is required', 'error')
      return
    }
    sendMessage({ action: 'unsubscribe', feed })
  }

  function getCache(limit = 0) {
    const key = cacheKey.value.trim()
    if (!key) {
      logMessage('✗ ERROR: Cache key is required', 'error')
      return
    }
    const msg = { action: 'get', cache: key }
    if (limit > 0) msg.limit = limit
    sendMessage(msg)
  }

  function scheduleReconnect() {
    if (!autoReconnect) return
    if (reconnectMaxAttempts > 0 && reconnectAttempts.value >= reconnectMaxAttempts) {
      logMessage('✗ Max reconnect attempts reached', 'error')
      return
    }
    const delay = Math.min(reconnectBaseMs * 2 ** reconnectAttempts.value, reconnectMaxMs)
    reconnectAttempts.value++
    reconnecting.value = true
    logMessage(`↻ Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value})...`, 'info')
    reconnectTimer = setTimeout(() => {
      reconnecting.value = false
      connect()
    }, delay)
  }

  function connect() {
    const url = wsUrl.value.trim()
    if (!url) {
      logMessage('ERROR: WebSocket URL is required', 'error')
      return
    }

    logMessage(`Connecting to ${url}...`, 'info')

    try {
      ws.value = new WebSocket(url)

      ws.value.onopen = () => {
        logMessage('✓ WebSocket connected', 'info')
        isConnected.value = true
        reconnectAttempts.value = 0
        reconnecting.value = false
      }

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.data) {
            lastDataAt.value = Date.now()
            onData?.(data.data)
          } else if (data) {
            lastDataAt.value = Date.now()
            onData?.(data)
          } else {
            logMessage(`⬇ ${JSON.stringify(event)}`, 'info')
          }
        } catch (e) {
          logMessage(`⬇ ${event}`, 'error')
        }
      }

      ws.value.onerror = () => {
        logMessage('✗ WebSocket error', 'error')
      }

      ws.value.onclose = (event) => {
        logMessage(`⊗ WebSocket closed (code: ${event.code})`, 'info')
        isConnected.value = false
        ws.value = null
        if (autoConnect) {
          scheduleReconnect()
        }
      }
    } catch (error) {
      logMessage(`✗ Connection failed: ${error.message}`, 'error')
    }
  }

  function disconnect() {
    if (ws.value) {
      autoConnect = false
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      reconnecting.value = false
      logMessage('Disconnecting...', 'info')
      ws.value.close()
    }
  }

  // Auto-authenticate and subscribe when connected
  watch([isConnected, ws], ([connected, socket]) => {
    if (connected && socket && socket.readyState === WebSocket.OPEN) {
      sendAuth()
      if (cacheKey.value) {
        getCache(cacheLimit.value)
      }
      if (feedName.value) {
        subscribe()
      }
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (feedName.value) {
      unsubscribe()
    }
    disconnect()
  })

  // Auto-connect if requested
  if (autoConnect) {
    connect()
  }

  return {
    ws,
    isConnected,
    lastDataAt,
    wsUrl,
    authKey,
    feedName,
    cacheKey,
    reconnecting,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
    sendAuth,
    subscribe,
    unsubscribe,
    getCache,
    cacheLimit
  }
}
