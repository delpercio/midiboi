import { Upload, Disc } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MidiSong } from '../types'
import { formatBytes } from '../audio/transform'

export const SONGS_LIST = [
  { id: 'demo', name: '⚡ MIDIBOI Original Demo', url: 'demo' },
  { id: 'canon', name: '🎵 Pachelbel - Canon in D', url: 'canon' },
  { id: 'eine-kleine', name: '🎻 Mozart - Eine Kleine', url: 'eine-kleine' },
  { id: 'entertainer', name: '🎹 Joplin - The Entertainer', url: 'entertainer' },
  { id: 'fur-elise', name: '🎹 Beethoven - Für Elise', url: 'fur-elise' },
  { id: 'gymnopedie-1', name: '🕯️ Satie - Gymnopédie No. 1', url: 'gymnopedie-1' },
  { id: 'maple-leaf-rag', name: '🎹 Joplin - Maple Leaf Rag', url: 'maple-leaf-rag' },
  { id: 'moonlight-1', name: '🌙 Beethoven - Moonlight Sonata', url: 'moonlight-1' },
  { id: 'nocturne-9-2', name: '🎹 Chopin - Nocturne Op. 9 No. 2', url: 'nocturne-9-2' },
  { id: 'ode-to-joy', name: '🎺 Beethoven - Ode to Joy', url: 'ode-to-joy' },
  { id: 'pathetique-2', name: '🎹 Beethoven - Pathétique', url: 'pathetique-2' },
]

interface FileDropProps {
  fileSize: number | null
  onFile: (file: File) => void
  song: MidiSong
  currentSongId: string
  onSongSelect: (songId: string) => void
}

export function FileDrop({ fileSize, onFile, song, currentSongId, onSongSelect }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) {
      onFile(file)
    }
  }

  return (
    <section
      className={`file-drop ${isDragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="panel-heading">
        <span>File</span>
        <strong>{song.summary.fileName}</strong>
      </div>

      <button
        className="drop-target"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <Upload aria-hidden="true" size={22} />
        <span>Drop MIDI</span>
      </button>

      <input
        accept=".mid,.midi,audio/midi,audio/x-midi"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />

      <div className="summary-grid">
        <span>BPM</span>
        <strong>{song.summary.bpm}</strong>
        <span>Len</span>
        <strong>{song.summary.duration.toFixed(1)}s</strong>
        <span>Notes</span>
        <strong>{song.summary.noteCount}</strong>
        <span>Size</span>
        <strong>{fileSize ? formatBytes(fileSize) : 'demo'}</strong>
      </div>

      <div className="song-selector-container">
        <label htmlFor="song-select" className="sr-only">Choose Song</label>
        <div className="song-select-wrapper">
          <Disc aria-hidden="true" size={14} className="song-select-icon" />
          <select
            id="song-select"
            className="song-select"
            value={currentSongId}
            onChange={(e) => onSongSelect(e.target.value)}
          >
            {SONGS_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
