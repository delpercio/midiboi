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
        <span>Console Mixer</span>
        <strong>{channels.length}/16 channels active</strong>
      </div>

      <div className="mixer-deck" role="region" aria-label="Console Channel Strips">
        {mixer.map((mix) => {
          const channel = channelMap.get(mix.channel)
          const isActive = Boolean(channel)
          if (!isActive) {
            return null
          }
          const color = channel?.color ?? '#4b4d4f'

          return (
            <div
              className="channel-strip is-active"
              key={mix.channel}
              style={{ '--channel-color': color } as CSSProperties}
            >
              {/* Module Header / LED and Instrument Selector */}
              <div className="strip-header">
                <div className="strip-led-row">
                  <span className="strip-led" aria-hidden="true" />
                  <span className="strip-num">CH{(mix.channel + 1).toString().padStart(2, '0')}</span>
                </div>
                
                {/* Live Instrument Voice Overrider */}
                <select
                  className="strip-inst-select"
                  aria-label={`CH ${mix.channel + 1} Instrument`}
                  value={mix.instrument || 'default'}
                  onChange={(e) => updateChannel(mix.channel, { instrument: e.target.value })}
                >
                  <option value="default">⚙️ {channel?.instrumentName || 'Auto'}</option>
                  <option value="square50">Pulse 50%</option>
                  <option value="square25">Pulse 25%</option>
                  <option value="triangle">Tri Bass</option>
                  <option value="scc">SCC Wave</option>
                  <option value="fm">FM Brass</option>
                  <option value="sine">Sine Lead</option>
                </select>
              </div>

              {/* Horizontal PAN slider */}
              <div className="strip-pan-container">
                <label htmlFor={`pan-${mix.channel}`} className="strip-pan-label">
                  PAN: {mix.pan === 0 ? 'C' : mix.pan > 0 ? `R${Math.round(mix.pan * 10)}` : `L${Math.round(Math.abs(mix.pan) * 10)}`}
                </label>
                <input
                  id={`pan-${mix.channel}`}
                  className="strip-pan-slider"
                  aria-label={`CH ${mix.channel + 1} Pan`}
                  max={1}
                  min={-1}
                  onChange={(event) =>
                    updateChannel(mix.channel, {
                      pan: Number(event.currentTarget.value),
                    })
                  }
                  step={0.05}
                  type="range"
                  value={mix.pan}
                />
              </div>

              {/* Shrunken Vertical Volume Fader */}
              <div className="strip-fader-container">
                <input
                  className="strip-fader"
                  aria-label={`CH ${mix.channel + 1} Volume`}
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
              </div>

              {/* Mute and Solo Hardware buttons */}
              <div className="strip-buttons">
                <button
                  className={`strip-btn ${mix.muted ? 'mute-active' : ''}`}
                  onClick={() => updateChannel(mix.channel, { muted: !mix.muted })}
                  type="button"
                  title="Mute"
                >
                  M
                </button>
                <button
                  className={`strip-btn ${mix.solo ? 'solo-active' : ''}`}
                  onClick={() => updateChannel(mix.channel, { solo: !mix.solo })}
                  type="button"
                  title="Solo"
                >
                  S
                </button>
              </div>

              {/* Footer telemetry displaying note event triggers */}
              <div className="strip-footer">
                <span>{channel?.noteCount ?? 0} NOTES</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
