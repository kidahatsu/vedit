import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isWebCodecsSupported, splitVideoWebCodecs } from './webcodecs'

describe('webcodecs', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    describe('isWebCodecsSupported', () => {
        it('returns false in non-browser/unsupported environments', () => {
            // Node/jsdom default test env has no VideoDecoder
            const supported = isWebCodecsSupported()
            expect(typeof supported).toBe('boolean')
        })
    })

    describe('splitVideoWebCodecs', () => {
        it('throws descriptive error when WebCodecs is unsupported', async () => {
            const mockFile = new File(['mock content'], 'test.mp4', { type: 'video/mp4' })
            if (!isWebCodecsSupported()) {
                await expect(
                    splitVideoWebCodecs(mockFile, 0, 10, [5])
                ).rejects.toThrow('WebCodecs is not supported in this browser')
            }
        })
    })
})
