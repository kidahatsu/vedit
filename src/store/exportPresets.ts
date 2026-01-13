/**
 * @fileoverview Export preset definitions for platform-specific exports.
 * Provides one-click export settings for TikTok, Instagram, YouTube, etc.
 */

import type { AspectRatioPreset } from './editorStore'

/**
 * Export preset configuration for a specific platform.
 */
export interface ExportPreset {
    /** Unique identifier */
    id: string
    /** Display name */
    name: string
    /** Lucide icon name */
    icon: 'smartphone' | 'monitor' | 'square' | 'settings'
    /** Target resolution */
    resolution: { width: number; height: number }
    /** Aspect ratio preset to apply */
    aspectRatio: AspectRatioPreset
    /** Maximum duration in seconds (null = unlimited) */
    maxDuration: number | null
    /** FFmpeg CRF quality (18-28, lower = better) */
    crf: number
    /** Platform color for UI */
    color: string
}

/**
 * Built-in export presets for popular platforms.
 */
export const EXPORT_PRESETS: ExportPreset[] = [
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: 'smartphone',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        maxDuration: 10 * 60, // 10 minutes
        crf: 23,
        color: '#00f2ea',
    },
    {
        id: 'reels',
        name: 'Instagram Reels',
        icon: 'smartphone',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        maxDuration: 90, // 90 seconds
        crf: 23,
        color: '#e1306c',
    },
    {
        id: 'instagram-feed',
        name: 'Instagram Feed',
        icon: 'square',
        resolution: { width: 1080, height: 1080 },
        aspectRatio: '1:1',
        maxDuration: 60, // 60 seconds
        crf: 23,
        color: '#c13584',
    },
    {
        id: 'youtube',
        name: 'YouTube',
        icon: 'monitor',
        resolution: { width: 1920, height: 1080 },
        aspectRatio: '16:9',
        maxDuration: null, // Unlimited
        crf: 20, // Higher quality for YT
        color: '#ff0000',
    },
    {
        id: 'youtube-shorts',
        name: 'YouTube Shorts',
        icon: 'smartphone',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        maxDuration: 60, // 60 seconds
        crf: 20,
        color: '#ff0000',
    },
    {
        id: 'twitter',
        name: 'Twitter/X',
        icon: 'monitor',
        resolution: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        maxDuration: 140, // 2 min 20 sec
        crf: 25, // Lower bitrate
        color: '#1da1f2',
    },
    {
        id: 'custom',
        name: 'Original',
        icon: 'settings',
        resolution: { width: 0, height: 0 }, // Keep original
        aspectRatio: 'original',
        maxDuration: null,
        crf: 23,
        color: '#888888',
    },
]

/**
 * Get a preset by ID.
 */
export function getPresetById(id: string): ExportPreset | undefined {
    return EXPORT_PRESETS.find((p) => p.id === id)
}

/**
 * Format duration in human-readable format.
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

/**
 * Check if a video duration exceeds the preset's limit.
 */
export function exceedsMaxDuration(
    preset: ExportPreset,
    videoDuration: number
): boolean {
    if (preset.maxDuration === null) return false
    return videoDuration > preset.maxDuration
}

/**
 * Get a warning message if video exceeds preset duration.
 */
export function getDurationWarning(
    preset: ExportPreset,
    videoDuration: number
): string | null {
    if (!exceedsMaxDuration(preset, videoDuration)) return null
    return `Video is ${formatDuration(Math.round(videoDuration))}, max for ${preset.name} is ${formatDuration(preset.maxDuration!)}`
}
