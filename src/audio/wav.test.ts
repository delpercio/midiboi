import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

class FakeAudioBuffer {
  length = 4
  numberOfChannels = 2
  sampleRate = 44_100

  getChannelData(channel: number): Float32Array {
    return channel === 0
      ? new Float32Array([0, 0.5, -0.5, 1])
      : new Float32Array([0, -0.5, 0.5, -1])
  }
}

describe('encodeWav', () => {
  it('writes a valid PCM WAV header', async () => {
    const blob = encodeWav(new FakeAudioBuffer() as AudioBuffer)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const header = String.fromCharCode(...bytes.slice(0, 4))
    const wave = String.fromCharCode(...bytes.slice(8, 12))

    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(60)
    expect(header).toBe('RIFF')
    expect(wave).toBe('WAVE')
  })
})
