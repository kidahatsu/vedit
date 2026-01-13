import { generateId } from '../lib/utils'
import { type Clip, DEFAULT_TRANSFORM } from '../store/editorStore'
import { validateVideoFile } from './validation'

export async function createClipFromFile(file: File): Promise<Clip | null> {
    const validation = validateVideoFile(file)
    if (!validation.valid) {
        console.warn(`[createClipFromFile] Skipping invalid file: ${validation.error}`)
        return null
    }

    const objectUrl = URL.createObjectURL(file)
    const clip: Clip = {
        id: generateId(),
        file,
        name: file.name,
        duration: 0,
        thumbnailUrl: null,
        trimStart: 0,
        trimEnd: 0,
        splitPoints: [],
        transform: { ...DEFAULT_TRANSFORM }
    }

    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = objectUrl

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            video.pause()
            video.removeAttribute('src')
            video.load()
            URL.revokeObjectURL(objectUrl)
        }

        const timeoutId = setTimeout(() => {
            cleanup()
            reject(new Error('Video metadata loading timeout'))
        }, 10000)

        video.onerror = () => {
            clearTimeout(timeoutId)
            cleanup()
            reject(new Error('Failed to load video metadata'))
        }

        video.onloadedmetadata = () => {
            clip.duration = video.duration
            clip.trimEnd = video.duration
            video.currentTime = Math.min(1, video.duration / 2)
        }

        video.onseeked = () => {
            clearTimeout(timeoutId)
            try {
                const canvas = document.createElement('canvas')
                canvas.width = 160
                canvas.height = 90
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    clip.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
                }
            } catch (e) {
                console.warn('[createClipFromFile] Failed to generate thumbnail:', e)
            }
            cleanup()
            resolve(clip)
        }
    })
}
