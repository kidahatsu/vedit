import { describe, it, expect } from 'vitest'
import { validateVideoFile, sanitizeFilename, isVideoFile, validateVideoMagicBytes, MAX_FILE_SIZE_BYTES } from './validation'

// Helper to create mock File objects with content
function createMockFile(name: string, type: string): File {
    // Use a non-empty array to ensure file.size > 0
    const content = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70]).buffer
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

describe('validateVideoMagicBytes', () => {
    it('identifies ISO BMFF MP4 header', async () => {
        const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
        const file = new File([bytes], 'test.mp4', { type: 'video/mp4' })
        expect(await validateVideoMagicBytes(file)).toBe(true)
    })

    it('identifies EBML WebM header', async () => {
        const bytes = new Uint8Array([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81])
        const file = new File([bytes], 'test.webm', { type: 'video/webm' })
        expect(await validateVideoMagicBytes(file)).toBe(true)
    })

    it('rejects invalid or empty bytes', async () => {
        const file = new File([new Uint8Array([0x01, 0x02, 0x03])], 'fake.mp4')
        expect(await validateVideoMagicBytes(file)).toBe(false)
    })
})

describe('sanitizeFilename', () => {
    it('removes path traversal attempts', () => {
        expect(sanitizeFilename('../hack.mp4')).toBe('hack.mp4')
        expect(sanitizeFilename('..\\hack.mp4')).toBe('hack.mp4')
        expect(sanitizeFilename('foo/bar/baz.mp4')).toBe('baz.mp4')
    })

    it('replaces dangerous and shell characters', () => {
        expect(sanitizeFilename('my<video>;rm -rf.mp4')).toBe('my_video__rm -rf.mp4')
        expect(sanitizeFilename('test:file$(whoami).mp4')).toBe('test_file__whoami_.mp4')
        expect(sanitizeFilename('file"name`cat`.mp4')).toBe('file_name_cat_.mp4')
    })

    it('prefixes Windows reserved device names', () => {
        expect(sanitizeFilename('CON.mp4')).toBe('vedit_CON.mp4')
        expect(sanitizeFilename('aux.mov')).toBe('vedit_aux.mov')
        expect(sanitizeFilename('NUL')).toBe('vedit_NUL')
    })

    it('removes leading dots', () => {
        expect(sanitizeFilename('.hidden.mp4')).toBe('hidden.mp4')
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
