import type {
  ChannelMix,
  ChannelSummary,
  MidiNote,
  MidiSong,
  RenderableNote,
  RenderSettings,
} from '../types'

const CHANNEL_COLORS = [
  '#2ee6de',
  '#f6c343',
  '#ff5f57',
  '#7af07d',
  '#8fd8ff',
  '#ff8ab3',
  '#dedede',
  '#b9f26b',
  '#ffb86b',
  '#ff7167',
  '#80ffdb',
  '#f0f66e',
  '#9db2ff',
  '#ffcfdf',
  '#c2f970',
  '#f8f4d8',
]

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const midiToFrequency = (midi: number): number =>
  440 * 2 ** ((midi - 69) / 12)

export const getTempoScale = (tempo: number): number => 100 / clamp(tempo, 35, 220)

export const getPlaybackDuration = (
  song: MidiSong,
  settings: Pick<RenderSettings, 'tempo'>,
): number => song.summary.duration * getTempoScale(settings.tempo)

export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kilobytes = bytes / 1024
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(2)} MB`
}

export const buildChannelSummaries = (notes: MidiNote[]): ChannelSummary[] => {
  const grouped = new Map<number, MidiNote[]>()
  notes.forEach((note) => {
    const channelNotes = grouped.get(note.channel) ?? []
    channelNotes.push(note)
    grouped.set(note.channel, channelNotes)
  })

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([channel, channelNotes]) => {
      const firstNote = channelNotes[0]
      const channelLabel = (channel + 1).toString().padStart(2, '0')
      return {
        channel,
        color: CHANNEL_COLORS[channel % CHANNEL_COLORS.length],
        instrumentName: firstNote?.instrumentName ?? 'Unknown',
        name: channel === 9 ? 'CH10 Drums' : `CH${channelLabel}`,
        noteCount: channelNotes.length,
      }
    })
}

export const createInitialMix = (channels: ChannelSummary[]): ChannelMix[] => {
  const activeChannels = new Set(channels.map((channel) => channel.channel))

  return Array.from({ length: 16 }, (_, channel) => ({
    channel,
    muted: !activeChannels.has(channel),
    pan: channel % 2 === 0 ? -0.08 : 0.08,
    solo: false,
    volume: activeChannels.has(channel) ? 0.82 : 0.35,
  }))
}

export const isChannelAudible = (
  channel: number,
  mixer: ChannelMix[],
): boolean => {
  const channelMix = mixer.find((mix) => mix.channel === channel)
  const hasSolo = mixer.some((mix) => mix.solo)

  if (!channelMix || channelMix.muted) {
    return false
  }

  return hasSolo ? channelMix.solo : true
}

export const getRenderableNotes = (
  song: MidiSong,
  settings: RenderSettings,
  mixer: ChannelMix[],
  offset = 0,
): RenderableNote[] => {
  const tempoScale = getTempoScale(settings.tempo)

  return song.notes
    .flatMap((note): RenderableNote[] => {
      if (!isChannelAudible(note.channel, mixer)) {
        return []
      }

      const mix = mixer.find((candidate) => candidate.channel === note.channel)
      if (!mix) {
        return []
      }

      const renderTime = note.time * tempoScale
      const renderDuration = Math.max(0.035, note.duration * tempoScale)
      const noteEnd = renderTime + renderDuration

      if (noteEnd < offset) {
        return []
      }

      return [
        {
          ...note,
          gain: clamp(mix.volume, 0, 1),
          pan: clamp(mix.pan, -1, 1),
          pitch: clamp(note.midi + settings.transpose, 12, 120),
          renderDuration,
          renderTime,
        },
      ]
    })
    .sort((a, b) => a.renderTime - b.renderTime)
}
