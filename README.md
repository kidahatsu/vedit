# VEdit — Browser-Based Video Editor

A professional-grade video editor running entirely in the browser using FFmpeg WASM. No server uploads, no plugins — just drag, drop, and edit.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-007808?logo=ffmpeg)](https://ffmpegwasm.netlify.app)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- **Trim & Split** — Set in/out points, add split markers, export segments
- **Merge Clips** — Combine multiple videos with automatic re-encoding
- **Transform** — Rotate, flip, crop, adjust speed (0.5× to 2×)
- **Aspect Ratios** — Presets for 16:9, 9:16 (TikTok/Reels), 1:1, 4:5
- **Live Preview** — See transforms applied in real-time before export
- **Frame-Accurate** — WebCodecs-based splitting with FFmpeg fallback
- **PWA Ready** — Install as a desktop app, works offline
- **Privacy First** — All processing happens locally, nothing uploaded

---

## 📋 Requirements

### System Requirements

| Requirement | Minimum |
|-------------|---------|
| **Node.js** | 18.0+ |
| **npm** | 9.0+ |
| **RAM** | 4 GB (8 GB recommended for 4K) |
| **Disk** | 500 MB for dependencies |

### Browser Requirements

| Browser | Version | Support Level |
|---------|---------|---------------|
| **Chrome** | 94+ | ✅ Full (WebCodecs + FFmpeg) |
| **Edge** | 94+ | ✅ Full |
| **Safari** | 16.4+ | ✅ Full |
| **Firefox** | 90+ | ⚠️ FFmpeg only (no WebCodecs) |

> **Production Note:** Your server must set [COOP/COEP headers](https://web.dev/coop-coep/) to enable SharedArrayBuffer for FFmpeg threading:
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```

---

## 🚀 Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/kidahatsu/vedit.git
cd vedit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and drag a video file to get started.

### Production Build

```bash
# Build optimized bundle
npm run build

# Preview the production build locally
npm run preview
```

The production build outputs to `dist/` — deploy this folder to any static hosting service.

---

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run format` | Format code with Prettier |

---

## 🏗️ Architecture

<p align="center">
  <img src="docs/assets/architecture.png" alt="VEdit Architecture" width="700">
</p>

### Project Structure

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
│   ├── storage.ts       # IndexedDB persistence
│   └── logger.ts        # Conditional debug logging
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
| **Memory** | Automatic blob URL cleanup, conditional logging |
| **Testing** | Vitest with 80 unit/integration tests |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **UI Framework** | React 19 |
| **State** | Zustand + Zundo (undo/redo) |
| **Video Processing** | FFmpeg WASM 0.12+ |
| **Frame-Accurate Splitting** | WebCodecs API |
| **Build** | Vite 6 |
| **Language** | TypeScript (strict mode) |
| **Testing** | Vitest + Testing Library |
| **Styling** | CSS Modules |

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and architecture security details.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

