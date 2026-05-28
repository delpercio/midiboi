import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, GitBranch, Radio } from 'lucide-react'
import './App.css'
import { ChipSynthEngine, renderSongToWav } from './audio/chipSynth'
import { createDemoSong, parseMidiFile } from './audio/midi'
import { createInitialMix, getPlaybackDuration } from './audio/transform'
import { FileDrop } from './components/FileDrop'
import { Mixer } from './components/Mixer'
import { Oscilloscope } from './components/Oscilloscope'
import { SynthControls } from './components/SynthControls'
import { Transport } from './components/Transport'
import type { ChannelMix, MidiSong, RenderSettings, TransportState } from './types'

const DEFAULT_SETTINGS: RenderSettings = {
  bitcrush: 0.18,
  filterCutoff: 4_800,
  masterVolume: 0.78,
  mode: 'scc',
  tempo: 100,
  transpose: 0,
}

function App() {
  const [song, setSong] = useState<MidiSong>(() => createDemoSong())
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS)
  const [mixer, setMixer] = useState<ChannelMix[]>(() =>
    createInitialMix(createDemoSong().channels),
  )
  const [position, setPosition] = useState(0)
  const [transportState, setTransportState] = useState<TransportState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const engineRef = useRef<ChipSynthEngine | null>(null)

  const duration = useMemo(
    () => getPlaybackDuration(song, settings),
    [settings, song],
  )

  const startPlayback = useCallback(
    async (offset: number) => {
      try {
        setError(null)
        const engine = engineRef.current
        if (!engine) {
          return
        }
        await engine.play(song, settings, mixer, Math.min(offset, duration))
        setAnalyser(engine.getAnalyser())
        setTransportState('playing')
      } catch (playbackError) {
        setError(
          playbackError instanceof Error
            ? playbackError.message
            : 'Playback could not start.',
        )
        setTransportState('paused')
      }
    },
    [duration, mixer, settings, song],
  )

  useEffect(() => {
    engineRef.current = new ChipSynthEngine()
    return () => engineRef.current?.stop()
  }, [])

  useEffect(() => {
    if (transportState !== 'playing') {
      return undefined
    }

    const interval = window.setInterval(() => {
      const nextPosition = engineRef.current?.getPosition() ?? 0
      if (nextPosition >= duration) {
        engineRef.current?.stop()
        setAnalyser(null)
        setPosition(0)
        setTransportState('idle')
        return
      }
      setPosition(nextPosition)
    }, 80)

    return () => window.clearInterval(interval)
  }, [duration, transportState])

  useEffect(() => {
    if (transportState !== 'playing') {
      return
    }

    const restart = async () => {
      const currentPosition = engineRef.current?.getPosition() ?? 0
      await startPlayback(currentPosition)
    }

    void restart()
  }, [startPlayback, transportState])

  const pausePlayback = () => {
    const nextPosition = engineRef.current?.pause() ?? position
    setPosition(Math.min(nextPosition, duration))
    setAnalyser(null)
    setTransportState('paused')
  }

  const stopPlayback = () => {
    engineRef.current?.stop()
    setPosition(0)
    setAnalyser(null)
    setTransportState('idle')
  }

  const seek = (nextPosition: number) => {
    const clampedPosition = Math.min(Math.max(nextPosition, 0), duration)
    setPosition(clampedPosition)
    if (transportState === 'playing') {
      void startPlayback(clampedPosition)
    }
  }

  const loadFile = async (file: File) => {
    try {
      setError(null)
      stopPlayback()
      const nextSong = await parseMidiFile(file)
      if (nextSong.notes.length === 0) {
        throw new Error('That MIDI did not contain any note events.')
      }
      setSong(nextSong)
      setFileSize(file.size)
      setMixer(createInitialMix(nextSong.channels))
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'The MIDI could not load.',
      )
    }
  }

  const loadDemo = () => {
    stopPlayback()
    const demo = createDemoSong()
    setSong(demo)
    setFileSize(null)
    setMixer(createInitialMix(demo.channels))
    setError(null)
  }

  const exportWav = async () => {
    try {
      setError(null)
      setTransportState('exporting')
      engineRef.current?.stop()
      setAnalyser(null)
      const wav = await renderSongToWav(song, settings, mixer)
      const url = URL.createObjectURL(wav)
      const link = document.createElement('a')
      link.href = url
      link.download = `${song.summary.fileName.replace(/\.(mid|midi)$/i, '')}-midiboi.wav`
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setTransportState('idle')
    } catch (exportError) {
      setTransportState('paused')
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'WAV rendering failed.',
      )
    }
  }

  return (
    <main className="app-shell">
      <header className="top-strip">
        <div className="brand-lockup">
          <Radio aria-hidden="true" size={25} />
          <div>
            <h1>MIDIBOI</h1>
            <span>GXSCC-style browser synth</span>
          </div>
        </div>
        <a
          aria-label="MIDIBOI GitHub"
          className="github-link"
          href="https://github.com/delpercio/midiboi"
          rel="noreferrer"
          target="_blank"
        >
          <GitBranch aria-hidden="true" size={18} />
          Repo
        </a>
      </header>

      {error ? (
        <div className="error-line" role="alert">
          <AlertTriangle aria-hidden="true" size={17} />
          {error}
        </div>
      ) : null}

      <div className="workbench">
        <aside className="left-rail">
          <FileDrop
            fileSize={fileSize}
            onDemo={loadDemo}
            onFile={(file) => void loadFile(file)}
            song={song}
          />
          <Transport
            duration={duration}
            onExport={() => void exportWav()}
            onPause={pausePlayback}
            onPlay={() => void startPlayback(position)}
            onSeek={seek}
            onStop={stopPlayback}
            position={position}
            transportState={transportState}
          />
        </aside>

        <section className="center-stage">
          <Oscilloscope
            analyser={analyser}
            position={position}
            settings={settings}
            song={song}
            transportState={transportState}
          />
          <Mixer channels={song.channels} mixer={mixer} onChange={setMixer} />
        </section>

        <aside className="right-rail">
          <SynthControls onChange={setSettings} settings={settings} />
          <section className="data-panel">
            <div className="panel-heading">
              <span>MIDI</span>
              <strong>{song.summary.timeSignature}</strong>
            </div>
            <div className="summary-grid wide">
              <span>PPQ</span>
              <strong>{song.summary.ppq}</strong>
              <span>Tracks</span>
              <strong>{song.channels.length}</strong>
              <span>Mode</span>
              <strong>{settings.mode.toUpperCase()}</strong>
              <span>Status</span>
              <strong>{transportState}</strong>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

export default App
