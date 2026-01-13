# VEdit User Guide

> A complete guide to editing videos with VEdit

---

## Table of Contents

- [Getting Started](#getting-started)
- [Importing Videos](#importing-videos)
- [Trimming](#trimming)
- [Splitting](#splitting)
- [Merging](#merging)
- [Transforms](#transforms)
- [Exporting](#exporting)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Supported Formats](#supported-formats)
- [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Getting Started

### Quick Start

1. **Open VEdit** — Navigate to the app in your browser
2. **Import a video** — Drag and drop a video file onto the window
3. **Edit** — Trim, split, or transform your video
4. **Export** — Click the Export button to download

### System Requirements

| Requirement | Minimum |
|-------------|---------|
| **Browser** | Chrome 89+, Firefox 89+, Safari 15+, Edge 89+ |
| **Memory** | 4GB RAM (8GB recommended for 1080p+) |
| **Storage** | Enough space for video files + exports |

> [!TIP]
> For the best experience with frame-accurate splitting, use **Chrome** or **Edge** which support the WebCodecs API.

---

## Importing Videos

### Drag and Drop

The simplest way to import:
1. Drag a video file from your desktop
2. Drop it onto the VEdit window
3. The clip appears in the left sidebar

### File Picker

1. Click the **+ Add** button in the clips panel
2. Select one or more video files
3. Click **Open**

### Multiple Clips

Import multiple videos for merging:
- Drag multiple files at once
- Use file picker to select multiple files
- Clips appear in order in the sidebar

---

## Trimming

Set in and out points to extract a portion of your video.

### Using the Timeline

1. **Select a clip** in the left sidebar
2. **Drag the left handle** to set the in-point (start)
3. **Drag the right handle** to set the out-point (end)
4. Preview plays only the trimmed section

### Using Keyboard Shortcuts

1. **Play the video** with `Space`
2. Press `I` to set in-point at current time
3. Press `O` to set out-point at current time

### Frame-by-Frame

For precise trimming:
- Use `←` / `→` arrow keys to step one frame
- Use `J` / `L` to rewind/forward playback

---

## Splitting

Divide a video into multiple segments.

### Enabling Split Mode

1. Click the **✂️ Split** toggle button below the timeline
2. The timeline shows an orange split cursor

### Adding Split Points

1. **Hover** over the timeline to see the split preview
2. **Click** where you want to split
3. A vertical **magenta marker** appears
4. Repeat to add more split points

### Adjusting Split Points

- **Drag** a split marker to reposition it
- **Click** on a marker to remove it

### Exporting Splits

1. With split points set, click **Split → N parts**
2. Each segment downloads as a separate MP4
3. Files are named `clipname_segment_1.mp4`, etc.

> [!NOTE]
> **Frame-accurate splitting** requires Chrome/Edge. Other browsers use FFmpeg which may have slight timing differences.

---

## Merging

Combine multiple clips into a single video.

### Steps

1. Import 2+ video clips
2. **Reorder** clips by dragging in the sidebar
3. **Trim** each clip to the desired section
4. Click the **🔗 Merge** button
5. Download the combined video

### Tips

- All clips are re-encoded for compatibility
- Audio from all clips is preserved
- Clips play in sidebar order (top to bottom)

---

## Transforms

Apply visual transformations before export.

### Accessing Transforms

1. Select a clip
2. Use the **Transform Panel** on the right

### Available Transforms

| Transform | Options | Description |
|-----------|---------|-------------|
| **Aspect Ratio** | 16:9, 9:16, 1:1, 4:5, Original | Target output dimensions |
| **Rotate** | 90° CW, 90° CCW | Rotate clockwise/counter-clockwise |
| **Flip** | Horizontal, Vertical | Mirror the video |
| **Speed** | 0.5×, 0.75×, 1×, 1.5×, 2× | Playback speed |

### Cropping

1. Click **Enable Crop** to enter crop mode
2. **Drag the crop box** corners to resize
3. **Drag inside the box** to reposition
4. Click **Disable Crop** when finished

### Live Preview

All transforms preview in real-time before export. The final video is processed with these settings during export.

### Aspect Ratio Presets

| Preset | Dimensions | Best For |
|--------|------------|----------|
| **16:9** | 1920×1080 | YouTube, landscape |
| **9:16** | 1080×1920 | TikTok, Reels, Stories |
| **1:1** | 1080×1080 | Instagram feed |
| **4:5** | 1080×1350 | Instagram portrait |

---

## Exporting

### Single Clip Export

1. Select a clip
2. Set trim points and transforms
3. Click **📤 Export**
4. Wait for processing
5. Download starts automatically

### Split Export

1. Add split points
2. Click **✂️ Split → N parts**
3. Each segment downloads separately

### Merge Export

1. Import and arrange clips
2. Click **🔗 Merge**
3. Download the combined video

### Export Settings

All exports use optimized settings:
- **Video**: H.264 (libx264), CRF 23
- **Audio**: AAC, 128 kbps
- **Format**: MP4 with faststart

---

## Keyboard Shortcuts

### Playback

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `J` | Rewind (progressive speed) |
| `K` | Pause |
| `L` | Forward (progressive speed) |
| `←` | Previous frame |
| `→` | Next frame |

### Editing

| Key | Action |
|-----|--------|
| `I` | Set in-point at playhead |
| `O` | Set out-point at playhead |
| `Delete` | Remove selected clip |

### General

| Key | Action |
|-----|--------|
| `Ctrl/⌘ + Z` | Undo (coming soon) |
| `Ctrl/⌘ + Shift + Z` | Redo (coming soon) |

---

## Supported Formats

### Input Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| **MP4** | `.mp4` | H.264/H.265 |
| **WebM** | `.webm` | VP8/VP9 |
| **QuickTime** | `.mov` | ProRes, H.264 |
| **AVI** | `.avi` | Various codecs |
| **Matroska** | `.mkv` | Various codecs |

### Output Format

All exports are **MP4 (H.264 + AAC)** for maximum compatibility.

### File Size Limits

| Limit | Value |
|-------|-------|
| Maximum file size | 2 GB |
| Recommended | Under 1 GB for best performance |

### Browser Notes

| Browser | Frame-Accurate Split | Notes |
|---------|---------------------|-------|
| Chrome 94+ | ✅ WebCodecs | Best experience |
| Edge 94+ | ✅ WebCodecs | Best experience |
| Firefox | ⚠️ FFmpeg fallback | Slight timing variation |
| Safari | ⚠️ FFmpeg fallback | Limited SharedArrayBuffer |

---

## FAQ & Troubleshooting

### Import Issues

**Q: My video won't import**

Check that:
- File is one of the supported formats
- File size is under 2GB
- File is not corrupted

**Q: Import is very slow**

Large files (1GB+) take time to load into memory. Consider:
- Using smaller source files
- Trimming in another app first

---

### Playback Issues

**Q: Video preview is choppy**

- Try a lower resolution source
- Close other browser tabs
- Ensure your device isn't throttling

**Q: Audio is out of sync**

This can happen with variable frame rate videos. The exported video should be correctly synced.

---

### Export Issues

**Q: Export fails or takes too long**

- Ensure enough disk space
- Avoid exports over 10 minutes on low-end devices
- Try a shorter clip first

**Q: Split segments have cuts at wrong time**

If using Firefox/Safari, there may be slight timing differences. For exact cuts, use Chrome or Edge.

**Q: Merged video has gaps between clips**

All clips are re-encoded for consistency. Ensure source clips have similar audio settings.

---

### Performance Tips

1. **Use Chrome or Edge** for best performance
2. **Work with shorter clips** — Trim before importing long recordings
3. **Close other tabs** — Video processing is memory-intensive
4. **Use SSD storage** — Faster read/write for temp files

---

### Privacy & Data

**Q: Where is my video stored?**

All processing happens locally in your browser. Videos never leave your device.

**Q: Is anything uploaded to servers?**

No. VEdit has zero server uploads. All video processing uses FFmpeg WASM running in your browser.

**Q: What about cookies/tracking?**

VEdit uses no cookies, analytics, or tracking of any kind.

---

## See Also

- [Design Document](./DESIGN.md) — UI/UX specifications
- [Architecture](./ARCHITECTURE.md) — Technical deep-dive
- [API Reference](./API.md) — Developer documentation
- [Contributing](../CONTRIBUTING.md) — How to contribute
