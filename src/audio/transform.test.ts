import { describe, expect, it } from 'vitest'
import { createDemoSong } from './midi'
import {
  createInitialMix,
  formatTime,
  getPlaybackDuration,
  getRenderableNotes,
  midiToFrequency,
} from './transform'
import type { RenderSettings } from '../types'

const settings: RenderSettings = {
  bitcrush: 0.2,
  filterCutoff: 4_800,
  masterVolume: 0.8,
  mode: 'scc',
  tempo: 100,
  transpose: 0,
}

describe('audio transforms', () => {
  it('converts midi notes to equal-tempered frequencies', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
    expect(midiToFrequency(81)).toBeCloseTo(880, 5)
  })

  it('scales playback duration by tempo percentage', () => {
    const song = createDemoSong()
    expect(getPlaybackDuration(song, { tempo: 200 })).toBeCloseTo(
      song.summary.duration / 2,
    )
  })

  it('filters muted channels and applies transpose', () => {
    const song = createDemoSong()
    const mixer = createInitialMix(song.channels).map((mix) =>
      mix.channel === 0 ? { ...mix, muted: true } : mix,
    )
    const notes = getRenderableNotes(song, { ...settings, transpose: 12 }, mixer)

    expect(notes.some((note) => note.channel === 0)).toBe(false)
    expect(notes[0]?.pitch).toBe((notes[0]?.midi ?? 0) + 12)
  })

  it('formats transport timestamps', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65.8)).toBe('1:05')
  })
})
