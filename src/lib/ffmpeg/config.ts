/**
 * @fileoverview Centralized FFmpeg encoding configuration.
 * Provides encoding presets and utilities for building FFmpeg arguments.
 */

/**
 * Encoding preset configuration.
 * Each preset defines video, audio, and container options.
 */
export interface EncodingPreset {
    /** Video codec and quality arguments */
    video: readonly string[]
    /** Audio codec and bitrate arguments */
    audio: readonly string[]
    /** Container format arguments */
    container: readonly string[]
}

/**
 * Available encoding presets.
 * 
 * - `ultrafast`: Quick encoding, larger file size. Best for editing preview.
 * - `balanced`: Good quality/size ratio. Recommended for final export.
 * - `highQuality`: Best quality, slower encoding. For archival.
 */
export const ENCODING_PRESETS = {
    ultrafast: {
        video: ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23'],
        audio: ['-c:a', 'aac', '-b:a', '128k'],
        container: ['-movflags', '+faststart'],
    },
    balanced: {
        video: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20'],
        audio: ['-c:a', 'aac', '-b:a', '192k'],
        container: ['-movflags', '+faststart'],
    },
    highQuality: {
        video: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18'],
        audio: ['-c:a', 'aac', '-b:a', '256k'],
        container: ['-movflags', '+faststart'],
    },
} as const satisfies Record<string, EncodingPreset>

/** Available preset names */
export type PresetName = keyof typeof ENCODING_PRESETS

/** Default preset for exports */
export const DEFAULT_PRESET: PresetName = 'ultrafast'

/**
 * Generates FFmpeg output arguments for the given encoding preset.
 *
 * @param preset - Name of the encoding preset to use
 * @returns Array of FFmpeg CLI arguments for output encoding
 *
 * @example
 * ```ts
 * const args = getEncodingArgs('balanced')
 * // ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', ...]
 * await ffmpeg.exec(['-i', 'input.mp4', ...args, 'output.mp4'])
 * ```
 */
export function getEncodingArgs(preset: PresetName = DEFAULT_PRESET): string[] {
    const p = ENCODING_PRESETS[preset]
    return [...p.video, ...p.audio, ...p.container]
}

/**
 * FFmpeg WASM configuration.
 */
export const FFMPEG_CONFIG = {
    /** Base URL for FFmpeg WASM files */
    cdnBaseUrl: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm',
    /** Core JS file name */
    coreFile: 'ffmpeg-core.js',
    /** WASM file name */
    wasmFile: 'ffmpeg-core.wasm',
} as const

/**
 * Supported video extensions for file identification.
 */
export const SUPPORTED_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'] as const

/**
 * Gets the file extension from a filename.
 * Returns .mp4 as default if extension is unknown.
 *
 * @param filename - The filename to extract extension from
 * @returns Extension with leading dot (e.g., '.mp4')
 */
export function getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
        return '.' + ext
    }
    return '.mp4'
}
