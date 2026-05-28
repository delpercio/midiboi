import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import './App.css'
import { ChipSynthEngine, renderSongToWav } from './audio/chipSynth'
import { Midi } from '@tonejs/midi'
import { createDemoSong, parseMidiFile, songFromMidi } from './audio/midi'
import { createInitialMix, getPlaybackDuration } from './audio/transform'
import { FileDrop, SONGS_LIST } from './components/FileDrop'
import { Mixer } from './components/Mixer'
import { Oscilloscope } from './components/Oscilloscope'
import { SynthControls } from './components/SynthControls'
import { Transport } from './components/Transport'
import { CHIP_MODES } from './types'
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
  const [currentSongId, setCurrentSongId] = useState<string>('demo')
  const [coords, setCoords] = useState('0.00 / 0.00')
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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -(event.clientY / window.innerHeight) * 2 + 1
      setCoords(`${x.toFixed(2)} / ${y.toFixed(2)}`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const loadDemo = useCallback(() => {
    stopPlayback()
    const demo = createDemoSong()
    setSong(demo)
    setFileSize(null)
    setMixer(createInitialMix(demo.channels))
    setError(null)
    setCurrentSongId('demo')
  }, [stopPlayback])

  const loadSongById = useCallback(async (songId: string) => {
    setCurrentSongId(songId)
    if (songId === 'demo') {
      loadDemo()
      return
    }
    try {
      setError(null)
      stopPlayback()
      const url = `${import.meta.env.BASE_URL}songs/${songId}.mid`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load song: ${response.statusText}`)
      }
      const buffer = await response.arrayBuffer()
      const midi = new Midi(buffer)
      const nextSong = songFromMidi(midi, `${songId}.mid`)
      if (nextSong.notes.length === 0) {
        throw new Error('This MIDI did not contain any note events.')
      }
      setSong(nextSong)
      setFileSize(buffer.byteLength)
      setMixer(createInitialMix(nextSong.channels))
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'The MIDI could not load.',
      )
    }
  }, [stopPlayback, loadDemo])

  const loadFile = async (file: File) => {
    try {
      setError(null)
      stopPlayback()
      setCurrentSongId('custom')
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

  const cycleSongs = () => {
    const currentIndex = SONGS_LIST.findIndex((s) => s.id === currentSongId)
    const nextIndex = (currentIndex + 1) % SONGS_LIST.length
    const nextSong = SONGS_LIST[nextIndex]
    void loadSongById(nextSong.id)
  }

  const togglePlayback = () => {
    if (transportState === 'playing') {
      pausePlayback()
    } else {
      void startPlayback(position)
    }
  }

  const cycleMode = () => {
    const currentIndex = CHIP_MODES.indexOf(settings.mode)
    const nextMode = CHIP_MODES[(currentIndex + 1) % CHIP_MODES.length]
    setSettings({ ...settings, mode: nextMode })
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
    <>
      <div className="te-grid-bg" />
      <div className="te-laser-axis" />
      
      <header className="deck-row top-bar">
        <div className="screw top-left" />
        <div className="screw top-right" />
        <div className="screw bottom-left" />
        <div className="screw bottom-right" />
        
        <div className="cell title-cell">
          <h1 className="logo">STEVEN DELPERCIO</h1>
          <span className="version">DEV-SYS // MOD-88</span>
          <a href="https://delpercio.dev" className="portfolio-link">[ &lt;-- PORTFOLIO HOME ]</a>
        </div>
        <div className="cell status-cell">
          <div className="status-indicator">
            <span className="status-dot" />
            <span className="status-label">SYSTEM ONLINE</span>
          </div>
          <div className="telemetry">
            <span className="label">COORDS:</span>
            <span id="coord-val" className="value">{coords}</span>
          </div>
        </div>
      </header>

      <main className="app-shell">
        <section className="device-shell" aria-label="MIDIBOI handheld interface">
          <div className="shell-top">
            <span className="shell-screw top-left" aria-hidden="true" />
            <span className="shell-screw top-right" aria-hidden="true" />
            <div className="cartridge-slot">
              <div className="brand-lockup">
                <Radio aria-hidden="true" size={25} />
                <div>
                  <h1>MIDIBOI</h1>
                  <span>DELPERCIO.DEV/MIDIBOI</span>
                </div>
              </div>
              <span className="cart-label">SCC SOUND CART</span>
            </div>
          </div>

        <div className="screen-bezel">
          <div className="bezel-header">
            <span className="power-led" aria-hidden="true" />
            <span>POWER</span>
            <strong>DOT MATRIX CHIPSOUND</strong>
          </div>

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
                onFile={(file) => void loadFile(file)}
                song={song}
                currentSongId={currentSongId}
                onSongSelect={(songId) => void loadSongById(songId)}
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
        </div>

        <div className="hardware-deck" aria-label="Hardware controls">
          <div className="dpad" aria-label="Playback D-pad">
            <button
              aria-label="Seek backward"
              className="dpad-button dpad-left"
              onClick={() => seek(position - 5)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Play"
              className="dpad-button dpad-up"
              onClick={() => void startPlayback(position)}
              type="button"
            >
              PLAY
            </button>
            <button
              aria-label="Stop"
              className="dpad-button dpad-down"
              onClick={stopPlayback}
              type="button"
            >
              STOP
            </button>
            <button
              aria-label="Seek forward"
              className="dpad-button dpad-right"
              onClick={() => seek(position + 5)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              aria-label="Pause"
              className="dpad-center"
              onClick={pausePlayback}
              type="button"
            />
          </div>

          <div className="system-buttons">
            <button onClick={cycleSongs} type="button">SELECT</button>
            <button onClick={togglePlayback} type="button">START</button>
          </div>

          <div className="speaker-grille" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="action-cluster">
            <button
              className="action-button button-b"
              onClick={cycleMode}
              type="button"
            >
              <strong>B</strong>
              <span>Mode</span>
            </button>
            <button
              className="action-button button-a"
              onClick={() => void exportWav()}
              type="button"
            >
              <strong>A</strong>
              <span>WAV</span>
            </button>
          </div>
        </div>
        </section>
      </main>
    </>
  )
}

export default App
