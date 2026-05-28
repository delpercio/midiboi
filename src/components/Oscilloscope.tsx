import { useEffect, useRef } from 'react'
import type { MidiSong, RenderSettings, TransportState } from '../types'
import { getTempoScale } from '../audio/transform'

interface OscilloscopeProps {
  analyser: AnalyserNode | null
  position: number
  settings: RenderSettings
  song: MidiSong
  transportState: TransportState
}

export function Oscilloscope({
  analyser,
  position,
  settings,
  song,
  transportState,
}: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }

    const waveform = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    let animationFrame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * ratio))
      canvas.height = Math.max(1, Math.floor(rect.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const drawGrid = (width: number, height: number) => {
      context.fillStyle = '#101411'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = 'rgba(46, 230, 222, 0.13)'
      context.lineWidth = 1

      for (let x = 0; x < width; x += 28) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }

      for (let y = 0; y < height; y += 24) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      drawGrid(width, height)

      context.save()
      context.beginPath()
      context.rect(0, 0, width, height)
      context.clip()

      if (analyser && waveform) {
        analyser.getByteTimeDomainData(waveform)
        context.strokeStyle = '#2ee6de'
        context.lineWidth = 2
        context.shadowBlur = 16
        context.shadowColor = '#2ee6de'
        context.beginPath()
        waveform.forEach((sample, index) => {
          const x = (index / (waveform.length - 1)) * width
          const y = (sample / 255) * height
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        })
        context.stroke()
      } else {
        const tempoScale = getTempoScale(settings.tempo)
        const windowStart = Math.max(0, position - 2)
        const windowEnd = windowStart + 8

        song.notes.forEach((note) => {
          const start = note.time * tempoScale
          if (start < windowStart || start > windowEnd) {
            return
          }

          const x = ((start - windowStart) / (windowEnd - windowStart)) * width
          const y = height - ((note.midi - 24) / 72) * height
          const barWidth = Math.max(4, note.duration * tempoScale * 18)

          context.fillStyle = note.channel === 9 ? '#f6c343' : '#2ee6de'
          context.globalAlpha = transportState === 'idle' ? 0.34 : 0.62
          context.fillRect(x, y, barWidth, 3)
        })
      }

      context.restore()
      animationFrame = window.requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [analyser, position, settings.tempo, song.notes, transportState])

  return (
    <section className="scope-panel">
      <div className="panel-heading">
        <span>Scope</span>
        <strong>{transportState.toUpperCase()}</strong>
      </div>
      <canvas aria-label="Oscilloscope" ref={canvasRef} />
    </section>
  )
}
