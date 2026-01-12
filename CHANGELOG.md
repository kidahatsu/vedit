# Changelog

All notable changes to VEdit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint v9 configuration
- Prettier code formatting
- Contributing guidelines
- Unit tests with Vitest

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
