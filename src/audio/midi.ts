import { Midi } from '@tonejs/midi'
import type { MidiNote, MidiSong } from '../types'
import { buildChannelSummaries } from './transform'

export const parseMidiFile = async (file: File): Promise<MidiSong> => {
  const buffer = await file.arrayBuffer()
  const midi = new Midi(buffer)
  return songFromMidi(midi, file.name)
}

export const songFromMidi = (midi: Midi, fileName: string): MidiSong => {
  const notes: MidiNote[] = midi.tracks.flatMap((track, trackIndex) => {
    const channel = Number.isInteger(track.channel)
      ? Math.min(Math.max(track.channel, 0), 15)
      : trackIndex % 16
    const trackName = track.name || `Track ${trackIndex + 1}`
    const instrumentName =
      track.instrument?.name || (channel === 9 ? 'drums' : 'chip lead')

    return track.notes.map((note, noteIndex) => ({
      channel,
      duration: Math.max(note.duration, 0.035),
      id: `${trackIndex}-${noteIndex}-${note.ticks}`,
      instrumentName,
      midi: note.midi,
      name: note.name,
      time: Math.max(note.time, 0),
      trackName,
      velocity: Math.min(Math.max(note.velocity, 0.1), 1),
    }))
  })

  notes.sort((a, b) => a.time - b.time)

  const fallbackDuration = notes.reduce(
    (duration, note) => Math.max(duration, note.time + note.duration),
    0,
  )
  const timeSignature = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4]

  return {
    channels: buildChannelSummaries(notes),
    notes,
    summary: {
      bpm: Math.round(midi.header.tempos[0]?.bpm ?? 120),
      channelCount: buildChannelSummaries(notes).length,
      duration: Math.max(midi.duration, fallbackDuration),
      fileName: fileName || midi.name || 'untitled.mid',
      noteCount: notes.length,
      ppq: midi.header.ppq,
      timeSignature: `${timeSignature[0]}/${timeSignature[1]}`,
    },
  }
}

export const createDemoSong = (): MidiSong => {
  const lead = [72, 76, 79, 83, 84, 83, 79, 76, 74, 77, 81, 84, 86, 84, 81, 77]
  const bass = [36, 36, 43, 43, 41, 41, 38, 38]
  const arpeggio = [60, 64, 67, 72, 62, 65, 69, 74, 59, 62, 67, 71, 55, 59, 62, 67]

  const notes: MidiNote[] = [
    ...lead.map((midi, index) => ({
      channel: 0,
      duration: 0.34,
      id: `demo-lead-${index}`,
      instrumentName: 'square lead',
      midi,
      name: midiToName(midi),
      time: index * 0.375,
      trackName: 'MIDIBOI lead',
      velocity: index % 4 === 0 ? 0.92 : 0.72,
    })),
    ...bass.map((midi, index) => ({
      channel: 1,
      duration: 0.68,
      id: `demo-bass-${index}`,
      instrumentName: 'mono bass',
      midi,
      name: midiToName(midi),
      time: index * 0.75,
      trackName: 'MIDIBOI bass',
      velocity: 0.8,
    })),
    ...arpeggio.map((midi, index) => ({
      channel: 2,
      duration: 0.16,
      id: `demo-arp-${index}`,
      instrumentName: 'chip arp',
      midi,
      name: midiToName(midi),
      time: index * 0.1875,
      trackName: 'MIDIBOI arp',
      velocity: 0.58,
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      channel: 9,
      duration: index % 4 === 0 ? 0.16 : 0.07,
      id: `demo-drum-${index}`,
      instrumentName: 'noise kit',
      midi: index % 4 === 0 ? 36 : 42,
      name: index % 4 === 0 ? 'Kick' : 'Hat',
      time: index * 0.375,
      trackName: 'MIDIBOI kit',
      velocity: index % 4 === 0 ? 0.78 : 0.42,
    })),
  ].sort((a, b) => a.time - b.time)

  const channels = buildChannelSummaries(notes)

  return {
    channels,
    notes,
    summary: {
      bpm: 160,
      channelCount: channels.length,
      duration: 6.2,
      fileName: 'midiboi-demo.mid',
      noteCount: notes.length,
      ppq: 480,
      timeSignature: '4/4',
    },
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const midiToName = (midi: number): string => {
  const pitch = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${pitch}${octave}`
}
