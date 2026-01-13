/**
 * @fileoverview Shared types for editor state.
 * Extracted to avoid circular dependencies between stores.
 */

/**
 * Aspect ratio presets for video export.
 */
export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | 'original'

/**
 * Transform state for each clip.
 */
export interface TransformState {
    // Aspect ratio preset (original = no change)
    aspectRatio: AspectRatioPreset

    // Crop region (0-1 normalized values, relative to original video)
    cropX: number
    cropY: number
    cropWidth: number
    cropHeight: number

    // Rotation: 0, 90, 180, 270 degrees clockwise
    rotation: 0 | 90 | 180 | 270

    // Flip flags
    flipH: boolean
    flipV: boolean

    // Playback speed multiplier
    speed: 0.5 | 0.75 | 1 | 1.5 | 2

    // Audio settings
    volume: number   // 0-100 (100 = original volume)
    muted: boolean
    fadeIn: number   // Fade in duration in seconds
    fadeOut: number  // Fade out duration in seconds
}

/**
 * Default transform state for new clips.
 */
export const DEFAULT_TRANSFORM: TransformState = {
    aspectRatio: 'original',
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    speed: 1,
    volume: 100,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
}

/**
 * Aspect ratio presets with their target dimensions.
 */
export const ASPECT_RATIO_DIMENSIONS: Record<Exclude<AspectRatioPreset, 'original'>, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
}

/**
 * Video clip data structure.
 */
export interface Clip {
    id: string
    file: File
    name: string
    duration: number
    thumbnailUrl: string | null
    trimStart: number
    trimEnd: number
    splitPoints: number[]  // Timestamps where to split (sorted)
    transform: TransformState  // Transform settings
}
