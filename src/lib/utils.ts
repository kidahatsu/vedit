/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00'
    }

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Format seconds to FFmpeg time format (HH:MM:SS.mmm)
 */
export function formatFFmpegTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00:00.000'
    }

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`
}

/**
 * Parse time string to seconds
 */
export function parseTime(timeStr: string): number {
    const parts = timeStr.split(':').map(Number)

    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }

    return 0
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}
