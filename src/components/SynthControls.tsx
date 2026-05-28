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

      <label className="control-row">
        <span>Tempo</span>
        <input
          max={220}
          min={35}
          onChange={(event) => update('tempo', Number(event.currentTarget.value))}
          step={1}
          type="range"
          value={settings.tempo}
        />
        <strong>{settings.tempo}%</strong>
      </label>

      <label className="control-row">
        <span>Transpose</span>
        <input
          max={24}
          min={-24}
          onChange={(event) =>
            update('transpose', Number(event.currentTarget.value))
          }
          step={1}
          type="range"
          value={settings.transpose}
        />
        <strong>{settings.transpose > 0 ? '+' : ''}{settings.transpose}</strong>
      </label>

      <label className="control-row">
        <span>Filter</span>
        <input
          max={10_000}
          min={450}
          onChange={(event) =>
            update('filterCutoff', Number(event.currentTarget.value))
          }
          step={50}
          type="range"
          value={settings.filterCutoff}
        />
        <strong>{Math.round(settings.filterCutoff / 100) / 10}k</strong>
      </label>

      <label className="control-row">
        <span>Grit</span>
        <input
          max={0.95}
          min={0}
          onChange={(event) =>
            update('bitcrush', Number(event.currentTarget.value))
          }
          step={0.01}
          type="range"
          value={settings.bitcrush}
        />
        <strong>{Math.round(settings.bitcrush * 100)}</strong>
      </label>

      <label className="control-row">
        <span>Master</span>
        <input
          max={1}
          min={0}
          onChange={(event) =>
            update('masterVolume', Number(event.currentTarget.value))
          }
          step={0.01}
          type="range"
          value={settings.masterVolume}
        />
        <strong>{Math.round(settings.masterVolume * 100)}</strong>
      </label>
    </section>
  )
}
