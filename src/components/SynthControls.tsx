import { useEffect, useRef, useState } from 'react'
import type { ChipMode, RenderSettings } from '../types'
import { CHIP_MODES } from '../types'

interface SynthControlsProps {
  onChange: (settings: RenderSettings) => void
  settings: RenderSettings
}

const MODE_LABELS: Record<ChipMode, string> = {
  famicom: 'Famicom',
  opll: 'OPLL',
  scc: 'SCC',
  triangle: 'Triangle',
}

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  displayValue: string
  colorClass?: string
}

function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  displayValue,
  colorClass = 'knob-orange',
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)
  const startValRef = useRef(0)

  const range = max - min
  const percentage = (value - min) / range
  const angle = -135 + percentage * 270 // 270 degree rotation sweep

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY // Drag up increases, drag down decreases
      // Speed multiplier scales drag distance to control range
      const speed = range / 150
      const nextValue = Math.min(
        max,
        Math.max(
          min,
          Math.round((startValRef.current + deltaY * speed) / step) * step,
        ),
      )
      onChange(nextValue)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, min, max, range, step, onChange])

  // Mobile Touch Support
  useEffect(() => {
    if (!isDragging) return

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      const deltaY = startYRef.current - touch.clientY
      const speed = range / 150
      const nextValue = Math.min(
        max,
        Math.max(
          min,
          Math.round((startValRef.current + deltaY * speed) / step) * step,
        ),
      )
      onChange(nextValue)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, min, max, range, step, onChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startYRef.current = e.clientY
    startValRef.current = value
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    setIsDragging(true)
    startYRef.current = touch.clientY
    startValRef.current = value
  }

  const handleDoubleClick = () => {
    // Reset to sensible standard default values
    let defaultValue = min + range / 2
    const key = label.toLowerCase()
    if (key === 'volume') defaultValue = 0.78
    if (key === 'grit') defaultValue = 0.18
    if (key === 'detune') defaultValue = 0
    if (key === 'tempo') defaultValue = 100
    if (key === 'filter') defaultValue = 4800
    onChange(defaultValue)
  }

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') delta = step
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') delta = -step
    if (delta !== 0) {
      const nextValue = Math.min(max, Math.max(min, value + delta))
      onChange(nextValue)
    }
  }

  return (
    <div className="knob-container">
      <span className="knob-label">{label}</span>
      <div
        className={`knob-body ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        tabIndex={0}
      >
        <div className="knob-track" />
        <div
          className={`knob-pointer ${colorClass}`}
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <div className="knob-cap" />
      </div>
      <strong className="knob-value">{displayValue}</strong>
    </div>
  )
}

export function SynthControls({ onChange, settings }: SynthControlsProps) {
  const update = <Key extends keyof RenderSettings>(
    key: Key,
    value: RenderSettings[Key],
  ) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <section className="synth-panel">
      <div className="panel-heading">
        <span>Sound</span>
        <strong>{MODE_LABELS[settings.mode]}</strong>
      </div>

      <div className="mode-grid">
        {CHIP_MODES.map((mode) => (
          <button
            className={mode === settings.mode ? 'mode-button active' : 'mode-button'}
            key={mode}
            onClick={() => update('mode', mode)}
            type="button"
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="knobs-grid">
        <Knob
          label="Tempo"
          value={settings.tempo}
          min={35}
          max={220}
          onChange={(val) => update('tempo', val)}
          displayValue={`${settings.tempo}%`}
          colorClass="knob-yellow"
        />
        <Knob
          label="Detune"
          value={settings.transpose}
          min={-24}
          max={24}
          onChange={(val) => update('transpose', val)}
          displayValue={`${settings.transpose > 0 ? '+' : ''}${settings.transpose}`}
          colorClass="knob-orange"
        />
        <Knob
          label="Filter"
          value={settings.filterCutoff}
          min={450}
          max={10000}
          step={50}
          onChange={(val) => update('filterCutoff', val)}
          displayValue={`${Math.round(settings.filterCutoff / 100) / 10}k`}
          colorClass="knob-blue"
        />
        <Knob
          label="Grit"
          value={settings.bitcrush}
          min={0}
          max={0.95}
          step={0.01}
          onChange={(val) => update('bitcrush', val)}
          displayValue={`${Math.round(settings.bitcrush * 100)}`}
          colorClass="knob-cyan"
        />
        <Knob
          label="Volume"
          value={settings.masterVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(val) => update('masterVolume', val)}
          displayValue={`${Math.round(settings.masterVolume * 100)}`}
          colorClass="knob-orange"
        />
      </div>
    </section>
  )
}
