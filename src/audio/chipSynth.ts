import type {
  ChannelMix,
  ChipMode,
  MidiSong,
  RenderableNote,
  RenderSettings,
} from '../types'
import { encodeWav } from './wav'
import { getPlaybackDuration, getRenderableNotes, midiToFrequency } from './transform'

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

const ATTACK_SECONDS = 0.006
const RELEASE_SECONDS = 0.055

export class ChipSynthEngine {
  private analyser: AnalyserNode | null = null
  private context: AudioContext | null = null
  private offset = 0
  private sources: AudioScheduledSourceNode[] = []
  private startedAt = 0

  async play(
    song: MidiSong,
    settings: RenderSettings,
    mixer: ChannelMix[],
    offset: number,
  ): Promise<void> {
    this.stop()
    const AudioContextCtor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext

    if (!AudioContextCtor) {
      throw new Error('This browser does not support Web Audio playback.')
    }

    const context = new AudioContextCtor()
    await context.resume()

    const master = context.createGain()
    master.gain.value = settings.masterVolume

    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.72

    master.connect(analyser)
    analyser.connect(context.destination)

    this.context = context
    this.analyser = analyser
    this.offset = offset
    this.startedAt = context.currentTime
    this.sources = scheduleSong(context, master, song, settings, mixer, offset)
  }

  pause(): number {
    const position = this.getPosition()
    this.stop()
    return position
  }

  stop(): void {
    this.sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // Already stopped sources throw in some browsers.
      }
      source.disconnect()
    })

    this.sources = []
    this.analyser = null

    if (this.context) {
      void this.context.close()
      this.context = null
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getPosition(): number {
    if (!this.context) {
      return this.offset
    }

    return this.offset + (this.context.currentTime - this.startedAt)
  }
}

export const renderSongToWav = async (
  song: MidiSong,
  settings: RenderSettings,
  mixer: ChannelMix[],
): Promise<Blob> => {
  const sampleRate = 44_100
  const duration = Math.max(1, getPlaybackDuration(song, settings) + 0.5)
  const frameCount = Math.ceil(duration * sampleRate)
  const context = new OfflineAudioContext(2, frameCount, sampleRate)
  const master = context.createGain()
  master.gain.value = settings.masterVolume
  master.connect(context.destination)

  scheduleSong(context, master, song, settings, mixer, 0)
  const rendered = await context.startRendering()
  return encodeWav(rendered)
}

const scheduleSong = (
  context: BaseAudioContext,
  destination: AudioNode,
  song: MidiSong,
  settings: RenderSettings,
  mixer: ChannelMix[],
  offset: number,
): AudioScheduledSourceNode[] => {
  const startAt = context.currentTime + 0.04
  const renderableNotes = getRenderableNotes(song, settings, mixer, offset)
  const sources: AudioScheduledSourceNode[] = []

  renderableNotes.forEach((note) => {
    const start = startAt + Math.max(0, note.renderTime - offset)
    const elapsed = Math.max(0, offset - note.renderTime)
    const duration = Math.max(0.035, note.renderDuration - elapsed)

    sources.push(
      ...scheduleChipNote(context, destination, note, settings, start, duration),
    )
  })

  return sources
}

const scheduleChipNote = (
  context: BaseAudioContext,
  destination: AudioNode,
  note: RenderableNote,
  settings: RenderSettings,
  start: number,
  duration: number,
): AudioScheduledSourceNode[] => {
  if (note.channel === 9) {
    return scheduleNoiseNote(context, destination, note, start, duration)
  }

  const oscillator = context.createOscillator()
  const filter = context.createBiquadFilter()
  const crusher = createBitCrusher(context, settings.bitcrush)
  const gain = context.createGain()
  const panner = context.createStereoPanner()
  const end = start + duration

  configureOscillator(context, oscillator, settings.mode, note)
  
  const voice = note.instrument && note.instrument !== 'default' ? note.instrument : settings.mode

  if (voice === 'opll' || voice === 'fm') {
    filter.type = 'lowpass'
    // Dynamic resonant filter tracking notes pitch
    const multiplier = ((settings.filterCutoff - 450) / (10000 - 450)) * 4 + 0.5
    filter.frequency.value = Math.min(18000, midiToFrequency(note.pitch) * multiplier)
    filter.Q.value = 2.5
  } else {
    filter.type = 'lowpass'
    filter.frequency.value = settings.filterCutoff
    filter.Q.value = 1.6
  }

  panner.pan.value = note.pan

  oscillator.connect(filter)
  if (crusher) {
    filter.connect(crusher)
    crusher.connect(gain)
  } else {
    filter.connect(gain)
  }
  gain.connect(panner)
  panner.connect(destination)

  const voiceMode = note.instrument && note.instrument !== 'default' ? note.instrument : settings.mode
  applyEnvelope(gain.gain, start, end, note.gain * note.velocity * modeGain(voiceMode))
  oscillator.start(start)
  oscillator.stop(end + 0.02)

  return [oscillator]
}

