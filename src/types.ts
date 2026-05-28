export const CHIP_MODES = ['scc', 'famicom', 'triangle', 'opll'] as const

export type ChipMode = (typeof CHIP_MODES)[number]

export type TransportState = 'idle' | 'playing' | 'paused' | 'exporting'

export interface MidiNote {
  id: string
  channel: number
  duration: number
  instrumentName: string
  midi: number
  name: string
  time: number
  trackName: string
  velocity: number
}

export interface ChannelSummary {
  channel: number
  color: string
  instrumentName: string
  name: string
  noteCount: number
}

export interface SongSummary {
  bpm: number
  channelCount: number
  duration: number
  fileName: string
  noteCount: number
  ppq: number
  timeSignature: string
}

export interface MidiSong {
  channels: ChannelSummary[]
  notes: MidiNote[]
  summary: SongSummary
}

export interface ChannelMix {
  channel: number
  muted: boolean
  pan: number
  solo: boolean
  volume: number
}

export interface RenderSettings {
  bitcrush: number
  filterCutoff: number
  masterVolume: number
  mode: ChipMode
  tempo: number
  transpose: number
}

export interface RenderableNote extends MidiNote {
  gain: number
  pan: number
  pitch: number
  renderDuration: number
  renderTime: number
}
