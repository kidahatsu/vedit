
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFrame, extractAudio, removeAudio } from './ffmpeg'

// Mock dependencies
const mockExec = vi.fn()
const mockWriteFile = vi.fn()
const mockReadFile = vi.fn()
const mockDeleteFile = vi.fn().mockResolvedValue(undefined)
const mockLoad = vi.fn()

// Mock FFmpeg class
vi.mock('@ffmpeg/ffmpeg', () => {
    return {
        FFmpeg: class {
            loaded = true
            load = mockLoad
            exec = mockExec
            writeFile = mockWriteFile
            readFile = mockReadFile
            deleteFile = mockDeleteFile
            on = vi.fn()
        }
    }
})

// Mock fetchFile and toBlobURL
vi.mock('@ffmpeg/util', () => ({
    fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    toBlobURL: vi.fn(),
}))

describe('FFmpeg Features', () => {
    const mockFile = new File(['test'], 'test_video.mp4', { type: 'video/mp4' })

    beforeEach(() => {
        vi.clearAllMocks()
        // Default happy path for readFile
        mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3]))
        mockExec.mockResolvedValue(0)
    })

    describe('extractFrame', () => {
        it('should call ffmpeg with correct arguments for frame extraction', async () => {
            await extractFrame(mockFile, 5.5)

            // Verify file loading
            expect(mockWriteFile).toHaveBeenCalledWith('input.mp4', expect.anything())

            // Verify exec call
            expect(mockExec).toHaveBeenCalledWith([
                '-ss', '5.500',
                '-i', 'input.mp4',
                '-frames:v', '1',
                '-c:v', 'libwebp',
                '-lossless', '0',
                '-q:v', '75',
                '-f', 'webp',
                '-update', '1',
                '-y',
                'frame.webp'
            ])

            // Verify cleanup
            expect(mockDeleteFile).toHaveBeenCalledWith('input.mp4')
            expect(mockDeleteFile).toHaveBeenCalledWith('frame.webp')
        })
    })

    describe('extractAudio', () => {
        it('should call ffmpeg with correct arguments for audio extraction', async () => {
            await extractAudio(mockFile, 10, 20)

            // Verify exec call
            expect(mockExec).toHaveBeenCalledWith([
                '-i', 'input.mp4',
                '-ss', '10.000',
                '-to', '20.000',
                '-q:a', '0',
                '-map', 'a',
                'audio.mp3'
            ])
        })
    })

    describe('removeAudio', () => {
        it('should call ffmpeg with correct arguments for removing audio', async () => {
            await removeAudio(mockFile, 0, 15)

            // Verify exec call
            expect(mockExec).toHaveBeenCalledWith([
                '-i', 'input.mp4',
                '-ss', '0.000',
                '-to', '15.000',
                '-c:v', 'copy',
                '-an',
                'video_no_audio.mp4'
            ])
        })
    })
})