const scheduleNoiseNote = (
  context: BaseAudioContext,
  destination: AudioNode,
  note: RenderableNote,
  start: number,
  duration: number,
): AudioScheduledSourceNode[] => {
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  const panner = context.createStereoPanner()
  const end = start + Math.min(duration, note.midi < 40 ? 0.18 : 0.075)

  source.buffer = createNoiseBuffer(context, note.midi < 40 ? 'kick' : 'hat')
  filter.type = note.midi < 40 ? 'lowpass' : 'highpass'
  filter.frequency.value = note.midi < 40 ? 140 : 5_500
  filter.Q.value = 1.8
  panner.pan.value = note.pan

  source.connect(filter)
  filter.connect(gain)
  gain.connect(panner)
  panner.connect(destination)

  applyEnvelope(gain.gain, start, end, note.gain * note.velocity * 0.75)
  source.start(start)
  source.stop(end + 0.01)

  return [source]
}

const configureOscillator = (
  context: BaseAudioContext,
  oscillator: OscillatorNode,
  mode: ChipMode,
  note: RenderableNote,
): void => {
  oscillator.frequency.value = midiToFrequency(note.pitch)

  const voice = note.instrument && note.instrument !== 'default' ? note.instrument : mode

  if (voice === 'scc') {
    oscillator.setPeriodicWave(createSccWave(context))
    oscillator.detune.value = (note.channel % 3) * 3
    return
  }

  if (voice === 'famicom' || voice === 'square50') {
    oscillator.type = 'square'
    oscillator.detune.value = note.channel % 2 === 0 ? -4 : 4
    return
  }

  if (voice === 'square25') {
    oscillator.type = 'square'
    oscillator.detune.value = note.channel % 2 === 0 ? -8 : 8
    return
  }

  if (voice === 'triangle') {
    oscillator.type = 'triangle'
    return
  }

  if (voice === 'opll' || voice === 'fm') {
    oscillator.type = 'sawtooth'
    oscillator.detune.value = (note.channel % 2 === 0 ? -8 : 8)
    return
  }

  if (voice === 'sine') {
    oscillator.type = 'sine'
    return
  }

  oscillator.type = 'sine'
  oscillator.detune.value = Math.sin(note.renderTime * 2) * 7
}

const createSccWave = (context: BaseAudioContext): PeriodicWave => {
  const real = new Float32Array(16)
  const imag = new Float32Array(16)

  for (let harmonic = 1; harmonic < real.length; harmonic += 1) {
    real[harmonic] = harmonic % 2 === 0 ? 0.18 / harmonic : 0
    imag[harmonic] = (harmonic % 2 === 0 ? 0.35 : 0.86) / harmonic
  }

  return context.createPeriodicWave(real, imag, { disableNormalization: false })
}

const createNoiseBuffer = (
  context: BaseAudioContext,
  kind: 'kick' | 'hat',
): AudioBuffer => {
  const length = Math.floor(context.sampleRate * (kind === 'kick' ? 0.22 : 0.08))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    const decay = 1 - index / length
    data[index] = (Math.random() * 2 - 1) * decay ** (kind === 'kick' ? 4 : 1.4)
  }

  return buffer
}

const createBitCrusher = (
  context: BaseAudioContext,
  amount: number,
): WaveShaperNode | null => {
  if (amount <= 0.02) {
    return null
  }

  const curve = new Float32Array(2048)
  const steps = Math.max(2, Math.round(64 - amount * 61))

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1
    curve[index] = Math.round(x * steps) / steps
  }

  const shaper = context.createWaveShaper()
  shaper.curve = curve
  shaper.oversample = 'none'
  return shaper
}

const applyEnvelope = (
  gain: AudioParam,
  start: number,
  end: number,
  peak: number,
): void => {
  const releaseStart = Math.max(start + ATTACK_SECONDS, end - RELEASE_SECONDS)

  gain.cancelScheduledValues(start)
  gain.setValueAtTime(0.0001, start)
  gain.linearRampToValueAtTime(peak, start + ATTACK_SECONDS)
  gain.linearRampToValueAtTime(peak * 0.68, releaseStart)
  gain.linearRampToValueAtTime(0.0001, end)
}

const modeGain = (mode: string): number => {
  if (mode === 'opll' || mode === 'fm') {
    return 0.92
  }

  if (mode === 'triangle') {
    return 0.88
  }

  return 0.62
}
