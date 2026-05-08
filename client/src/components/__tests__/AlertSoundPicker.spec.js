/**
 * AlertSoundPicker.vue — unit tests
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// Stub Audio globally
const AudioMock = vi.fn(function () {
  return { play: vi.fn(() => Promise.resolve()) }
})
vi.stubGlobal('Audio', AudioMock)

// Mock the sound assets so Vite import.meta.url doesn't break in test env
vi.mock('@/constants/alertSounds.js', async () => {
  const ALERT_SOUNDS = [
    { id: 'blip',         label: 'Blip',         src: '/sounds/blip.wav'         },
    { id: 'blips',        label: 'Blips',         src: '/sounds/blips.wav'        },
    { id: 'buzz_1',       label: 'Buzz 1',        src: '/sounds/buzz_1.wav'       },
    { id: 'buzz_2',       label: 'Buzz 2',        src: '/sounds/buzz_2.wav'       },
    { id: 'clap',         label: 'Clap',          src: '/sounds/clap.wav'         },
    { id: 'marimba',      label: 'Marimba',       src: '/sounds/marimba.wav'      },
    { id: 'perc',         label: 'Perc',          src: '/sounds/perc.wav'         },
    { id: 'snap',         label: 'Snap',          src: '/sounds/snap.wav'         },
    { id: 'snare',        label: 'Snare',         src: '/sounds/snare.wav'        },
    { id: 'snare_fill_1', label: 'Snare Fill 1',  src: '/sounds/snare_fill_1.wav' },
    { id: 'snare_fill_2', label: 'Snare Fill 2',  src: '/sounds/snare_fill_2.wav' },
    { id: 'stab',         label: 'Stab',          src: '/sounds/stab.wav'         },
    { id: 'steel_pan',    label: 'Steel Pan',     src: '/sounds/steel_pan.wav'    },
    { id: 'voc',          label: 'Voc',           src: '/sounds/voc.wav'          },
  ]
  const ALERT_SOUND_MAP = Object.fromEntries(ALERT_SOUNDS.map(s => [s.id, s]))
  const DEFAULT_ALERT_SOUND_ID = 'blip'
  return { ALERT_SOUNDS, ALERT_SOUND_MAP, DEFAULT_ALERT_SOUND_ID }
})

import AlertSoundPicker from '../AlertSoundPicker.vue'
import { ALERT_SOUNDS } from '@/constants/alertSounds.js'

beforeEach(() => {
  setActivePinia(createPinia())
  AudioMock.mockClear()
})

function mountPicker(props = {}) {
  return mount(AlertSoundPicker, {
    props,
    global: { plugins: [createPinia()] },
  })
}

describe('AlertSoundPicker rendering', () => {
  test('renders a <select> with 14 options (all ALERT_SOUNDS, showDefault=false)', () => {
    const wrapper = mountPicker({ showDefault: false })
    const options = wrapper.findAll('select option')
    expect(options).toHaveLength(14)
  })

  test('with showDefault=true renders a leading "Default (X)" option (15 total)', () => {
    const wrapper = mountPicker({ showDefault: true })
    const options = wrapper.findAll('select option')
    expect(options).toHaveLength(15)
    // First option value should be empty string
    expect(options[0].element.value).toBe('')
    expect(options[0].text()).toMatch(/^Default \(/)
  })

  test('with showDefault=false no default option (14 total)', () => {
    const wrapper = mountPicker({ showDefault: false })
    const options = wrapper.findAll('select option')
    expect(options).toHaveLength(14)
    // No option with empty value
    const emptyOpts = options.filter(o => o.element.value === '')
    expect(emptyOpts).toHaveLength(0)
  })

  test('renders a preview button', () => {
    const wrapper = mountPicker()
    expect(wrapper.find('button.preview-btn').exists()).toBe(true)
  })
})

describe('AlertSoundPicker interactions', () => {
  // Note: wrapper.emitted() does not capture Vue emissions from <script setup> in VTU 2.4.x/jsdom.
  // Use the attrs listener pattern instead.

  test('changing select emits update:modelValue with the chosen sound id', async () => {
    const emitted = []
    const wrapper = mount(AlertSoundPicker, {
      props: { showDefault: true, modelValue: null },
      attrs: { 'onUpdate:modelValue': (v) => emitted.push(v) },
      global: { plugins: [createPinia()] },
    })
    const select = wrapper.find('select')
    select.element.value = 'marimba'
    await select.trigger('change')
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted[emitted.length - 1]).toBe('marimba')
  })

  test('selecting the default option (value "") emits update:modelValue with null', async () => {
    const emitted = []
    const wrapper = mount(AlertSoundPicker, {
      props: { showDefault: true, modelValue: 'marimba' },
      attrs: { 'onUpdate:modelValue': (v) => emitted.push(v) },
      global: { plugins: [createPinia()] },
    })
    const select = wrapper.find('select')
    select.element.value = ''
    await select.trigger('change')
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted[emitted.length - 1]).toBeNull()
  })

  test('preview button click plays the selected sound', async () => {
    const wrapper = mountPicker({ modelValue: 'marimba' })
    await wrapper.find('button.preview-btn').trigger('click')
    expect(AudioMock).toHaveBeenCalledTimes(1)
    // Constructor arg should be the marimba src
    expect(AudioMock.mock.calls[0][0]).toBe('/sounds/marimba.wav')
  })

  test('preview with modelValue=null plays the global default sound', async () => {
    const wrapper = mountPicker({ modelValue: null })
    await wrapper.find('button.preview-btn').trigger('click')
    expect(AudioMock).toHaveBeenCalledTimes(1)
    // Default is 'blip'
    expect(AudioMock.mock.calls[0][0]).toBe('/sounds/blip.wav')
  })
})
