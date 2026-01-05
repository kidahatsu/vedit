# VEdit - Development Progress

> Changelog and development progress tracking

---

## Current Status: ✅ Core Features Complete

| Milestone | Status | Progress |
|-----------|--------|----------|
| Project Setup | ✅ Complete | 100% |
| Core UI | ✅ Complete | 100% |
| Video Engine | ✅ Complete | 100% |
| Split Feature | ✅ Complete | 100% |
| Polish | 🔜 Pending | 0% |
| PWA | ✅ Complete | 100% |

---

## Development Log

### 2026-01-06 — Split Feature Complete ✂️

**Completed:**
- ✅ Split mode toggle button on timeline
- ✅ Visual split cursor with hover preview
- ✅ Click-to-add split points on timeline
- ✅ Split markers displayed as vertical lines (click to remove)
- ✅ Split badge showing point count
- ✅ Frame-accurate video splitting via FFmpeg re-encoding
- ✅ Multi-segment export (separate MP4 files per segment)
- ✅ Prominent orange "Split → N parts" button when active

**Technical Details:**
- Split points stored in `Clip.splitPoints[]` array
- FFmpeg uses `-c:v libx264 -preset ultrafast -crf 23` for fast re-encoding
- Each segment exported as `filename_partN.mp4`

---

### 2026-01-05 — MVP Complete 🎉

**Completed:**
- ✅ Vite + React + TypeScript scaffold
- ✅ Design system (tokens.css, globals.css)
- ✅ Header component with logo
- ✅ ClipsPanel with drag-drop import
- ✅ VideoPlayer with custom controls
- ✅ Timeline with draggable trim handles
- ✅ ActionBar with Trim/Merge/Export
- ✅ ExportModal with progress
- ✅ ffmpeg.wasm integration
- ✅ PWA manifest + service worker
- ✅ Production build verified

**Build Stats:**
- Bundle: 227.68 kB JS (71.33 kB gzipped)
- CSS: 16.13 kB (3.55 kB gzipped)
- Build time: 3.73s

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.2.0 | 2026-01-06 | Split feature: visual split mode, multi-segment export |
| 0.1.0 | 2026-01-05 | MVP: Import, Trim, Merge, Export |
| 0.0.0 | 2026-01-05 | Project planning initiated |

---

## Next Up: Transform Features

Planned for next development session:
- Aspect ratio presets (16:9, 9:16, 1:1, 4:5)
- Visual crop tool with preview
- Rotate/flip options

---

_This document is updated after each development session._
