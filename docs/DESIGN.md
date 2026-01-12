# VEdit - Product Design Document

> A lightweight, privacy-first video trimming, splitting, and merging PWA

![UI Mockup](../assets/ui-mockup.png)

## 🎯 Product Vision

**VEdit** is a browser-based video editor focused on doing core operations exceptionally well: **trimming**, **splitting**, and **merging** short video clips. Zero installation, zero uploads—all processing happens locally.

## Target User

- Content creators editing short-form videos
- Social media users trimming clips for sharing
- Anyone needing quick video edits without heavy software

## Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Import** | Drag-drop or file picker, supports MP4/WebM/MOV | ✅ Done |
| **Trim** | Set in/out points, precise frame-level control | ✅ Done |
| **Split** | Mark split points visually, export as separate files | ✅ Done |
| **Merge** | Combine multiple clips in sequence | ✅ Done |
| **Preview** | Real-time playback of edits | ✅ Done |
| **Export** | MP4 output with H.264 encoding | ✅ Done |
| **Transform** | Aspect ratio, crop, rotate, flip | ✅ Done |
| **Speed** | 0.5x to 2x playback speed | ✅ Done |
| **WebCodecs** | Frame-accurate splitting (Chrome) | ✅ Done |
| **Testing** | 58 unit/integration tests | ✅ Done |
| **Undo/Redo** | Full edit history | 🔜 Planned |

## Design Principles

1. **Instant Gratification** — See results immediately, no waiting
2. **Privacy First** — All processing client-side, no server uploads
3. **Minimal Clicks** — Common tasks require minimal interaction
4. **Professional Feel** — Premium aesthetics inspire confidence

---

## 🎨 UI/UX Design

### Color Palette

```css
--bg-primary: #0d0d14;      /* Deep space black */
--bg-secondary: #1a1a2e;    /* Elevated surfaces */
--bg-glass: rgba(255,255,255,0.05); /* Glassmorphism */

--accent-primary: #00d4ff;   /* Cyan - interactive */
--accent-secondary: #ff00aa; /* Magenta - highlights */
--accent-success: #00ff88;   /* Green - confirmations */
--accent-warning: #ffaa00;   /* Orange - split mode */

--text-primary: #ffffff;
--text-secondary: #8888aa;
--text-muted: #555566;
```

### Typography

- **Headings:** Inter, semi-bold
- **Body:** Inter, regular
- **Monospace:** JetBrains Mono (timecodes)

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│  VEdit                              [?] [⚙] [👤]   ← Header │
├────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌──────────────────────────────────────────┐   │
│ │        │  │                                          │   │
│ │ Clips  │  │           Video Preview                  │   │
│ │ Panel  │  │              16:9                        │   │
│ │        │  │                                          │   │
│ │ ─────  │  └──────────────────────────────────────────┘   │
│ │ Clip 1 │                                                 │
│ │ ─────  │  ┌──────────────────────────────────────────┐   │
│ │ Clip 2 │  │ ▶ 00:00:05 ──●────|──|────── 00:02:30    │   │
│ │ ─────  │  │ [=========██|██|██==================]    │   │
│ │  + Add │  │  ↑ In      Split markers     Out ↑       │   │
│ └────────┘  └──────────────────────────────────────────┘   │
│                 ✂️ Add Splits [toggle]   Splits: 2        │
├────────────────────────────────────────────────────────────┤
│  [✂️ Trim]  [✂️ Split → 3 parts]  [🔗 Merge]  [📤 Export] │
└────────────────────────────────────────────────────────────┘
```

### Interaction Patterns

| Action | Trigger | Feedback |
|--------|---------|----------|
| Add clip | Drag-drop or click "+" | Thumbnail appears in panel |
| Select clip | Click thumbnail | Cyan border, loads in preview |
| Set in-point | Drag left handle / press `I` | Yellow marker snaps |
| Set out-point | Drag right handle / press `O` | Yellow marker snaps |
| **Add split** | Toggle "Add Splits", click timeline | Magenta marker appears |
| **Remove split** | Click on split marker | Marker removed |
| Preview trim | Spacebar | Plays between in/out points |
| Merge | Click "Merge" with 2+ clips | Combined timeline view |
| **Split export** | Click "Split → N parts" | Progress modal → N downloads |
| Export | Click "Export" | Progress modal → download |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `J` / `K` / `L` | Rewind / Pause / Forward |
| `I` | Set in-point at playhead |
| `O` | Set out-point at playhead |
| `←` / `→` | Frame step |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Y` | Redo |
| `Delete` | Remove selected clip |

