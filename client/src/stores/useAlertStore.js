/**
 * useAlertStore — runtime alert state.
 *
 * Manages master mute, autoplay policy tracking, and the ephemeral
 * recent-alert log. The `fire()` action is the single entry point for
 * all alert-producing widgets.
 *
 * Persistence:
 *   - `muted`        → persisted (user survives page reload)
 *   - `audioBlocked` → NOT persisted (browser autoplay policy resets
 *                      on every page load; a persisted false would skip
 *                      the "click to enable" banner after reload)
 *   - `recentLog`    → NOT persisted (old alerts are old)
 */
import { defineStore } from 'pinia'
import { ref }         from 'vue'
import { ALERT_SOUNDS, ALERT_SOUND_MAP } from '@/constants/alertSounds.js'

// Module-level cache of pre-loaded Audio objects keyed by src URL.
// Populated by preloadAll() on first user interaction; fire() reuses
// these objects (currentTime reset) to avoid HTTP round-trips and
// decode latency at alert time.
const MAX_LOG = 20

export const useAlertStore = defineStore('alerts', () => {
  // Per-instance cache of pre-loaded Audio objects keyed by src URL.
  // Lives inside the store function so setActivePinia(createPinia()) resets
  // it naturally with each fresh store instance (important for test isolation).
  const _audioCache = new Map()

  // ── State ────────────────────────────────────────────────────────────────

  /** Master mute — silences all audio without removing per-widget config. */
  const muted = ref(false)

  /**
   * True when the browser's autoplay policy has blocked a play() call.
   * Cleared by any user gesture (handled in DashboardGrid).
   * Plain ref — intentionally excluded from persist config.
   */
  const audioBlocked = ref(false)

  /**
   * Ephemeral log of recent alert firings. Newest entry first.
   * Capped at MAX_LOG entries. Cleared on page reload.
   *
   * @typedef {{ timestamp: number, widgetLabel: string, widgetType: string,
   *             linkColor: string|null, count: number }} AlertLogEntry
   * @type {import('vue').Ref<AlertLogEntry[]>}
   */
  const recentLog = ref([])

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Fire an alert. Resolves the sound src, plays it (respecting mute and
   * autoplay policy), and appends an entry to the recent log.
   *
   * @param {string} soundId
   * @param {AlertLogEntry} entry
   */
  /**
   * Pre-load all registered sounds into the audio cache.
   * Call this after the first user gesture (e.g. when alerts are enabled)
   * so audio is decoded and ready before the first alert fires.
   * Safe to call multiple times — already-cached srcs are skipped.
   */
  function preloadAll() {
    ALERT_SOUNDS.forEach(({ src }) => {
      if (_audioCache.has(src)) return
      try {
        const a = new Audio(src)
        // Only cache real HTMLAudioElements; test stubs don't have .load()
        if (typeof a.load === 'function') {
          a.preload = 'auto'
          a.load()
          _audioCache.set(src, a)
        }
      } catch {}
    })
  }

  function fire(soundId, entry) {
    if (!muted.value) {
      const sound = ALERT_SOUND_MAP[soundId]
      if (sound) {
        // Use pre-loaded audio if available — avoids HTTP round-trip and
        // decode latency. Falls back to a fresh Audio for first fire if
        // preloadAll() hasn't been called yet.
        const audio = _audioCache.get(sound.src) ?? new Audio(sound.src)
        audio.currentTime = 0
        audio.play().catch(() => {
          audioBlocked.value = true
        })
      }
    }

    // Log regardless of mute — the event happened even if silent.
    recentLog.value = [
      { ...entry, timestamp: entry.timestamp ?? Date.now() },
      ...recentLog.value,
    ].slice(0, MAX_LOG)
  }

  /** Flip the master mute state. */
  function toggleMute() {
    muted.value = !muted.value
  }

  /** Clear the recent alert log. */
  function clearLog() {
    recentLog.value = []
  }

  return { muted, audioBlocked, recentLog, fire, toggleMute, clearLog, preloadAll }
}, {
  persist: {
    pick: ['muted'],
  },
})
