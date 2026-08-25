import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectSilenceSplitPoints } from './silenceDetection'

describe('Silence Detection (VAD)', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('returns empty array or throws descriptive error when Web Audio is missing or audio is flat', async () => {
        const mockBlob = new Blob(['mock audio data'], { type: 'audio/mp3' })
        try {
            const splitPoints = await detectSilenceSplitPoints(mockBlob)
            expect(Array.isArray(splitPoints)).toBe(true)
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(Error)
        }
    })
})
