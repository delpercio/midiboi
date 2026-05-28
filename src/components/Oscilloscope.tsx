import { useEffect, useRef } from 'react'
import type { MidiSong, RenderSettings, TransportState } from '../types'
import { getTempoScale } from '../audio/transform'

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

  // Track props in refs to avoid tearing down the requestAnimationFrame loop on every frame
  const analyserRef = useRef(analyser)
  const positionRef = useRef(position)
  const settingsRef = useRef(settings)
  const songRef = useRef(song)
  const transportStateRef = useRef(transportState)

  const lastPosRef = useRef(position)
  const lastTimeRef = useRef(performance.now())

  // Sync prop updates into refs without triggering effect tear-downs
  useEffect(() => {
    analyserRef.current = analyser
    positionRef.current = position
    settingsRef.current = settings
    songRef.current = song
    transportStateRef.current = transportState
  }, [analyser, position, settings, song, transportState])

  // Track last playhead position update time for high-accuracy note interpolation
  useEffect(() => {
    lastPosRef.current = position
    lastTimeRef.current = performance.now()
  }, [position])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }

    let animationFrame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * ratio))
      canvas.height = Math.max(1, Math.floor(rect.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // 1. Phosphor Persistence Fill (Trailing CRT decay effect)
      context.fillStyle = 'rgba(16, 20, 17, 0.22)'
      context.fillRect(0, 0, width, height)

      const mode = settingsRef.current.mode
      const transport = transportStateRef.current
      const songData = songRef.current
      const analyserNode = analyserRef.current
      const tempo = settingsRef.current.tempo

      // Dynamic Primary/Glow colors based on active synthesizer mode
      let primaryColor = '#00bbff' // SCC Telemetry Blue
      let glowColor = 'rgba(0, 187, 255, 0.35)'
      
      if (mode === 'famicom') {
        primaryColor = '#ffcc00' // Safety Yellow
        glowColor = 'rgba(255, 204, 0, 0.35)'
      } else if (mode === 'triangle') {
        primaryColor = '#ff4500' // Rescue Orange
        glowColor = 'rgba(255, 69, 0, 0.35)'
      } else if (mode === 'opll') {
        primaryColor = '#00ffcc' // Sine/OPLL Retro Cyan/Green
        glowColor = 'rgba(0, 255, 204, 0.35)'
      }

      // 2. Draw Sleek Telemetry CRT Grid
      context.strokeStyle = 'rgba(255, 255, 255, 0.025)'
      context.lineWidth = 1
      const gridSpacing = 24
      
      for (let x = 0; x < width; x += gridSpacing) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
      for (let y = 0; y < height; y += gridSpacing) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }

      // Central Axes (Subtle Orange Calibration Lines)
      context.strokeStyle = 'rgba(255, 69, 0, 0.16)'
      
      // Horizontal Center
      context.beginPath()
      context.moveTo(0, height / 2)
      context.lineTo(width, height / 2)
      context.stroke()

      // Vertical Center
      context.beginPath()
      context.moveTo(width / 2, 0)
      context.lineTo(width / 2, height)
      context.stroke()

      // Center Calibration Crosshairs Ticks (millimeter scale)
      context.fillStyle = 'rgba(255, 69, 0, 0.22)'
      const tickLength = 2.5
      
      // X-Axis ticks
      for (let x = 0; x < width; x += 8) {
        if (Math.abs(x - width / 2) > 2) {
          context.fillRect(x, height / 2 - tickLength, 1, tickLength * 2 + 1)
        }
      }
      // Y-Axis ticks
      for (let y = 0; y < height; y += 8) {
        if (Math.abs(y - height / 2) > 2) {
          context.fillRect(width / 2 - tickLength, y, tickLength * 2 + 1, 1)
        }
      }

      // 3. Draw Clip Boundaries & Signal Content
      context.save()
      context.beginPath()
      context.rect(0, 0, width, height)
      context.clip()

      let currentPos = lastPosRef.current
      if (transport === 'playing') {
        const elapsed = (performance.now() - lastTimeRef.current) / 1000
        currentPos += elapsed
      }

      if (analyserNode) {
        const binCount = analyserNode.frequencyBinCount
        const waveformData = new Uint8Array(binCount)
        analyserNode.getByteTimeDomainData(waveformData)

        // Draw 3-Layer Neon Oscilloscope Line (Hardware accelerated, high-fidelity glow)
        // Layer 1: Wide Background Halo Glow
        context.strokeStyle = glowColor
        context.lineWidth = 5
        context.beginPath()
        waveformData.forEach((sample, index) => {
          const x = (index / (binCount - 1)) * width
          const y = (sample / 255) * height
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        })
        context.stroke()

        // Layer 2: Primary Beam Core
        context.strokeStyle = primaryColor
        context.lineWidth = 2.5
        context.beginPath()
        waveformData.forEach((sample, index) => {
          const x = (index / (binCount - 1)) * width
          const y = (sample / 255) * height
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        })
        context.stroke()

        // Layer 3: Ultra-bright Central Phosphor Core
        context.strokeStyle = '#ffffff'
        context.lineWidth = 1.0
        context.beginPath()
        waveformData.forEach((sample, index) => {
          const x = (index / (binCount - 1)) * width
          const y = (sample / 255) * height
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        })
        context.stroke()
      } else {
        // Waterfall view
        const tempoScale = getTempoScale(tempo)
        const windowStart = Math.max(0, currentPos - 2)
        const windowEnd = windowStart + 8

        // Draw glowing Orange vertical Playhead laser line at 25% width
        context.strokeStyle = 'rgba(255, 69, 0, 0.28)'
        context.lineWidth = 1.5
        context.setLineDash([3, 3])
        context.beginPath()
        context.moveTo(width * 0.25, 0)
        context.lineTo(width * 0.25, height)
        context.stroke()
        context.setLineDash([])

        // Draw note blocks
        songData.notes.forEach((note) => {
          const start = note.time * tempoScale
          if (start < windowStart || start > windowEnd) {
            return
          }

          const x = ((start - windowStart) / (windowEnd - windowStart)) * width
          const y = height - ((note.midi - 24) / 72) * height
          const barWidth = Math.max(4, note.duration * tempoScale * 18)
          const color = CHANNEL_COLORS[note.channel % CHANNEL_COLORS.length]

          const isActive = currentPos >= start && currentPos <= start + note.duration * tempoScale

          if (isActive) {
            // Glowing state when currently triggered by playhead
            context.fillStyle = '#ffffff'
            context.shadowBlur = 12
            context.shadowColor = color
            context.fillRect(x, y - 2, barWidth, 5)
            context.shadowBlur = 0
          } else {
            // Dimmed scrolling state
            context.fillStyle = color
            context.globalAlpha = transport === 'idle' ? 0.22 : 0.44
            context.fillRect(x, y - 1, barWidth, 3)
            context.globalAlpha = 1.0
          }
        })
      }

      context.restore()

      // 4. Fine CRT Horizontal Scanline overlay
      context.fillStyle = 'rgba(0, 0, 0, 0.04)'
      for (let y = 0; y < height; y += 3) {
        context.fillRect(0, y, width, 1)
      }

      // 5. Monospace CRT Metadata Overlay
      context.fillStyle = 'rgba(255, 255, 255, 0.4)'
      context.font = '700 8px "JetBrains Mono", var(--font-mono)'
      context.fillText('DISP: ANALOG OSCILLOSCOPE', 8, 14)
      context.fillText(`MODE: ${mode.toUpperCase()}`, 8, height - 8)
      
      let centerText = `T: ${currentPos.toFixed(2)}S`
      if (analyserNode) {
        centerText = 'SIGNAL ACTIVE'
        context.fillStyle = primaryColor
      }
      context.fillText(centerText, width - 82, 14)
      context.fillStyle = 'rgba(255, 255, 255, 0.4)'
      context.fillText('RATE: 44.1KHZ', width - 78, height - 8)

      animationFrame = window.requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [song]) // Re-run effect ONLY when song changes to update song notes reference

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
