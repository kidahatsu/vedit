# VEdit - Development Progress

> Changelog and development progress tracking

---

## Current Status: ✅ Open-Source Ready

| Milestone | Status | Progress |
|-----------|--------|----------|
| Project Setup | ✅ Complete | 100% |
| Core UI | ✅ Complete | 100% |
| Video Engine | ✅ Complete | 100% |
| Split Feature | ✅ Complete | 100% |
| Transform Features | ✅ Complete | 100% |
| PWA | ✅ Complete | 100% |
| Open-Source Infra | ✅ Complete | 100% |
| Polish | 🔜 Pending | 20% |

---

## Development Log

### 2026-01-12 — Open-Source Ready 🚀

**Infrastructure:**
- ✅ ESLint v9 flat config
- ✅ Prettier code formatting
- ✅ 58 unit/integration tests with Vitest
- ✅ CONTRIBUTING.md, CHANGELOG.md, CODE_OF_CONDUCT.md
- ✅ GitHub issue/PR templates

**Refactoring:**
- ✅ TransformPanel uses `useSelectedClip()` selector
- ✅ VideoPlayer uses shared transform utilities
- ✅ Removed code duplication

**Build Stats:**
- Bundle: 469.73 kB JS (133.28 kB gzipped)
- CSS: 27.21 kB (5.09 kB gzipped)
- Tests: 58 passing

---

### 2026-01-07 — Transform Features Complete 🎨

**Completed:**
- ✅ Aspect ratio presets (16:9, 9:16, 1:1, 4:5)
- ✅ Visual crop tool with drag handles
- ✅ Rotate 90° CW/CCW
- ✅ Flip horizontal/vertical
- ✅ Speed control (0.5x to 2x)
- ✅ Live preview with CSS transforms
- ✅ WebCodecs frame-accurate splitting

---

### 2026-01-06 — Split Feature Complete ✂️

**Completed:**
- ✅ Split mode toggle button on timeline
- ✅ Visual split cursor with hover preview
- ✅ Click-to-add split points on timeline
- ✅ Split markers displayed as vertical lines
- ✅ Frame-accurate video splitting via FFmpeg
- ✅ Multi-segment export (separate MP4 files)

---

### 2026-01-05 — MVP Complete 🎉

**Completed:**
- ✅ Vite + React + TypeScript scaffold
- ✅ Design system (tokens.css, globals.css)
- ✅ All core components
- ✅ ffmpeg.wasm integration
- ✅ PWA manifest + service worker

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.2.1 | 2026-01-12 | Open-source infra, tests, refactoring |
| 0.2.0 | 2026-01-07 | Transform: crop, rotate, flip, speed |
| 0.1.1 | 2026-01-06 | Split feature |
| 0.1.0 | 2026-01-05 | MVP: Import, Trim, Merge, Export |

---

_This document is updated after each development session._
