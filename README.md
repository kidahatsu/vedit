# VEdit — Browser-Based Video Editor

A professional-grade video editor running entirely in the browser using FFmpeg WASM. No server uploads, no plugins — just drag, drop, and edit.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-007808?logo=ffmpeg)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)

## ✨ Features

- **Trim & Split** — Set in/out points, add split markers, export segments
- **Merge Clips** — Combine multiple videos with automatic re-encoding
- **Transform** — Rotate, flip, crop, adjust speed (0.5× to 2×)
- **Aspect Ratios** — Presets for 16:9, 9:16 (TikTok/Reels), 1:1, 4:3
- **Live Preview** — See transforms applied in real-time before export
- **PWA Ready** — Install as a desktop app, works offline

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) and drag a video file to get started.

## 🏗️ Architecture Highlights

This codebase demonstrates production-quality patterns:

| Pattern | Implementation |
|---------|---------------|
| **Security** | MIME + extension validation, filename sanitization, size limits |
| **Error Handling** | Custom `VideoProcessingError` with user-friendly messages |
| **Performance** | Throttled state updates, memoized selectors, proper cleanup |
| **DRY** | Centralized FFmpeg encoding config, extracted utilities |
| **Type Safety** | Strict TypeScript, comprehensive JSDoc documentation |

### Key Files

```
src/
├── lib/
│   ├── ffmpeg.ts          # FFmpeg WASM integration
│   ├── ffmpeg/config.ts   # Encoding presets (DRY)
│   └── errors.ts          # Custom error classes
├── store/
│   ├── editorStore.ts     # Zustand state management
│   └── selectors.ts       # Memoized selectors
├── utils/
│   ├── validation.ts      # File & filename validation
│   └── videoTransforms.ts # CSS transform utilities
└── components/
    ├── VideoPlayer/       # Playback + crop overlay
    ├── Timeline/          # Trim handles + split markers
    ├── ClipsPanel/        # Import + clip management
    └── ActionBar/         # Export actions
```

## 🛠️ Tech Stack

- **React 19** — UI components with hooks
- **Zustand** — Lightweight state management
- **FFmpeg WASM** — Client-side video processing
- **Vite** — Fast dev server + optimized builds
- **TypeScript** — Full type safety

## 📄 License

MIT
