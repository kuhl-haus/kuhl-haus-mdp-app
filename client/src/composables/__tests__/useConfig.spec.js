/**
 * Tests for useConfig composable.
 *
 * useConfig is a module singleton — config/loading/error are module-level refs.
 * Each test resets state by calling fetchConfig() with a fresh mock and
 * directly resetting the refs via the returned references.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Reset module between tests to clear singleton state
beforeEach(async () => {
  vi.resetModules()
})

describe('useConfig', () => {

  it('test_useConfig_with_successful_fetch_expect_config_returned', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ api_key: 'test-api-key', ws_endpoint: 'ws://localhost:4202/ws' }),
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig } = useConfig()

    const result = await fetchConfig()

    expect(result).toEqual({
      apiKey: 'test-api-key',
      wsEndpoint: 'ws://localhost:4202/ws',
    })
  })

  it('test_useConfig_with_successful_fetch_expect_config_ref_populated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ api_key: 'test-api-key', ws_endpoint: 'ws://localhost:4202/ws' }),
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig, config } = useConfig()

    await fetchConfig()

    expect(config.value?.apiKey).toBe('test-api-key')
    expect(config.value?.wsEndpoint).toBe('ws://localhost:4202/ws')
  })

  it('test_useConfig_with_failed_fetch_expect_null_returned', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig } = useConfig()

    const result = await fetchConfig()

    expect(result).toBeNull()
  })

  it('test_useConfig_with_failed_fetch_expect_error_set', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig, error } = useConfig()

    await fetchConfig()

    expect(error.value).toContain('401')
  })

  it('test_useConfig_with_network_error_expect_null_returned', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig } = useConfig()

    const result = await fetchConfig()

    expect(result).toBeNull()
  })

  it('test_useConfig_isAuthenticated_with_config_expect_true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ api_key: 'test-api-key', ws_endpoint: 'ws://localhost:4202/ws' }),
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig, isAuthenticated } = useConfig()

    await fetchConfig()

    expect(isAuthenticated()).toBe(true)
  })

  it('test_useConfig_isAuthenticated_without_config_expect_false', async () => {
    const { useConfig } = await import('../useConfig.js')
    const { isAuthenticated } = useConfig()

    expect(isAuthenticated()).toBe(false)
  })

  it('test_useConfig_loading_is_false_after_fetch_completes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ api_key: 'key', ws_endpoint: 'ws://localhost' }),
    })

    const { useConfig } = await import('../useConfig.js')
    const { fetchConfig, loading } = useConfig()

    await fetchConfig()

    expect(loading.value).toBe(false)
  })
})
