# VEdit User Manual

**VEdit** is a powerful, browser-based video editor that respects your privacy. All video processing happens directly on your device using advanced WebAssembly technology. No files are ever uploaded to a server.

---

## 🚀 Getting Started

### 1. Importing Videos
- **Drag & Drop**: Simply drag video files from your computer and drop them anywhere on the VEdit window.
- **Supported Formats**: standard web formats (MP4, WebM, MOV) are fully supported.
    - *Note: If a video file is incompatible (e.g., HEVC/H.265), VEdit will warn you and offer a built-in fix.*

### 2. The Interface
- **Clips Panel (Left)**: Shows all your imported clips. You can reorder them by dragging.
- **Player (Center)**: The main preview window. Use the play/pause controls or drag the timeline playhead to scrub.
- **Timeline (Bottom)**: Where you edit your video. Shows the duration and trim handle.
- **Action Bar (Bottom)**: Your toolbox for editing, fixing, and exporting.
- **Transform Panel**: Controls for rotating, flipping, cropping, and changing playback speed.

---

## ✂️ Editing Basics

### Trimming
1. Select a clip in the **Timeline** or **Clips Panel**.
2. Drag the **yellow handles** at the start or end of the clip in the timeline.
3. The preview updates instantly to show your new start/end points.

### Splitting
1. Move the playhead (red line) to the exact moment you want to split.
2. Click the **"Add Split"** button (or press `S`) on the timeline track.
3. A split marker appears. You can now export these segments individually using **Export Split**.

### Merging
1. Import multiple clips.
2. Arrange them in the desired order in the **Clips Panel**.
3. Click **"Export Merge"** in the Action Bar.
4. VEdit combines them into a single seamless video file.

---

## 🛠️ Advanced Features

### 🔄 basic Transformations
Use the **Transform Panel** floating over the video player to:
- **Rotate**: 90° increments.
- **Flip**: Horizontally or vertically.
- **Speed**: Change playback rate (0.5x slo-mo to 2x fast-forward).
- **Crop**: enter "Crop Mode" to draw a custom box or use presets like 16:9, 9:16 (TikTok), 1:1 (Instagram).

### ✨ Fix Visibility (Transcoding)
Some videos (like newer iPhone recordings in HEVC format) might appear black or invisible in browsers.
1. **Detection**: VEdit automatically detects these incompatible files.
2. **Warning**: A "Video Incompatible" overlay will appear on the player.
3. **Fix**: Click the **"Fix Visibility"** button (wand icon ✨) in the Action Bar.
4. **Result**: VEdit converts the video to a compatible format in the background and instantly updates your editor.

### 📸 Frame Extraction
Need a thumbnail or a still image?
1. Move the playhead to the frame you want.
2. Click **"First Frame"** or **"Last Frame"** in the Action Bar.
3. The image is saved instantly to your computer as a high-quality WebP file.

### 🎵 Audio Management
- **Remove Audio**: Click the music note icon to strip sound from a clip.
- **Detach Audio**: Extracts the audio track as a separate MP3 file, leaving the video silent.

---

## 💾 Exporting

Click **"Export Selected"** (or Merge/Split) to open the Export options.

### Export Presets
- **Original**: Keeps the original resolution and aspect ratio.
- **Social Media**: Ready-made presets for:
    - **YouTube (16:9)**
    - **TikTok / Reels / Shorts (9:16)**
    - **Instagram Feed (4:5)**
    - **Square (1:1)**

### Process
1. Choose your preset.
2. Click **Export**.
3. A progress bar shows the rendering status.
4. The final file is automatically downloaded to your device.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Space** | Play / Pause |
| **Ctrl + Z** | Undo |
| **Ctrl + Shift + Z** | Redo |
| **Delete / Backspace** | Remove selected clip |
| **Left / Right Arrow** | Nudge playhead by 1 frame |
| **Shift + Left/Right** | Nudge by 1 second |

---

*VEdit v0.2.0*
