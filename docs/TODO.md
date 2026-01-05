# VEdit - Development TODO

> Track all development tasks, bugs, and feature requests

---

## ✅ Completed

### Phase 1: Project Setup
- [x] Initialize Vite + React + TypeScript
- [x] Configure ESLint + Prettier
- [x] Set up CSS design tokens
- [x] Create base component structure
- [x] Add PWA manifest and icons

### Phase 2: Core UI
- [x] **Header** — Logo, settings button
- [x] **ClipsPanel** — Sidebar with clip thumbnails
- [x] **VideoPlayer** — HTML5 video with custom controls
- [x] **Timeline** — Scrubber with trim handles
- [x] **ActionBar** — Trim, Merge, Split, Export buttons
- [x] **ExportModal** — Progress indicator, download

### Phase 3: Video Engine
- [x] Integrate ffmpeg.wasm
- [x] Implement file import (drag-drop + picker)
- [x] Generate video thumbnails
- [x] Implement trim operation (frame-accurate re-encoding)
- [x] Implement merge operation
- [x] Implement split operation (split at multiple points → separate files)
- [x] Implement export pipeline
- [x] Add progress callbacks

### Phase 5: PWA
- [x] Service worker registration
- [x] Offline capability
- [x] Install prompt
- [x] App icons (multiple sizes)

---

## 🔄 In Progress

### Phase 4: Polish
- [ ] Keyboard shortcuts enhancement
- [ ] Undo/Redo system
- [ ] Error handling + user feedback
- [ ] Loading states + skeletons
- [ ] Responsive layout (tablet)
- [ ] Accessibility audit (ARIA)

---

## 🚀 Feature Expansion (Priority Queue)

### 🎬 Transform & Crop (P1)
- [ ] **Aspect Ratio Presets** — 16:9, 9:16 (vertical), 1:1 (square), 4:5 (Instagram)
- [ ] **Crop Tool** — Visual drag-to-crop with preview
- [ ] **Rotate** — 90° CW/CCW, flip horizontal/vertical
- [ ] **Scale/Zoom** — Pan & zoom within frame

### 🎨 Visual Effects (P2)
- [ ] **Speed Control** — 0.5x, 1.5x, 2x playback with audio pitch correction
- [ ] **Color Filters** — Basic presets (warm, cool, B&W, vintage)
- [ ] **Brightness/Contrast** — Manual adjustment sliders
- [ ] **Blur/Pixelate** — Region-based censoring

### � Audio (P2)
- [ ] **Volume Control** — Per-clip volume adjustment
- [ ] **Mute Audio** — Strip audio track
- [ ] **Background Music** — Add audio track overlay
- [ ] **Fade In/Out** — Audio transitions

### ✨ Transitions & Text (P3)
- [ ] **Transitions** — Fade, dissolve, wipe between clips
- [ ] **Text Overlays** — Titles, captions with fonts
- [ ] **Stickers/Emojis** — Overlay graphics
- [ ] **Watermark** — Add logo/image overlay

### ☁️ Productivity (P3)
- [ ] **Project Auto-save** — IndexedDB persistence
- [ ] **Export Presets** — TikTok, Instagram Reel, YouTube Short, Twitter
- [ ] **Batch Export** — Export all clips individually
- [ ] **Share to Platforms** — Direct upload integration

---

## 🐛 Bugs

_No known bugs_

---

## 📝 Technical Notes

### FFmpeg Transform Commands

```bash
# Aspect ratio change (add letterbox/pillarbox)
-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"

# Crop to center
-vf "crop=1080:1080:(in_w-1080)/2:(in_h-1080)/2"

# Speed change (2x) with audio
-filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]"

# Rotate 90° clockwise
-vf "transpose=1"

# Flip horizontal
-vf "hflip"
```

### Browser Compatibility
- **Chrome 89+** — Full support
- **Firefox 89+** — Full support
- **Safari 15+** — Limited SharedArrayBuffer
- **Edge 89+** — Full support (Chromium)

---

_Last updated: 2026-01-06_
