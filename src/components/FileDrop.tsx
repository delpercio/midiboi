import { Upload, WandSparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MidiSong } from '../types'
import { formatBytes } from '../audio/transform'

interface FileDropProps {
  fileSize: number | null
  onDemo: () => void
  onFile: (file: File) => void
  song: MidiSong
}

export function FileDrop({ fileSize, onDemo, onFile, song }: FileDropProps) {
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

      <button className="ghost-action" onClick={onDemo} type="button">
        <WandSparkles aria-hidden="true" size={16} />
        Load demo
      </button>
    </section>
  )
}
