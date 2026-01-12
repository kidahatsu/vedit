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

---

## 🔄 In Progress

### Phase 7: Polish
- [ ] Undo/Redo system
- [ ] Loading states + skeletons
- [ ] Responsive layout (tablet)
- [ ] Accessibility audit (ARIA)
- [ ] Keyboard shortcuts documentation

---

## 🚀 Future Features

### Audio (P2)
- [ ] Volume control per-clip
- [ ] Mute audio track
- [ ] Background music overlay
- [ ] Fade in/out

### Visual Effects (P2)
- [ ] Color filters (warm, cool, B&W)
- [ ] Brightness/contrast sliders
- [ ] Region blur/pixelate

### Transitions & Text (P3)
- [ ] Transitions between clips
- [ ] Text overlays
- [ ] Watermark/logo placement

### Productivity (P3)
- [ ] Project auto-save (IndexedDB)
- [ ] Export presets (TikTok, Instagram, YouTube)
- [ ] Batch export

---

## 🐛 Known Issues

- ESLint control-regex warning in validation.ts (intentional for security)
- React hooks exhaustive-deps warning in VideoPlayer (intentional)

---

## 📝 Technical Notes

### Browser Compatibility
- **Chrome 89+** — Full support (WebCodecs)
- **Firefox 89+** — FFmpeg fallback
- **Safari 15+** — Limited SharedArrayBuffer
- **Edge 89+** — Full support

---

_Last updated: 2026-01-12_
