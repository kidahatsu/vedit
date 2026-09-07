# VEdit — Browser-Based Video Editor

A private, non-destructive, in-browser video editor running entirely on the client. Powered by WebCodecs, WebGPU, FFmpeg WebAssembly, and on-device Whisper AI. Zero server uploads, zero tracking.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-007808?logo=ffmpeg)](https://ffmpegwasm.netlify.app)
[![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-blue)](https://www.w3.org/TR/webgpu/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-123%20Passing-success)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

<p align="center">
  <img src="docs/assets/ui-mockup.png" alt="VEdit Application Interface" width="900">
</p>

---

## 📚 Documentation

- **[User Manual](USER_MANUAL.md)**: User guide covering editing, splitting, transforms, and exports.
- **[Architecture Deep Dive](docs/ARCHITECTURE.md)**: Engineering design and runtime subsystem breakdown.
- **[Contributing Guide](CONTRIBUTING.md)**: Local development setup, coding standards, and PR workflows.
- **[Security Policy](SECURITY.md)**: Vulnerability disclosure procedure and isolation boundaries.

---

## ✨ Features

- **Non-Destructive Timeline** — Multi-clip sequencing, magnetic playhead scrubbing, split markers, and interactive trimming handles.
- **Hardware-Accelerated WebGPU Pipeline** — Real-time GPU shaders for exposure, contrast, saturation, brightness, rotation, flipping, and framing presets.
- **On-Device AI Suite** — Automated speech-to-text subtitle transcription via Whisper (`onnxruntime-web` / `transformers.js`) and one-click silence detection.
- **Frame-Accurate Splitting** — WebCodecs hardware demuxing and decoding with automated fallback to FFmpeg WebAssembly.
- **Multi-Format Media Transcoding** — Background transcoding for HEVC/incompatible containers, audio detachment to MP3, and still frame extraction to WebP.
- **Preset Export Engine** — Export presets for YouTube (16:9), TikTok/Reels (9:16), Instagram (4:5), and Square (1:1).
- **Persistent Storage** — Non-blocking project saves using IndexedDB and the Origin Private File System (OPFS).
- **Offline-First PWA** — Installable progressive web application with service worker caching.

---

## 📋 Requirements

### System Requirements

| Requirement | Minimum Specification | Recommended Specification |
|:---|:---|:---|
| **Node.js** | 18.0.0+ | 20.x LTS or 22.x LTS |
| **npm** | 9.0.0+ | 10.x+ |
| **RAM** | 4 GB | 8 GB+ (for 4K and multi-track timelines) |
| **GPU** | WebGPU-compatible graphics hardware | Dedicated GPU with WebGPU support |
| **Disk** | 500 MB free space | 2 GB+ (for local OPFS clip storage) |

### Browser Compatibility

| Browser | Supported Engine Versions | Hardware Acceleration |
|:---|:---|:---|
| **Google Chrome / Chromium** | Version 94+ | Full (WebCodecs + WebGPU + FFmpeg WASM) |
| **Microsoft Edge** | Version 94+ | Full (WebCodecs + WebGPU + FFmpeg WASM) |
| **Apple Safari** | Version 16.4+ (iOS 16.4+) | Full (WebCodecs + WebGPU + FFmpeg WASM) |
| **Mozilla Firefox** | Version 90+ | Partial (FFmpeg WASM fallback mode) |

### Cross-Origin Isolation Headers

FFmpeg WebAssembly utilizes multi-threaded `SharedArrayBuffer` memory allocation. Production web servers hosting VEdit must serve the following HTTP response headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 🚀 Installation & Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/kidahatsu/vedit.git
cd vedit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production

```bash
# Typecheck and compile production bundle
npm run build

# Preview production build locally
npm run preview
```

Static release outputs are generated in the `dist/` directory.

---

## 📦 Available Scripts

| Script | Command | Description |
|:---|:---|:---|
| `npm run dev` | `vite` | Starts local development server with HMR |
| `npm run build` | `tsc -b && vite build` | Compiles TypeScript and builds production distribution |
| `npm run preview` | `vite preview` | Previews production distribution locally |
| `npm run typecheck` | `tsc --noEmit` | Executes strict TypeScript static analysis |
| `npm run lint` | `eslint .` | Runs ESLint analysis across the repository |
| `npm run lint:fix` | `eslint . --fix` | Automatically fixes mechanical ESLint issues |
| `npm run format` | `prettier --write "src/**/*.{ts,tsx,css}"` | Formats source files according to Prettier rules |
| `npm run format:check` | `prettier --check "src/**/*.{ts,tsx,css}"` | Verifies formatting compliance without writing |
| `npm test` | `vitest run` | Runs test suite (123 unit and integration tests) |
| `npm run test:watch` | `vitest` | Runs test suite in interactive watch mode |

---

## 🏗️ Architecture

<p align="center">
  <img src="docs/assets/architecture.png" alt="VEdit System Architecture" width="800">
</p>

### Repository Layout

```
vedit/
├── docs/                 # Architectural specifications, diagrams, and guides
│   └── assets/           # Application screenshots and architecture diagrams
├── public/               # Static icons, manifest, and service worker assets
├── src/
│   ├── components/       # React 19 UI modules with scoped CSS Modules
│   │   ├── ActionBar/    # Bottom action dock & export triggers
│   │   ├── ClipsPanel/   # Media ingestion & clip organization drawer
│   │   ├── ExportModal/  # Multi-format export progress modal
│   │   ├── Header/       # Top application bar & project title
│   │   ├── HelpModal/    # Interactive user guide & keyboard shortcuts
│   │   ├── InspectorPanel/ # Color grading, transform controls, & AI tools
│   │   ├── SettingsModal/# Project settings & configuration sheet
│   │   ├── StatusBar/    # Timecode, memory status, and runtime indicators
│   │   ├── Timeline/     # Magnetic multi-track editing workspace
│   │   ├── TransformPanel/# Real-time crop, flip, and rotation controls
│   │   └── VideoPlayer/  # Canvas preview, crop overlay, and transport bar
│   ├── lib/              # Core processing engines & infrastructure
│   │   ├── ai/           # Local Whisper subtitles & silence detection
│   │   ├── ffmpeg/       # FFmpeg WebAssembly configuration and presets
│   │   ├── ffmpeg.ts     # FFmpeg command execution & transcode workflows
│   │   ├── storage/      # IndexedDB and Origin Private File System drivers
│   │   ├── webcodecs.ts  # Frame-accurate demuxing & splitting pipeline
│   │   └── webgpu/       # WebGPU renderer, shader filters, and GPU export
│   ├── store/            # Zustand reactive state models with undo/redo
│   ├── styles/           # Design tokens, color palettes, and global styles
│   └── utils/            # Magic-byte file validation and geometric transforms
├── package.json          # Dependency manifest
└── vite.config.ts        # Vite configuration with COOP/COEP headers
```

---

## 🔒 Security Architecture

- **Zero Remote Sinks:** No media data or user files ever leave the client.
- **Magic-Byte Media Validation:** Strict container header inspection (ISO BMFF, EBML, RIFF) prevents malicious file execution.
- **Sandboxed WebAssembly Execution:** FFmpeg commands execute inside an isolated WebAssembly memory sandbox.
- **Strict Static Typing:** 100% strict TypeScript typing with zero `any` evasions.

Refer to [SECURITY.md](SECURITY.md) for vulnerability reporting guidelines.

---

## 📄 License & Attribution

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for full details.

VEdit incorporates and dynamically loads third-party open-source components including FFmpeg (LGPL v2.1 / GPL v3), ONNX Runtime Web (MIT), Transformers.js (Apache 2.0), React (MIT), and Lucide Icons (ISC). Complete licensing and patent grants are detailed in the [LICENSE](LICENSE) file.
