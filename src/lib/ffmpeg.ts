import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

/**
 * Get or initialize the FFmpeg instance
 */
export async function getFFmpeg(
    onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
    if (ffmpeg?.loaded) {
        return ffmpeg
    }

    if (loadPromise) {
        return loadPromise
    }

    loadPromise = (async () => {
        ffmpeg = new FFmpeg()

        ffmpeg.on('log', ({ message }) => {
            console.log('[FFmpeg]', message)
        })

        ffmpeg.on('progress', ({ progress, time }) => {
            const percent = Math.round(progress * 100)
            onProgress?.(percent, `Processing: ${percent}% (${Math.round(time / 1000000)}s)`)
        })

        onProgress?.(5, 'Downloading FFmpeg core...')

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })

        onProgress?.(15, 'FFmpeg ready')
        return ffmpeg
    })()

    return loadPromise
}

/**
 * Trim a video file
 */
export async function trimVideo(
    file: File,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ff = await getFFmpeg(onProgress)

    const inputName = 'input' + getExtension(file.name)
    const outputName = 'output.mp4'

    onProgress?.(20, 'Loading video file...')
    await ff.writeFile(inputName, await fetchFile(file))

    onProgress?.(30, 'Trimming video...')

    await ff.exec([
        '-i', inputName,
        '-ss', startTime.toFixed(3),
        '-to', endTime.toFixed(3),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName
    ])

    onProgress?.(90, 'Finalizing...')
    const data = await ff.readFile(outputName)

    // Cleanup
    await ff.deleteFile(inputName)
    await ff.deleteFile(outputName)

    onProgress?.(100, 'Complete!')
    return new Blob([data as BlobPart], { type: 'video/mp4' })
}

/**
 * Merge multiple video files
 */
export async function mergeVideos(
    files: { file: File; trimStart: number; trimEnd: number }[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ff = await getFFmpeg(onProgress)

    const trimmedFiles: string[] = []
    const progressPerFile = 60 / files.length

    // First, trim each file to its specified range
    for (let i = 0; i < files.length; i++) {
        const { file, trimStart, trimEnd } = files[i]
        const inputName = `input_${i}${getExtension(file.name)}`
        const trimmedName = `trimmed_${i}.mp4`

        const baseProgress = 20 + i * progressPerFile
        onProgress?.(baseProgress, `Processing clip ${i + 1}/${files.length}...`)

        await ff.writeFile(inputName, await fetchFile(file))

        await ff.exec([
            '-i', inputName,
            '-ss', trimStart.toFixed(3),
            '-to', trimEnd.toFixed(3),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-preset', 'ultrafast',
            trimmedName
        ])

        trimmedFiles.push(trimmedName)
        await ff.deleteFile(inputName)
    }

    // Create concat file
    onProgress?.(80, 'Merging clips...')
    const concatContent = trimmedFiles.map(f => `file '${f}'`).join('\n')
    await ff.writeFile('concat.txt', concatContent)

    // Merge
    const outputName = 'merged.mp4'
    await ff.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        outputName
    ])

    onProgress?.(95, 'Finalizing...')
    const data = await ff.readFile(outputName)

    // Cleanup
    for (const f of trimmedFiles) {
        await ff.deleteFile(f)
    }
    await ff.deleteFile('concat.txt')
    await ff.deleteFile(outputName)

    onProgress?.(100, 'Complete!')
    return new Blob([data as BlobPart], { type: 'video/mp4' })
}

/**
 * Split a video at multiple points into separate clips
 * Returns array of Blobs, one for each segment
 */
export async function splitVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    splitPoints: number[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob[]> {
    const ff = await getFFmpeg(onProgress)

    const inputName = 'input' + getExtension(file.name)

    onProgress?.(20, 'Loading video file...')
    await ff.writeFile(inputName, await fetchFile(file))

    // Filter splitPoints to only those within trim range and sort them
    const validSplitPoints = splitPoints
        .filter(t => t > trimStart && t < trimEnd)
        .sort((a, b) => a - b)

    // Build segments: [trimStart, ...validSplitPoints, trimEnd]
    const points = [trimStart, ...validSplitPoints, trimEnd]
    const segments: { start: number; end: number }[] = []

    for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1] })
    }

    const blobs: Blob[] = []
    const progressPerSegment = 70 / segments.length

    for (let i = 0; i < segments.length; i++) {
        const { start, end } = segments[i]
        const outputName = `segment_${i}.mp4`

        const baseProgress = 25 + i * progressPerSegment
        onProgress?.(baseProgress, `Splitting segment ${i + 1}/${segments.length}...`)

        await ff.exec([
            '-i', inputName,
            '-ss', start.toFixed(3),
            '-to', end.toFixed(3),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            outputName
        ])

        const data = await ff.readFile(outputName)
        blobs.push(new Blob([data as BlobPart], { type: 'video/mp4' }))
        await ff.deleteFile(outputName)
    }

    // Cleanup input
    await ff.deleteFile(inputName)

    onProgress?.(100, 'Complete!')
    return blobs
}

function getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
        return '.' + ext
    }
    return '.mp4'
}

