# Changelog

All notable changes to VEdit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Hardware-Accelerated WebGPU Pipeline**: Real-time shader effects for exposure, contrast, saturation, brightness, and direct GPU canvas exports.
- **On-Device AI Suite**: Integrated Whisper local speech-to-text subtitle transcription and automated silence detection powered by `onnxruntime-web` and `transformers.js`.
- **Advanced FFmpeg Tools**: Frame extraction to WebP, audio track detachment to MP3, audio stripping, and automated transcoding for incompatible HEVC containers.
- **OPFS & IndexedDB Persistence**: High-throughput Origin Private File System caching for media buffers and persistent project recovery.
- **Comprehensive Documentation**: Added complete User Manual (`USER_MANUAL.md`), technical architecture diagrams, and high-resolution UI walkthroughs.

### Security & Hardening
- **Pre-Publish Security Audit Clearance**: Passed 7/7 automated security dimensions in strict mode.
- **Dynamic Execution Neutralization**: Refactored FFmpeg WebAssembly execution into strongly typed, sandboxed boundary helpers.
- **Supply Chain Hardening**: 0 known CVE vulnerabilities across production dependency tree.
- **Magic-Byte Media Validation**: Multi-format container header verification (ISO BMFF, WebM/EBML, RIFF/AVI) mitigating file upload spoofing.
- **Cross-Origin Isolation**: Configured strict COOP and COEP headers for SharedArrayBuffer thread isolation.
- **Trademark Neutralization**: Cleaned all commercial competitor marks and finalized third-party LGPL/GPL licensing disclosures.

## [0.3.1] - 2026-01-13

### Fixed
- Blob URL `ERR_FILE_NOT_FOUND` errors after undo operations
- TypeError `Cannot read addClip` after performing undo
- UI not re-rendering after undo/redo (wrapped temporal functions in arrow functions)
- State corruption after undoing to empty state (defensive null checks)
- ESLint no-control-regex warning in validation.ts
- React hooks exhaustive-deps warning in VideoPlayer.tsx

### Changed
- Undo/redo now properly trigger React re-renders
- All historyStore actions now have defensive null checks for state.clips

## [0.2.0] - 2026-01-06

### Added
- Split mode toggle on timeline
- Visual split cursor with hover preview
- Click-to-add split points on timeline
- Split markers displayed as vertical lines
- Frame-accurate video splitting via FFmpeg
- Multi-segment export (separate MP4 files per segment)
- WebCodecs support for frame-accurate splitting with FFmpeg fallback

## [0.1.0] - 2026-01-05

### Added
- Initial MVP release
- Video import via drag-drop and file picker
- Trim operation with draggable in/out points
- Merge multiple clips in sequence
- Export to MP4 (H.264 encoding)
- Real-time preview with custom video controls
- Thumbnail generation for clips
- PWA support with offline capability
- Design system with CSS tokens
- Zustand state management

### Technical
- Vite + React 19 + TypeScript
- FFmpeg WASM integration
- CSS Modules for component styling
- File validation (MIME, extension, size)
- Custom error handling with user-friendly messages
