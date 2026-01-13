# VEdit API Reference

> Complete documentation of VEdit's public APIs, functions, and types

---

## Table of Contents

- [Video Processing](#video-processing)
  - [lib/ffmpeg.ts](#libffmpegts)
  - [lib/webcodecs.ts](#libwebcodecsts)
  - [lib/errors.ts](#liberrorsts)
- [State Management](#state-management)
  - [store/editorStore.ts](#storeeditorstoreets)
  - [store/selectors.ts](#storeselectorsts)
- [Utilities](#utilities)
  - [utils/validation.ts](#utilsvalidationts)
  - [utils/videoTransforms.ts](#utilsvideotransformsts)

---

## Video Processing

### lib/ffmpeg.ts

Core video processing functions using FFmpeg WASM.

#### `trimVideo`

Trims a video to the specified time range.

```typescript
function trimVideo(
    file: File,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | Input video file |
| `startTime` | `number` | Start time in seconds |
| `endTime` | `number` | End time in seconds |
| `onProgress` | `function` | Progress callback (0-100) |

**Returns:** `Promise<Blob>` — Trimmed MP4 video

**Example:**
```typescript
const trimmedBlob = await trimVideo(file, 5.0, 15.0, (progress, msg) => {
    console.log(`${progress}%: ${msg}`)
})
```

---

#### `mergeVideos`

Concatenates multiple video clips into a single video.

```typescript
function mergeVideos(
    files: { file: File; trimStart: number; trimEnd: number }[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `array` | Array of clip objects with trim points |
| `files[].file` | `File` | Video file for this clip |
| `files[].trimStart` | `number` | Start time in seconds |
| `files[].trimEnd` | `number` | End time in seconds |
| `onProgress` | `function` | Progress callback |

**Returns:** `Promise<Blob>` — Merged MP4 video

**Example:**
```typescript
const merged = await mergeVideos([
    { file: clip1, trimStart: 0, trimEnd: 10 },
    { file: clip2, trimStart: 5, trimEnd: 20 },
])
```

---

#### `splitVideo`

Splits a video at multiple points into separate clips. Uses WebCodecs when available for frame-accurate splitting, falls back to FFmpeg otherwise.

```typescript
function splitVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    splitPoints: number[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | Input video file |
| `trimStart` | `number` | Overall trim start in seconds |
| `trimEnd` | `number` | Overall trim end in seconds |
| `splitPoints` | `number[]` | Timestamps to split at |
| `onProgress` | `function` | Progress callback |

**Returns:** `Promise<Blob[]>` — Array of MP4 blobs (one per segment)

**Example:**
```typescript
// Split a 30-second video at 10s and 20s → 3 segments
const segments = await splitVideo(file, 0, 30, [10, 20])
// segments[0] = 0-10s, segments[1] = 10-20s, segments[2] = 20-30s
```

---

#### `transformVideo`

Applies transformations (aspect ratio, crop, rotation, flip, speed) to a video.

```typescript
function transformVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    transform: TransformOptions,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | Input video file |
| `trimStart` | `number` | Trim start in seconds |
| `trimEnd` | `number` | Trim end in seconds |
| `transform` | `TransformOptions` | Transformation settings |
| `onProgress` | `function` | Progress callback |

**TransformOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `aspectRatio` | `AspectRatioPreset` | Target aspect ratio |
| `crop` | `{ x, y, width, height }` | Crop region (0-1 normalized) |
| `rotation` | `0 \| 90 \| 180 \| 270` | Rotation degrees |
| `flipH` / `flipV` | `boolean` | Flip horizontally/vertically |
| `speed` | `0.5-2` | Playback speed multiplier |
| `sourceWidth` / `sourceHeight` | `number` | Original video dimensions |

**Returns:** `Promise<Blob>` — Transformed MP4 video

---

#### `isWebCodecsSupported`

Re-exported from webcodecs.ts for UI feature detection.

```typescript
function isWebCodecsSupported(): boolean
```

**Returns:** `true` if browser supports WebCodecs API

---

### lib/webcodecs.ts

Frame-accurate video processing using the WebCodecs API.

#### `splitVideoWebCodecs`

Splits video using native WebCodecs for exact frame selection.

```typescript
function splitVideoWebCodecs(
    file: File,
    trimStart: number,
    trimEnd: number,
    splitPoints: number[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | MP4 video file (H.264 required) |
| `trimStart` | `number` | Start time in seconds |
| `trimEnd` | `number` | End time in seconds |
| `splitPoints` | `number[]` | Split timestamps |
| `onProgress` | `function` | Progress callback |

**Returns:** `Promise<Blob[]>` — Frame-accurate MP4 segments

**Throws:**
- `Error` if WebCodecs not supported
- `Error` if video codec not supported by WebCodecs
- `Error` if no video track found

> [!NOTE]
> This function is called automatically by `splitVideo()` when WebCodecs is available. Direct usage is typically not needed.

---

#### `isWebCodecsSupported`

Checks browser capability for WebCodecs API.

```typescript
function isWebCodecsSupported(): boolean
```

**Returns:** `true` if all WebCodecs APIs are available:
- `VideoDecoder`
- `VideoEncoder`
- `AudioDecoder`
- `AudioEncoder`

---

### lib/errors.ts

Structured error handling for video operations.

#### `VideoProcessingError`

Custom error class with operation context and user-friendly messages.

```typescript
class VideoProcessingError extends Error {
    readonly operation: VideoOperation
    readonly cause: unknown
    readonly context?: Record<string, unknown>
    
    get userMessage(): string
    toJSON(): Record<string, unknown>
}
```

**Constructor:**
```typescript
new VideoProcessingError(
    operation: VideoOperation,
    cause: unknown,
    context?: Record<string, unknown>
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `operation` | `'trim' \| 'merge' \| 'split' \| 'transform' \| 'load'` | Operation type |
| `cause` | `unknown` | Original error |
| `context` | `object` | Additional debugging info |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Technical error message |
| `userMessage` | `string` | User-friendly display message |
| `operation` | `VideoOperation` | Which operation failed |
| `cause` | `unknown` | Original error |
| `context` | `object` | Extra context (filename, etc.) |

**Example:**
```typescript
try {
    await trimVideo(file, start, end)
} catch (err) {
    const error = new VideoProcessingError('trim', err, { filename: file.name })
    console.error(error.message)      // "trim failed: ..."
    showToast(error.userMessage)      // "Failed to trim the video..."
}
```

---

#### `isVideoProcessingError`

Type guard for VideoProcessingError.

```typescript
function isVideoProcessingError(error: unknown): error is VideoProcessingError
```

---

#### `wrapError`

Wraps any error in VideoProcessingError.

```typescript
function wrapError(
    error: unknown,
    operation: VideoOperation,
    context?: Record<string, unknown>
): VideoProcessingError
```

If the error is already a `VideoProcessingError`, it's returned unchanged.

**Example:**
```typescript
catch (err) {
    const error = wrapError(err, 'trim', { filename })
    setError(error.userMessage)
}
```

---

## State Management

### store/editorStore.ts

Main Zustand store for editor state.

#### Types

```typescript
type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | 'original'

interface TransformState {
    aspectRatio: AspectRatioPreset
    cropX: number        // 0-1 normalized
    cropY: number        // 0-1 normalized
    cropWidth: number    // 0-1 normalized
    cropHeight: number   // 0-1 normalized
    rotation: 0 | 90 | 180 | 270
    flipH: boolean
    flipV: boolean
    speed: 0.5 | 0.75 | 1 | 1.5 | 2
}

interface Clip {
    id: string
    file: File
    name: string
    duration: number
    thumbnailUrl: string | null
    trimStart: number
    trimEnd: number
    splitPoints: number[]
    transform: TransformState
}
```

#### Constants

```typescript
const ASPECT_RATIO_DIMENSIONS: Record<Exclude<AspectRatioPreset, 'original'>, { width: number; height: number }>

const DEFAULT_TRANSFORM: TransformState
```

#### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addClip` | `(clip: Clip) => void` | Add clip and select it |
| `removeClip` | `(id: string) => void` | Remove clip by ID |
| `selectClip` | `(id: string \| null) => void` | Set selected clip |
| `updateClipTrim` | `(id, start, end) => void` | Update trim points |
| `addSplitPoint` | `(id, time) => void` | Add split marker |
| `removeSplitPoint` | `(id, time) => void` | Remove split marker |
| `updateSplitPoint` | `(id, oldTime, newTime) => void` | Move split marker |
| `clearSplitPoints` | `(id) => void` | Remove all split markers |
| `reorderClips` | `(from, to) => void` | Reorder clips array |
| `setLoading` | `(loading) => void` | Toggle loading state |
| `toggleSplitMode` | `() => void` | Toggle split mode |
| `toggleCropMode` | `() => void` | Toggle crop mode |
| `setSeekPreviewTime` | `(time \| null) => void` | Seek preview video |
| `updateTransform` | `(id, partial) => void` | Update transform |
| `resetTransform` | `(id) => void` | Reset to defaults |
| `reset` | `() => void` | Clear all state |

**Example:**
```typescript
import { useEditorStore } from '@/store/editorStore'

function MyComponent() {
    const clips = useEditorStore((state) => state.clips)
    const addClip = useEditorStore((state) => state.addClip)
    
    // Add a new clip
    addClip({
        id: crypto.randomUUID(),
        file: videoFile,
        name: 'clip.mp4',
        duration: 30,
        thumbnailUrl: null,
        trimStart: 0,
        trimEnd: 30,
        splitPoints: [],
        transform: DEFAULT_TRANSFORM,
    })
}
```

---

### store/selectors.ts

Memoized selector hooks for optimized re-renders.

#### `useSelectedClip`

```typescript
function useSelectedClip(): Clip | undefined
```

Returns the currently selected clip, memoized to prevent unnecessary re-renders.

**Example:**
```typescript
function TransformPanel() {
    const clip = useSelectedClip()
    if (!clip) return <div>Select a clip</div>
    return <div>{clip.name}</div>
}
```

---

#### `useHasClips`

```typescript
function useHasClips(): boolean
```

Returns `true` if any clips are loaded.

---

#### `useCanMerge`

```typescript
function useCanMerge(): boolean
```

Returns `true` if 2+ clips exist (merge is possible).

---

#### `useCanSplit`

```typescript
function useCanSplit(): boolean
```

Returns `true` if selected clip has split points defined.

---

#### `useSelectedClipId`

```typescript
function useSelectedClipId(): string | null
```

Lightweight selector for just the clip ID.

---

#### `useSplitMode`

```typescript
function useSplitMode(): boolean
```

Returns `true` if split mode is active.

---

#### `useCropMode`

```typescript
function useCropMode(): boolean
```

Returns `true` if crop mode is active.

---

## Utilities

### utils/validation.ts

File validation for secure video processing.

#### `validateVideoFile`

Comprehensive validation with MIME type, extension, and size checks.

```typescript
function validateVideoFile(file: File): ValidationResult

interface ValidationResult {
    valid: boolean
    error?: string
}
```

**Checks performed:**
1. MIME type is in supported list
2. File extension matches MIME type
3. File size within limits (2GB max)
4. File is not empty

**Supported formats:**
- `video/mp4` (.mp4)
- `video/webm` (.webm)
- `video/quicktime` (.mov)
- `video/x-msvideo` (.avi)
- `video/x-matroska` (.mkv)

**Example:**
```typescript
const result = validateVideoFile(file)
if (!result.valid) {
    showError(result.error)
    return
}
```

---

#### `sanitizeFilename`

Sanitizes filenames for safe downloads.

```typescript
function sanitizeFilename(filename: string, maxLength?: number): string
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filename` | `string` | — | Original filename |
| `maxLength` | `number` | `100` | Maximum length |

**Protections:**
- Removes path traversal (`../`)
- Replaces invalid filesystem characters
- Removes leading dots
- Truncates while preserving extension

**Example:**
```typescript
sanitizeFilename('../hack.mp4')      // 'hack.mp4'
sanitizeFilename('my<video>.mp4')    // 'my_video_.mp4'
```

---

#### `isVideoFile`

Quick MIME type check.

```typescript
function isVideoFile(file: File): boolean
```

Returns `true` if file type starts with `video/`.

---

#### Constants

```typescript
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024  // 2GB
```

---

### utils/videoTransforms.ts

Pure functions for transform calculations and CSS styling.

#### `buildVideoTransformStyle`

Builds CSS transform string from transform state.

```typescript
function buildVideoTransformStyle(transform: TransformState): CSSProperties
```

**Example:**
```typescript
const style = buildVideoTransformStyle({
    rotation: 90,
    flipH: true,
    flipV: false,
    // ... other props
})
// Returns: { transform: 'rotate(90deg) scaleX(-1)' }
```

---

#### `calculateCropBoxStyle`

Calculates CSS for crop overlay positioning.

```typescript
function calculateCropBoxStyle(transform: TransformState): CropBoxStyle

interface CropBoxStyle {
    left: string   // Percentage
    top: string    // Percentage
    width: string  // Percentage
    height: string // Percentage
}
```

**Example:**
```typescript
const style = calculateCropBoxStyle({
    cropX: 0.1,
    cropY: 0.2,
    cropWidth: 0.5,
    cropHeight: 0.6,
    // ...
})
// Returns: { left: '10%', top: '20%', width: '50%', height: '60%' }
```

---

#### `hasCropApplied`

Checks if non-default crop is applied.

```typescript
function hasCropApplied(transform: TransformState): boolean
```

Returns `true` if any crop value differs from full-frame defaults.

---

#### `hasTransformsApplied`

Checks if any transforms are applied.

```typescript
function hasTransformsApplied(transform: TransformState): boolean
```

Returns `true` if any of:
- Aspect ratio ≠ 'original'
- Rotation ≠ 0
- Flip enabled
- Speed ≠ 1
- Crop applied

Useful for determining if `transformVideo` should be called instead of simpler `trimVideo`.

---

## See Also

- [Architecture](./ARCHITECTURE.md) — System design and patterns
- [User Guide](./USER_GUIDE.md) — End-user documentation
- [Design Document](./DESIGN.md) — UI/UX specifications
