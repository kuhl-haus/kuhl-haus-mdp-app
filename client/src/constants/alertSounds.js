/**
 * alertSounds — registry of bundled alert sound files.
 *
 * All files are short-duration PCM WAV (≤1 second) for minimal decode
 * latency. Vite resolves each import to a cache-friendly hashed URL.
 */

import blip         from '@/assets/sounds/blip.wav'
import blips        from '@/assets/sounds/blips.wav'
import buzz1        from '@/assets/sounds/buzz_1.wav'
import buzz2        from '@/assets/sounds/buzz_2.wav'
import clap         from '@/assets/sounds/clap.wav'
import marimba      from '@/assets/sounds/marimba.wav'
import perc         from '@/assets/sounds/perc.wav'
import snap         from '@/assets/sounds/snap.wav'
import snare        from '@/assets/sounds/snare.wav'
import snareFill1   from '@/assets/sounds/snare_fill_1.wav'
import snareFill2   from '@/assets/sounds/snare_fill_2.wav'
import stab         from '@/assets/sounds/stab.wav'
import steelPan     from '@/assets/sounds/steel_pan.wav'
import voc          from '@/assets/sounds/voc.wav'

export const ALERT_SOUNDS = [
  { id: 'blip',          label: 'Blip',          src: blip       },
  { id: 'blips',         label: 'Blips',          src: blips      },
  { id: 'buzz_1',        label: 'Buzz 1',         src: buzz1      },
  { id: 'buzz_2',        label: 'Buzz 2',         src: buzz2      },
  { id: 'clap',          label: 'Clap',           src: clap       },
  { id: 'marimba',       label: 'Marimba',        src: marimba    },
  { id: 'perc',          label: 'Perc',           src: perc       },
  { id: 'snap',          label: 'Snap',           src: snap       },
  { id: 'snare',         label: 'Snare',          src: snare      },
  { id: 'snare_fill_1',  label: 'Snare Fill 1',   src: snareFill1 },
  { id: 'snare_fill_2',  label: 'Snare Fill 2',   src: snareFill2 },
  { id: 'stab',          label: 'Stab',           src: stab       },
  { id: 'steel_pan',     label: 'Steel Pan',      src: steelPan   },
  { id: 'voc',           label: 'Voc',            src: voc        },
]

export const ALERT_SOUND_MAP = Object.fromEntries(ALERT_SOUNDS.map(s => [s.id, s]))

export const DEFAULT_ALERT_SOUND_ID = 'blip'
