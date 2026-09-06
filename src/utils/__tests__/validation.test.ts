import { describe, it, expect } from 'vitest'
import { createClipFromFile } from '../clipCreation'
import { validateVideoMagicBytes } from '../validation'

describe('createClipFromFile security validation', () => {
    it('verifies that renamed malicious files (e.g. an HTML/JS file renamed to .mp4) are rejected by createClipFromFile', async () => {
        const maliciousPayload = '<!DOCTYPE html><html><head><script>alert("malicious payload")</script></head><body>evil</body></html>'
        const fakeMp4File = new File([maliciousPayload], 'exploit.mp4', { type: 'video/mp4' })

        // Direct magic byte check should fail
        const magicValid = await validateVideoMagicBytes(fakeMp4File)
        expect(magicValid).toBe(false)

        // createClipFromFile must reject the file with a clear user-facing error message
        await expect(createClipFromFile(fakeMp4File)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
    })

    it('rejects JavaScript payload disguised as .webm or .mov', async () => {
        const jsPayload = 'console.log("malicious code execution attempt"); window.location="http://evil.com";'
        const fakeWebm = new File([jsPayload], 'payload.webm', { type: 'video/webm' })
        const fakeMov = new File([jsPayload], 'payload.mov', { type: 'video/quicktime' })

        await expect(createClipFromFile(fakeWebm)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
        await expect(createClipFromFile(fakeMov)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
    })

    it('rejects audio WAV file disguised as video (.avi or .mp4)', async () => {
        const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45])
        const fakeAvi = new File([wavBytes], 'audio.avi', { type: 'video/x-msvideo' })
        const fakeMp4 = new File([wavBytes], 'audio.mp4', { type: 'video/mp4' })

        await expect(createClipFromFile(fakeAvi)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
        await expect(createClipFromFile(fakeMp4)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
    })

    it('rejects ZIP archive disguised as .mp4', async () => {
        const zipBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00])
        const fakeZip = new File([zipBytes], 'archive.mp4', { type: 'video/mp4' })

        await expect(createClipFromFile(fakeZip)).rejects.toThrow(
            'Invalid video file: Container header does not match a valid video format.'
        )
    })

    it('rejects empty file', async () => {
        const emptyFile = new File([], 'zero.mp4', { type: 'video/mp4' })
        await expect(createClipFromFile(emptyFile)).rejects.toThrow('File is empty.')
    })
})
