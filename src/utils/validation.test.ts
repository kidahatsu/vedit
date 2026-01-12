import { describe, it, expect } from 'vitest'
import { validateVideoFile, sanitizeFilename, isVideoFile, MAX_FILE_SIZE_BYTES } from './validation'

// Helper to create mock File objects with content
function createMockFile(name: string, type: string): File {
    // Use a non-empty array to ensure file.size > 0
    const content = new Uint8Array([0x00, 0x00, 0x00]).buffer
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
}

describe('validateVideoFile', () => {
    it('accepts valid MP4 files', () => {
        const file = createMockFile('video.mp4', 'video/mp4')
        expect(validateVideoFile(file)).toEqual({ valid: true })
    })

    it('accepts valid WebM files', () => {
        const file = createMockFile('video.webm', 'video/webm')
        expect(validateVideoFile(file)).toEqual({ valid: true })
    })

    it('accepts valid MOV files', () => {
        const file = createMockFile('video.mov', 'video/quicktime')
        expect(validateVideoFile(file)).toEqual({ valid: true })
    })

    it('rejects unsupported MIME types', () => {
        const file = createMockFile('video.flv', 'video/x-flv')
        const result = validateVideoFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Unsupported format')
    })

    it('rejects mismatched extension and MIME type', () => {
        const file = createMockFile('video.webm', 'video/mp4')
        const result = validateVideoFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain("doesn't match type")
    })

    it('rejects empty files', () => {
        const blob = new Blob([], { type: 'video/mp4' })
        const file = new File([blob], 'empty.mp4', { type: 'video/mp4' })
        const result = validateVideoFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('File is empty.')
    })
})

describe('sanitizeFilename', () => {
    it('removes path traversal attempts', () => {
        expect(sanitizeFilename('../hack.mp4')).toBe('hack.mp4')
        expect(sanitizeFilename('..\\hack.mp4')).toBe('hack.mp4')
        expect(sanitizeFilename('foo/bar/baz.mp4')).toBe('baz.mp4')
    })

    it('replaces dangerous characters', () => {
        expect(sanitizeFilename('my<video>.mp4')).toBe('my_video_.mp4')
        expect(sanitizeFilename('test:file.mp4')).toBe('test_file.mp4')
        expect(sanitizeFilename('file"name.mp4')).toBe('file_name.mp4')
    })

    it('removes leading dots', () => {
        expect(sanitizeFilename('.hidden.mp4')).toBe('hidden.mp4')
        // The ..{2,} regex converts '....' to '_', result: '_dots.mp4', then leading dots removed
        // Since there's no leading dot after underscore, result keeps the underscore
        expect(sanitizeFilename('_.dots.mp4')).toBe('_.dots.mp4')
    })

    it('truncates long filenames', () => {
        const longName = 'a'.repeat(200) + '.mp4'
        const result = sanitizeFilename(longName, 100)
        expect(result.length).toBeLessThanOrEqual(100)
        expect(result.endsWith('.mp4')).toBe(true)
    })

    it('returns default for empty result', () => {
        expect(sanitizeFilename('...')).toBe('video')
        expect(sanitizeFilename('')).toBe('video')
    })
})

describe('isVideoFile', () => {
    it('returns true for video MIME types', () => {
        expect(isVideoFile(createMockFile('v.mp4', 'video/mp4'))).toBe(true)
        expect(isVideoFile(createMockFile('v.webm', 'video/webm'))).toBe(true)
    })

    it('returns false for non-video MIME types', () => {
        expect(isVideoFile(createMockFile('i.png', 'image/png'))).toBe(false)
        expect(isVideoFile(createMockFile('d.pdf', 'application/pdf'))).toBe(false)
    })
})

describe('MAX_FILE_SIZE_BYTES', () => {
    it('is 2GB', () => {
        expect(MAX_FILE_SIZE_BYTES).toBe(2 * 1024 * 1024 * 1024)
    })
})
