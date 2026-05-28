import { Download, Pause, Play, Square } from 'lucide-react'
import type { TransportState } from '../types'
import { formatTime } from '../audio/transform'

interface TransportProps {
  duration: number
  onExport: () => void
  onPause: () => void
  onPlay: () => void
  onSeek: (position: number) => void
  onStop: () => void
  position: number
  transportState: TransportState
}

export function Transport({
  duration,
  onExport,
  onPause,
  onPlay,
  onSeek,
  onStop,
  position,
  transportState,
}: TransportProps) {
  const isPlaying = transportState === 'playing'
  const isExporting = transportState === 'exporting'

  return (
    <section className="transport-panel">
      <div className="panel-heading">
        <span>Transport</span>
        <strong>{formatTime(position)} / {formatTime(duration)}</strong>
      </div>

      <div className="transport-controls">
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="icon-button primary"
          disabled={isExporting}
          onClick={isPlaying ? onPause : onPlay}
          type="button"
        >
          {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button
          aria-label="Stop"
          className="icon-button"
          disabled={isExporting}
          onClick={onStop}
          type="button"
        >
          <Square aria-hidden="true" />
        </button>
        <button
          className="export-button"
          disabled={isExporting}
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" size={17} />
          {isExporting ? 'Rendering' : 'Export WAV'}
        </button>
      </div>

      <input
        aria-label="Playback position"
        className="timeline"
        disabled={isExporting}
        max={Math.max(duration, 0.01)}
        min={0}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        step={0.01}
        type="range"
        value={Math.min(position, duration)}
      />
    </section>
  )
}
