/**
 * @fileoverview File validation utilities for secure video processing.
 * Provides MIME type verification, extension matching, size limits, and filename sanitization.
 */

/** Supported video formats with their valid extensions and size limits */
const SUPPORTED_FORMATS: Record<string, { extensions: string[]; maxSizeBytes: number }> = {
    'video/mp4': { extensions: ['.mp4'], maxSizeBytes: 2 * 1024 * 1024 * 1024 },
    'video/webm': { extensions: ['.webm'], maxSizeBytes: 2 * 1024 * 1024 * 1024 },
    'video/quicktime': { extensions: ['.mov'], maxSizeBytes: 2 * 1024 * 1024 * 1024 },
    'video/x-msvideo': { extensions: ['.avi'], maxSizeBytes: 2 * 1024 * 1024 * 1024 },
    'video/x-matroska': { extensions: ['.mkv'], maxSizeBytes: 2 * 1024 * 1024 * 1024 },
} as const

/** Maximum file size in bytes (2GB) */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024

/** Result of file validation */
export interface ValidationResult {
    /** Whether the file passed validation */
    valid: boolean
    /** Error message if validation failed */
    error?: string
}

/**
 * Validates a video file for processing.
 * Performs comprehensive checks including MIME type, file extension cross-verification,
 * and file size limits.
 *
 * @param file - The File object to validate
 * @returns ValidationResult indicating success or failure with error message
 *
 * @example
 * ```ts
 * const result = validateVideoFile(file)
 * if (!result.valid) {
 *     console.error(result.error)
 *     return
 * }
 * ```
 */
export function validateVideoFile(file: File): ValidationResult {
    // Check if MIME type is supported
    const format = SUPPORTED_FORMATS[file.type]
    if (!format) {
        const supportedTypes = Object.keys(SUPPORTED_FORMATS)
            .map(t => t.replace('video/', ''))
            .join(', ')
        return {
            valid: false,
            error: `Unsupported format: ${file.type || 'unknown'}. Supported: ${supportedTypes}.`,
        }
    }

    // Cross-verify file extension matches MIME type
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!format.extensions.includes(fileExtension)) {
        return {
            valid: false,
            error: `File extension "${fileExtension}" doesn't match type "${file.type}".`,
        }
    }

    // Check file size
    if (file.size > format.maxSizeBytes) {
        const maxMB = Math.round(format.maxSizeBytes / (1024 * 1024))
        const fileMB = Math.round(file.size / (1024 * 1024))
        return {
            valid: false,
            error: `File too large (${fileMB}MB). Maximum size is ${maxMB}MB.`,
        }
    }

    // Check for empty file
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty.',
        }
    }

    return { valid: true }
}

/**
 * Sanitizes a filename for safe download.
 * Removes path traversal attempts, special characters, and limits length.
 *
 * @param filename - The original filename to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized filename safe for filesystem use
 *
 * @example
 * ```ts
 * sanitizeFilename('../hack.mp4')      // 'hack.mp4'
 * sanitizeFilename('my<video>.mp4')    // 'my_video_.mp4'
 * sanitizeFilename('very long name...') // truncated to maxLength
 * ```
 */
export function sanitizeFilename(filename: string, maxLength: number = 100): string {
    // Remove path components (security: prevent path traversal)
    const basename = filename.split(/[/\\]/).pop() ?? filename

    // Replace dangerous/invalid characters with underscores
    const sanitized = basename
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Invalid filesystem chars
        .replace(/\.{2,}/g, '_') // Prevent .. traversal
        .replace(/^\.+/, '') // Remove leading dots (hidden files)
        .trim()

    // Ensure we have something left
    if (!sanitized || sanitized === '_') {
        return 'video'
    }

    // Truncate to max length, preserving extension if possible
    if (sanitized.length > maxLength) {
        const ext = sanitized.split('.').pop() ?? ''
        const nameWithoutExt = sanitized.slice(0, sanitized.lastIndexOf('.'))
        const maxNameLength = maxLength - ext.length - 1
        return nameWithoutExt.slice(0, maxNameLength) + '.' + ext
    }

    return sanitized
}

/**
 * Checks if a file appears to be a video based on MIME type.
 * Quick check without full validation.
 *
 * @param file - The File object to check
 * @returns True if the file has a video MIME type
 */
export function isVideoFile(file: File): boolean {
    return file.type.startsWith('video/')
}
