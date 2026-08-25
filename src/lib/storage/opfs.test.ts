import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isOPFSSupported, saveClipToOPFS, readClipFromOPFS, deleteClipFromOPFS, clearAllOPFS } from './opfs'

describe('OPFS storage driver', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('detects OPFS support in environment', async () => {
        const supported = await isOPFSSupported()
        expect(typeof supported).toBe('boolean')
    })

    it('handles save and read gracefully when OPFS is unavailable', async () => {
        const mockBlob = new Blob(['mock video data'], { type: 'video/mp4' })
        const saved = await saveClipToOPFS('test-clip-1', mockBlob)
        expect(typeof saved).toBe('boolean')

        const read = await readClipFromOPFS('test-clip-1', 'test.mp4', 'video/mp4')
        expect(read === null || read instanceof File).toBe(true)
    })

    it('handles delete and clear without throwing', async () => {
        await expect(deleteClipFromOPFS('test-clip-1')).resolves.not.toThrow()
        await expect(clearAllOPFS()).resolves.not.toThrow()
    })
})
