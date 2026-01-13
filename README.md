# VEdit — Browser-Based Video Editor

A professional-grade video editor running entirely in the browser using FFmpeg WASM. No server uploads, no plugins — just drag, drop, and edit.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-007808?logo=ffmpeg)](https://ffmpegwasm.netlify.app)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- **Trim & Split** — Set in/out points, add split markers, export segments
- **Merge Clips** — Combine multiple videos with automatic re-encoding
- **Transform** — Rotate, flip, crop, adjust speed (0.5× to 2×)
- **Aspect Ratios** — Presets for 16:9, 9:16 (TikTok/Reels), 1:1, 4:5
- **Live Preview** — See transforms applied in real-time before export
- **Frame-Accurate** — WebCodecs-based splitting with FFmpeg fallback
- **PWA Ready** — Install as a desktop app, works offline
- **Privacy First** — All processing happens locally, nothing uploaded

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and drag a video file to get started.

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run tests with Vitest |
| `npm run format` | Format code with Prettier |

## 🏗️ Architecture

![VEdit Architecture](docs/assets/architecture.png)

```
src/
├── components/          # React components (CSS Modules)
│   ├── VideoPlayer/     # Playback + crop overlay
│   ├── Timeline/        # Trim handles + split markers
│   ├── ClipsPanel/      # Import + clip management
│   ├── TransformPanel/  # Rotate, flip, speed controls
│   ├── ActionBar/       # Export actions
│   └── ExportModal/     # Progress indicator
├── lib/
│   ├── ffmpeg.ts        # FFmpeg WASM integration
│   ├── webcodecs.ts     # WebCodecs splitting
│   └── errors.ts        # Custom error classes
├── store/               # Zustand state management
├── utils/               # Validation, transforms
└── styles/              # Design tokens + globals
```

### Key Patterns

| Pattern | Implementation |
|---------|---------------|
| **Security** | MIME + extension validation, filename sanitization |
| **Error Handling** | Custom `VideoProcessingError` with user-friendly messages |
| **Performance** | Memoized selectors, throttled updates |
| **DRY** | Centralized FFmpeg config, shared utilities |
| **Testing** | Vitest with 58 unit/integration tests |

## 🛠️ Tech Stack

- **React 19** — UI with hooks
- **Zustand** — Lightweight state management
- **FFmpeg WASM** — Client-side video processing
- **WebCodecs** — Frame-accurate splitting
- **Vite** — Fast builds with HMR
- **TypeScript** — Full type safety
- **Vitest** — Unit testing

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 📄 License

MIT — see [LICENSE](LICENSE)
