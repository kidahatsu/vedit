import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { type AspectRatioPreset, ASPECT_RATIO_DIMENSIONS } from '../store/editorStore'
import { getEncodingArgs, getFileExtension, FFMPEG_CONFIG } from './ffmpeg/config'

// Transform options for video processing
export interface TransformOptions {
    aspectRatio?: AspectRatioPreset
    crop?: { x: number; y: number; width: number; height: number }  // Normalized 0-1 values
    rotation?: 0 | 90 | 180 | 270
    flipH?: boolean
    flipV?: boolean
    speed?: 0.5 | 0.75 | 1 | 1.5 | 2
    sourceWidth?: number
    sourceHeight?: number
}

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

        const { cdnBaseUrl, coreFile, wasmFile } = FFMPEG_CONFIG

        await ffmpeg.load({
            coreURL: await toBlobURL(`${cdnBaseUrl}/${coreFile}`, 'text/javascript'),
            wasmURL: await toBlobURL(`${cdnBaseUrl}/${wasmFile}`, 'application/wasm'),
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

    const inputName = 'input' + getFileExtension(file.name)
    const outputName = 'output.mp4'

    onProgress?.(20, 'Loading video file...')
    await ff.writeFile(inputName, await fetchFile(file))

    onProgress?.(30, 'Trimming video...')

    await ff.exec([
        '-i', inputName,
        '-ss', startTime.toFixed(3),
        '-to', endTime.toFixed(3),
        ...getEncodingArgs(),
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
        const inputName = `input_${i}${getFileExtension(file.name)}`
        const trimmedName = `trimmed_${i}.mp4`

        const baseProgress = 20 + i * progressPerFile
        onProgress?.(baseProgress, `Processing clip ${i + 1}/${files.length}...`)

        await ff.writeFile(inputName, await fetchFile(file))

        await ff.exec([
            '-i', inputName,
            '-ss', trimStart.toFixed(3),
            '-to', trimEnd.toFixed(3),
            ...getEncodingArgs(),
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

    const inputName = 'input' + getFileExtension(file.name)

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
            ...getEncodingArgs(),
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

// getFileExtension moved to ./ffmpeg/config.ts as getFileExtension

/**
 * Build FFmpeg filter chain from transform options
 * Order: speed -> rotation -> flip -> crop -> scale/pad for aspect ratio
 * Note: Speed is handled via setpts for video, atempo for audio separately
 */
export function buildFilterChain(transform: TransformOptions): string[] {
    const filters: string[] = []

    const { aspectRatio, crop, rotation, flipH, flipV, speed, sourceWidth, sourceHeight } = transform

    // 1. Speed (video only - audio handled separately)
    if (speed && speed !== 1) {
        // setpts=PTS/speed for faster, PTS*factor for slower
        const ptsFactor = 1 / speed
        filters.push(`setpts=${ptsFactor.toFixed(4)}*PTS`)
    }

    // 2. Rotation (transpose filter)
    // transpose=0: 90° CCW + vertical flip
    // transpose=1: 90° CW
    // transpose=2: 90° CCW
    // transpose=3: 90° CW + vertical flip
    if (rotation === 90) {
        filters.push('transpose=1')
    } else if (rotation === 180) {
        filters.push('transpose=1,transpose=1')
    } else if (rotation === 270) {
        filters.push('transpose=2')
    }

    // 3. Flip
    if (flipH) {
        filters.push('hflip')
    }
    if (flipV) {
        filters.push('vflip')
    }

    // 4. Crop (using normalized values)
    if (crop && (crop.x !== 0 || crop.y !== 0 || crop.width !== 1 || crop.height !== 1)) {
        // Need source dimensions to calculate absolute crop values
        // Use 'iw' and 'ih' for input width/height if not provided
        if (sourceWidth && sourceHeight) {
            const cropW = Math.round(crop.width * sourceWidth)
            const cropH = Math.round(crop.height * sourceHeight)
            const cropX = Math.round(crop.x * sourceWidth)
            const cropY = Math.round(crop.y * sourceHeight)
            filters.push(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
        } else {
            // Use expressions with input dimensions
            filters.push(`crop=iw*${crop.width}:ih*${crop.height}:iw*${crop.x}:ih*${crop.y}`)
        }
    }

    // 5. Aspect ratio with letterbox/pillarbox padding
    if (aspectRatio && aspectRatio !== 'original') {
        const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio]
        filters.push(
            `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease`,
            `pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2:black`
        )
    }

    return filters
}

/**
 * Build audio filter for speed changes with pitch correction
 * atempo only supports 0.5-2.0
 */
export function buildAudioSpeedFilter(speed: number): string | null {
    if (!speed || speed === 1) return null
    return `atempo=${speed}`
}

/**
 * Transform a video with aspect ratio, crop, rotation, and flip
 */
export async function transformVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    transform: TransformOptions,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ff = await getFFmpeg(onProgress)

    const inputName = 'input' + getFileExtension(file.name)
    const outputName = 'output.mp4'

    onProgress?.(20, 'Loading video file...')
    await ff.writeFile(inputName, await fetchFile(file))

    onProgress?.(30, 'Applying transforms...')

    // Build the FFmpeg command
    const args = [
        '-i', inputName,
        '-ss', trimStart.toFixed(3),
        '-to', trimEnd.toFixed(3),
    ]

    // Add video filter chain if there are transforms
    const filters = buildFilterChain(transform)
    if (filters.length > 0) {
        args.push('-vf', filters.join(','))
    }

    // Add audio filter for speed changes (atempo for pitch correction)
    const audioFilter = buildAudioSpeedFilter(transform.speed || 1)
    if (audioFilter) {
        args.push('-af', audioFilter)
    }

    // Output settings
    args.push(
        ...getEncodingArgs(),
        outputName
    )

    await ff.exec(args)

    onProgress?.(90, 'Finalizing...')
    const data = await ff.readFile(outputName)

    // Cleanup
    await ff.deleteFile(inputName)
    await ff.deleteFile(outputName)

    onProgress?.(100, 'Complete!')
    return new Blob([data as BlobPart], { type: 'video/mp4' })
}
