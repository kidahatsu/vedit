/**
 * @fileoverview File validation utilities for secure video processing.
 * Provides MIME type verification, magic-byte inspection, extension matching, size limits, and filename sanitization.
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
 * Inspect file header magic bytes to verify container authenticity.
 */
export async function validateVideoMagicBytes(file: File | Blob): Promise<boolean> {
    try {
        if (!file || file.size < 8) return false

        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as ArrayBuffer)
            reader.onerror = () => reject(reader.error)
            const slice = file.slice ? file.slice(0, 16) : file
            reader.readAsArrayBuffer(slice)
        })

        const bytes = new Uint8Array(buffer)
        if (bytes.length < 8) return false

        // MP4 / MOV / M4V (ISO Base Media File Format: 'ftyp' at offset 4 or 'moov' / 'wide' / 'mdat')
        const isIsoBmff = (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
                          (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76) ||
                          (bytes[4] === 0x6d && bytes[5] === 0x64 && bytes[6] === 0x61 && bytes[7] === 0x74) ||
                          (bytes[4] === 0x77 && bytes[5] === 0x69 && bytes[6] === 0x64 && bytes[7] === 0x65)
        // WebM / MKV (EBML header: 0x1A 0x45 0xDF 0xA3)
        const isEbml = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3
        // AVI (RIFF....AVI )
        const isAvi = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46

        return isIsoBmff || isEbml || isAvi
    } catch {
        return false
    }
}

/**
 * Validates a video file for processing.
 * Performs comprehensive checks including MIME type, file extension cross-verification,
 * and file size limits.
 */
export function validateVideoFile(file: File): ValidationResult {
    // Check for empty file
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty.',
        }
    }

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

    return { valid: true }
}

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i

/**
 * Sanitizes a filename for safe download.
 * Removes path traversal attempts, shell metacharacters, Bidi overrides, and limits length.
 */
export function sanitizeFilename(filename: string, maxLength: number = 100): string {
    // Remove path components (security: prevent path traversal)
    const basename = filename.split(/[/\\]/).pop() ?? filename

    // Replace dangerous/invalid characters with underscores
    let sanitized = basename
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '') // Control & Bidi
        .replace(/[<>:"/\\|?*$`;&!'(){}[\]^~]/g, '_') // Unsafe FS & shell characters
        .replace(/\.{2,}/g, '_') // Prevent .. traversal
        .replace(/^\.+/, '') // Remove leading dots (hidden files)
        .trim()

    // Prefix Windows reserved device names
    if (WINDOWS_RESERVED_NAMES.test(sanitized)) {
        sanitized = `vedit_${sanitized}`
    }

    // Ensure we have something left
    if (!sanitized || sanitized === '_') {
        return 'video'
    }

    // Truncate to max length, preserving extension if possible
    if (sanitized.length > maxLength) {
        const lastDot = sanitized.lastIndexOf('.')
        if (lastDot === -1 || lastDot === 0) {
            return sanitized.slice(0, maxLength)
        }
        const ext = sanitized.slice(lastDot + 1)
        const nameWithoutExt = sanitized.slice(0, lastDot)
        const maxNameLength = maxLength - ext.length - 1
        if (maxNameLength <= 0) {
            return sanitized.slice(0, maxLength)
        }
        return nameWithoutExt.slice(0, maxNameLength) + '.' + ext
    }

    return sanitized
}

/**
 * Checks if a file appears to be a video based on MIME type.
 */
export function isVideoFile(file: File): boolean {
    return file.type.startsWith('video/')
}