---

## 🏗️ Technical Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Build** | Vite 6 | Fast HMR, optimized builds |
| **UI** | React 19 + TypeScript | Component model, type safety |
| **State** | Zustand 5 | Lightweight, simple API |
| **Video** | ffmpeg.wasm 0.12+ | Browser-native FFmpeg |
| **Splitting** | WebCodecs + mp4box.js | Frame-accurate (with FFmpeg fallback) |
| **Styling** | Vanilla CSS + CSS Modules | Full control, no dependencies |
| **Testing** | Vitest + Testing Library | Fast, Vite-native testing |
| **PWA** | Vite PWA Plugin | Service worker, manifest |

### Project Structure

```
vedit/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── components/
│   │   ├── VideoPlayer/
│   │   ├── Timeline/
│   │   ├── ClipsPanel/
│   │   ├── ActionBar/
│   │   └── ExportModal/
│   ├── hooks/
│   │   ├── useFFmpeg.ts
│   │   ├── useVideoPlayer.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── store/
│   │   ├── editorStore.ts      # Clips, selection, splitPoints, splitMode
│   │   └── exportStore.ts
│   ├── lib/
│   │   ├── ffmpeg.ts           # trimVideo, splitVideo, mergeVideos
│   │   └── time.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── globals.css
│   │   └── components/
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── DESIGN.md
│   ├── TODO.md
│   └── PROGRESS.md
└── package.json
```

### Data Flow

```mermaid
graph LR
    A[File Input] --> B[Clips Store]
    B --> C[Video Player]
    B --> D[Timeline]
    D --> E[Trim Points]
    D --> F[Split Points]
    E --> G[FFmpeg Worker]
    F --> G
    G --> H[Export Blob/s]
    H --> I[Download]
```

### FFmpeg Commands

```typescript
// TRIM: Extract segment with re-encoding (frame accurate)
ffmpeg.exec([
  '-i', 'input.mp4',
  '-ss', startTime,
  '-to', endTime,
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  'output.mp4'
]);

// SPLIT: Multiple segments from split points
// For each [start, end] segment:
ffmpeg.exec([
  '-i', 'input.mp4',
  '-ss', start,
  '-to', end,
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  'segment_N.mp4'
]);

// MERGE: Concatenate multiple clips
ffmpeg.exec([
  '-f', 'concat',
  '-safe', '0',
  '-i', 'list.txt',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  'merged.mp4'
]);

// ASPECT RATIO: Convert to 9:16 vertical with padding
ffmpeg.exec([
  '-i', 'input.mp4',
  '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  'output_vertical.mp4'
]);

// CROP: Center crop to 1:1 square
ffmpeg.exec([
  '-i', 'input.mp4',
  '-vf', 'crop=min(iw\\,ih):min(iw\\,ih)',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  'output_square.mp4'
]);
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| FFmpeg load time | < 2s (cached) |
| Trim (1min clip) | < 15s |
| Split (3 segments) | < 45s |
| Merge (3 clips) | < 30s |
| Export (5min @ 1080p) | < 2min |

---

## 🔒 Privacy & Security

- **Zero server uploads** — All processing via WebAssembly
- **No analytics** — Completely private by default
- **Memory cleanup** — Blob URLs revoked after use
- **No cookies** — Stateless operation

---

## 🚀 Future Roadmap

### Phase 1: Transform (Next)
- Aspect ratio presets (16:9, 9:16, 1:1, 4:5)
- Visual crop tool with preview
- Rotate 90° CW/CCW, flip H/V

### Phase 2: Audio & Speed
- Volume control per clip
- Speed adjustment (0.5x - 2x)
- Mute audio track

### Phase 3: Effects
- Color filters (warm, cool, B&W, vintage)
- Brightness/contrast sliders
- Region blur/pixelate

### Phase 4: Overlays
- Text overlays with fonts
- Transitions between clips
- Watermark/logo placement

### Phase 5: Productivity
- Project auto-save (IndexedDB)
- Export presets (TikTok, Instagram, YouTube)
- Cloud backup (optional Firebase)
