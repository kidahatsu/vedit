# VEdit - Development TODO

> Track all development tasks, bugs, and feature requests

---

## ✅ Completed

### Phase 1: Project Setup
- [x] Initialize Vite + React + TypeScript
- [x] Configure ESLint v9 + Prettier
- [x] Set up CSS design tokens
- [x] Create base component structure
- [x] Add PWA manifest and icons
- [x] Add Vitest testing framework

### Phase 2: Core UI
- [x] **Header** — Logo, settings button
- [x] **ClipsPanel** — Sidebar with clip thumbnails
- [x] **VideoPlayer** — HTML5 video with custom controls
- [x] **Timeline** — Scrubber with trim handles
- [x] **ActionBar** — Trim, Merge, Split, Export buttons
- [x] **ExportModal** — Progress indicator, download
- [x] **TransformPanel** — Rotate, flip, speed controls

### Phase 3: Video Engine
- [x] Integrate ffmpeg.wasm
- [x] Implement file import (drag-drop + picker)
- [x] Generate video thumbnails
- [x] Implement trim operation
- [x] Implement merge operation
- [x] Implement split operation
- [x] Implement export pipeline
- [x] Add progress callbacks
- [x] WebCodecs frame-accurate splitting

### Phase 4: Transform Features
- [x] Aspect ratio presets (16:9, 9:16, 1:1, 4:5)
- [x] Visual crop tool with preview
- [x] Rotate 90° CW/CCW
- [x] Flip horizontal/vertical
- [x] Speed control (0.5x - 2x)
- [x] Live CSS transform preview

### Phase 5: PWA
- [x] Service worker registration
- [x] Offline capability
- [x] Install prompt
- [x] App icons (multiple sizes)

### Phase 6: Open-Source Infrastructure
- [x] ESLint v9 flat config
- [x] Prettier configuration
- [x] CONTRIBUTING.md
- [x] CHANGELOG.md
- [x] CODE_OF_CONDUCT.md
- [x] GitHub issue/PR templates
- [x] Unit tests (58 passing)

### Phase 7: Documentation
- [x] ARCHITECTURE.md — System design, diagrams
- [x] API.md — Function reference
- [x] USER_GUIDE.md — End-user documentation
- [x] DESIGN.md — Feature specifications

---

## ✅ Recently Completed

### Phase 8: Polish
- [x] **Undo/Redo system** — zundo temporal middleware
  - [x] HistoryStore with 50-state limit
  - [x] Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
  - [x] Undo/redo buttons in Header
  - [x] Bug: Blob URL errors after undo → ref-based tracking
  - [x] Bug: State corruption after full undo → defensive null checks
  - [x] Bug: UI not re-rendering after undo/redo → wrapped in arrow functions
- [x] Loading states + skeletons — Skeleton components with shimmer
- [x] Responsive layout (tablet) — 768px breakpoint, mobile clips strip
- [x] Accessibility (ARIA) — toolbar, dialog, aria-labels

### Phase 9: Audio & Persistence
- [x] **Export Presets** — TikTok/IG/YouTube compatible
- [x] **Project Persistence** — IndexedDB auto-save/restore
- [x] **Audio Editing** — Volume, mute, fade in/out


---

## 🚀 Future Features

### Visual Effects — ~5-7 days
- [ ] Color filters (warm, cool, B&W)
- [ ] Brightness/contrast sliders
- [ ] Region blur/pixelate

### Transitions & Overlays — ~7-10 days
- [ ] Transitions between clips
- [ ] Text overlays
- [ ] Watermark/logo placement

---

## 🐛 Known Issues

_No known issues at this time._

---

## 📝 Technical Notes

### Browser Compatibility

| Browser | Split | Notes |
|---------|-------|-------|
| Chrome 89+ | ✅ WebCodecs | Full support |
| Firefox 89+ | ⚠️ FFmpeg | Fallback mode |
| Safari 15+ | ⚠️ FFmpeg | Limited SharedArrayBuffer |
| Edge 89+ | ✅ WebCodecs | Full support |

### Estimation Legend

| Symbol | Meaning |
|--------|---------|
| ⭐ | High priority |
| ~X days | Rough estimate |
| P1/P2/P3 | Priority tier |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, diagrams |
| [API.md](./API.md) | Function reference |
| [USER_GUIDE.md](./USER_GUIDE.md) | End-user docs |
| [DESIGN.md](./DESIGN.md) | UI/UX & feature specs |
| [PROGRESS.md](./PROGRESS.md) | Development log |

---

_Last updated: 2026-01-13_
