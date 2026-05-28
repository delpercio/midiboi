# MIDIBOI

MIDIBOI is a lightweight browser remake in the spirit of GXSCC: drop in a MIDI file, remap the channels through crunchy chip-style oscillators, play it locally, and export a WAV render.

The app is fully client-side. MIDI parsing, playback, mixing, and WAV export all happen in the browser through Web Audio.

## Features

- MIDI drag-and-drop with demo sequence fallback
- SCC, Famicom, Triangle, and OPLL-ish chip modes
- 16-channel mixer with mute, solo, volume, and pan controls
- Tempo, transpose, filter, grit, and master output controls
- Live oscilloscope and note activity view
- Offline WAV rendering with no server upload
- Static deployment under `/midiboi/`

## Stack

- React 19
- Vite
- TypeScript
- `@tonejs/midi`
- Web Audio API
- Vitest

## Local Development

```bash
npm install
npm run dev
```

The Vite base path is `/midiboi/`, so the local app is available at:

```text
http://localhost:5173/midiboi/
```

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## Deployment

This repo is configured as a static Vercel app. It serves assets under `/midiboi/` so it can be proxied from `https://delpercio.dev/midiboi`.

The production path is expected to be wired from the `delpercio-dev` Vercel project with rewrites that forward `/midiboi/:path*` to this app's Vercel URL.

## License

MIT
