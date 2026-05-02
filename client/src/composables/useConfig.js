import { ref, onMounted } from 'vue'

const config = ref(null)
const loading = ref(false)
const error = ref(null)

export function useConfig() {
  const fetchConfig = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch('/api/get_config', {
        credentials: 'include',  // Include session cookie
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      config.value = {
        apiKey: data.api_key,
        wsEndpoint: data.ws_endpoint,
        massiveApiKey: data.massive_api_key,
        finlightApiKey: data.finlight_api_key,
        appVersion: data.app_version,
      }

      return config.value

    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch config:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch on first mount (singleton pattern)
  if (!config.value && !loading.value) {
    fetchConfig()
  }

  return {
    config,
    loading,
    error,
    fetchConfig,
    isAuthenticated: () => config.value?.apiKey != null
  }
}
