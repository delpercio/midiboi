import type { CSSProperties } from 'react'
import type { ChannelMix, ChannelSummary } from '../types'

interface MixerProps {
  channels: ChannelSummary[]
  mixer: ChannelMix[]
  onChange: (mixer: ChannelMix[]) => void
}

export function Mixer({ channels, mixer, onChange }: MixerProps) {
  const channelMap = new Map(channels.map((channel) => [channel.channel, channel]))

  const updateChannel = (
    channel: number,
    updates: Partial<Omit<ChannelMix, 'channel'>>,
  ) => {
    onChange(
      mixer.map((mix) => (mix.channel === channel ? { ...mix, ...updates } : mix)),
    )
  }

  return (
    <section className="mixer-panel">
      <div className="panel-heading">
        <span>Channels</span>
        <strong>{channels.length}/16 active</strong>
      </div>

      <div className="mixer-table" role="table" aria-label="Channel mixer">
        <div className="mixer-row mixer-head" role="row">
          <span>CH</span>
          <span>Inst</span>
          <span>Vol</span>
          <span>Pan</span>
          <span>Mute</span>
          <span>Solo</span>
          <span>Notes</span>
        </div>

        {mixer.map((mix) => {
          const channel = channelMap.get(mix.channel)
          const isActive = Boolean(channel)
          const color = channel?.color ?? '#4b4d4f'

          return (
            <div
              className={`mixer-row ${isActive ? 'is-active' : 'is-idle'}`}
              key={mix.channel}
              role="row"
              style={{ '--channel-color': color } as CSSProperties}
            >
              <span className="channel-cell">
                <i aria-hidden="true" />
                {channel?.name ?? `CH${(mix.channel + 1).toString().padStart(2, '0')}`}
              </span>
              <span>{channel?.instrumentName ?? 'empty'}</span>
              <input
                aria-label={`Channel ${mix.channel + 1} volume`}
                disabled={!isActive}
                max={1}
                min={0}
                onChange={(event) =>
                  updateChannel(mix.channel, {
                    volume: Number(event.currentTarget.value),
                  })
                }
                step={0.01}
                type="range"
                value={mix.volume}
              />
              <input
                aria-label={`Channel ${mix.channel + 1} pan`}
                disabled={!isActive}
                max={1}
                min={-1}
                onChange={(event) =>
                  updateChannel(mix.channel, {
                    pan: Number(event.currentTarget.value),
                  })
                }
                step={0.01}
                type="range"
                value={mix.pan}
              />
              <button
                className={mix.muted ? 'mini-toggle active' : 'mini-toggle'}
                disabled={!isActive}
                onClick={() => updateChannel(mix.channel, { muted: !mix.muted })}
                type="button"
              >
                M
              </button>
              <button
                className={mix.solo ? 'mini-toggle active solo' : 'mini-toggle'}
                disabled={!isActive}
                onClick={() => updateChannel(mix.channel, { solo: !mix.solo })}
                type="button"
              >
                S
              </button>
              <span>{channel?.noteCount ?? 0}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
