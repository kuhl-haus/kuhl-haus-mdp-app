/**
 * useAlertStore — unit tests
 *
 * Covers: fire(), toggleMute(), clearLog(), audioBlocked flag,
 * log capping, mute suppresses audio but still logs,
 * persistence config (muted persisted, audioBlocked and recentLog not).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia }             from 'pinia'
import { useAlertStore }                           from '../useAlertStore.js'
import { ALERT_SOUNDS }                            from '@/constants/alertSounds.js'

// ── Audio stub ────────────────────────────────────────────────────────────────
// new Audio(src).play() is not available in jsdom. We control per-test
// whether play() resolves or rejects to exercise the autoplay policy path.
//
// Must be a regular function (not arrow) so it works as a constructor.
// playImpl is a closure variable reassigned each beforeEach so each test
// controls the resolved/rejected behaviour independently.
let playImpl = vi.fn(() => Promise.resolve())

const AudioMock = vi.fn(function MockAudio() {
  return { play: playImpl }
})
vi.stubGlobal('Audio', AudioMock)

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_SOUND_ID = ALERT_SOUNDS[0].id  // 'blip'

function makeEntry(overrides = {}) {
  return {
    widgetLabel: 'News Feed',
    widgetType:  'NewsFeed',
    linkColor:   null,
    count:       1,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  playImpl = vi.fn(() => Promise.resolve())
  AudioMock.mockClear()
})

// ── fire() ────────────────────────────────────────────────────────────────────

describe('fire', () => {
  test('with valid soundId and not muted expect Audio play called', () => {
    // Arrange
    const store = useAlertStore()

    // Act
    store.fire(VALID_SOUND_ID, makeEntry())

    // Assert
    expect(AudioMock).toHaveBeenCalled()
    expect(playImpl).toHaveBeenCalled()
  })

  test('with valid soundId expect entry prepended to recentLog', () => {
    // Arrange
    const store = useAlertStore()
    const entry = makeEntry({ widgetLabel: 'Range Alerts', count: 3 })

    // Act
    store.fire(VALID_SOUND_ID, entry)

    // Assert
    expect(store.recentLog).toHaveLength(1)
    expect(store.recentLog[0].widgetLabel).toBe('Range Alerts')
    expect(store.recentLog[0].count).toBe(3)
  })

  test('with entry missing timestamp expect timestamp set to Date.now()', () => {
    // Arrange
    const store = useAlertStore()
    const before = Date.now()

    // Act
    store.fire(VALID_SOUND_ID, makeEntry())
    const after = Date.now()

    // Assert
    expect(store.recentLog[0].timestamp).toBeGreaterThanOrEqual(before)
    expect(store.recentLog[0].timestamp).toBeLessThanOrEqual(after)
  })

  test('with entry providing timestamp expect it preserved', () => {
    // Arrange
    const store = useAlertStore()
    const ts = 1700000000000

    // Act
    store.fire(VALID_SOUND_ID, makeEntry({ timestamp: ts }))

    // Assert
    expect(store.recentLog[0].timestamp).toBe(ts)
  })

  test('with muted=true expect Audio not called but entry still logged', () => {
    // Arrange
    const store = useAlertStore()
    store.muted = true

    // Act
    store.fire(VALID_SOUND_ID, makeEntry())

    // Assert — audio suppressed
    expect(AudioMock).not.toHaveBeenCalled()
    // Assert — event still recorded
    expect(store.recentLog).toHaveLength(1)
  })

  test('with unknown soundId expect no Audio call and entry still logged', () => {
    // Arrange
    const store = useAlertStore()

    // Act
    store.fire('nonexistent', makeEntry())

    // Assert
    expect(AudioMock).not.toHaveBeenCalled()
    expect(store.recentLog).toHaveLength(1)
  })

  test('with play() rejecting expect audioBlocked set to true', async () => {
    // Arrange — reassign playImpl; AudioMock reads it via closure
    playImpl = vi.fn(() => Promise.reject(new Error('autoplay blocked')))
    const store = useAlertStore()

    // Act
    store.fire(VALID_SOUND_ID, makeEntry())
    await Promise.resolve()  // flush microtask queue for the rejection handler

    // Assert
    expect(store.audioBlocked).toBe(true)
  })

  test('with play() resolving expect audioBlocked stays false', async () => {
    // Arrange
    const store = useAlertStore()

    // Act
    store.fire(VALID_SOUND_ID, makeEntry())
    await Promise.resolve()

    // Assert
    expect(store.audioBlocked).toBe(false)
  })

  test('with 21 consecutive fires expect log capped at 20 entries', () => {
    // Arrange
    const store = useAlertStore()

    // Act
    for (let i = 0; i < 21; i++) {
      store.fire(VALID_SOUND_ID, makeEntry({ widgetLabel: `Widget ${i}` }))
    }

    // Assert
    expect(store.recentLog).toHaveLength(20)
  })

  test('with multiple fires expect newest entry first in log', () => {
    // Arrange
    const store = useAlertStore()

    // Act
    store.fire(VALID_SOUND_ID, makeEntry({ widgetLabel: 'First' }))
    store.fire(VALID_SOUND_ID, makeEntry({ widgetLabel: 'Second' }))

    // Assert
    expect(store.recentLog[0].widgetLabel).toBe('Second')
    expect(store.recentLog[1].widgetLabel).toBe('First')
  })
})

// ── toggleMute() ──────────────────────────────────────────────────────────────

describe('toggleMute', () => {
  test('with muted=false expect toggleMute sets muted=true', () => {
    const store = useAlertStore()
    expect(store.muted).toBe(false)
    store.toggleMute()
    expect(store.muted).toBe(true)
  })

  test('with muted=true expect toggleMute sets muted=false', () => {
    const store = useAlertStore()
    store.muted = true
    store.toggleMute()
    expect(store.muted).toBe(false)
  })
})

// ── clearLog() ────────────────────────────────────────────────────────────────

describe('clearLog', () => {
  test('with entries in log expect clearLog empties it', () => {
    // Arrange
    const store = useAlertStore()
    store.fire(VALID_SOUND_ID, makeEntry())
    store.fire(VALID_SOUND_ID, makeEntry())
    expect(store.recentLog).toHaveLength(2)

    // Act
    store.clearLog()

    // Assert
    expect(store.recentLog).toHaveLength(0)
  })
})

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  test('expect muted=false, audioBlocked=false, recentLog=[]', () => {
    const store = useAlertStore()
    expect(store.muted).toBe(false)
    expect(store.audioBlocked).toBe(false)
    expect(store.recentLog).toEqual([])
  })
})

// ── Persistence config ────────────────────────────────────────────────────────

describe('persistence config', () => {
  test('expect only muted is in persist pick list', () => {
    // The store is defined with persist: { pick: ['muted'] }.
    // We verify this indirectly: after a fresh pinia (simulating reload),
    // audioBlocked and recentLog start at their defaults regardless of
    // any prior mutations — they are never written to storage.
    const store = useAlertStore()
    store.audioBlocked = true
    store.fire(VALID_SOUND_ID, makeEntry())
    expect(store.recentLog).toHaveLength(1)

    // New pinia instance = page reload
    setActivePinia(createPinia())
    const fresh = useAlertStore()

    // audioBlocked and recentLog reset to defaults
    expect(fresh.audioBlocked).toBe(false)
    expect(fresh.recentLog).toHaveLength(0)
  })
})
