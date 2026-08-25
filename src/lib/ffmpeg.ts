import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { type AspectRatioPreset, ASPECT_RATIO_DIMENSIONS } from '../store/editorStore'
import { getEncodingArgs, getFileExtension, FFMPEG_CONFIG } from './ffmpeg/config'
import { splitVideoWebCodecs, isWebCodecsSupported } from './webcodecs'
import { debug, warn } from './logger'

// Re-export for UI components
export { isWebCodecsSupported }

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
    /** Target output width for resolution scaling (from export preset) */
    targetWidth?: number
    /** Target output height for resolution scaling (from export preset) */
    targetHeight?: number

    // Audio options
    volume?: number
    muted?: boolean
    fadeIn?: number
    fadeOut?: number

    // Color Grading options
    brightness?: number
    contrast?: number
    saturation?: number
}

let ffmpeg: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

/**
 * Cleanly terminate and reset the module-level FFmpeg instance
 */
export function resetFFmpegInstance(): void {
    if (ffmpeg) {
        try {
            ffmpeg.terminate()
        } catch {
            // ignore termination errors
        }
    }
    ffmpeg = null
    loadPromise = null
}

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
        try {
            const instance = new FFmpeg()

            instance.on('log', ({ message }) => {
                debug('FFmpeg', message)
            })

            instance.on('progress', ({ progress, time }) => {
                const percent = Math.round(progress * 100)
                onProgress?.(percent, `Processing: ${percent}% (${Math.round(time / 1000000)}s)`)
            })

            onProgress?.(5, 'Downloading FFmpeg core...')

            const { cdnBaseUrl, coreFile, wasmFile } = FFMPEG_CONFIG

            await instance.load({
                coreURL: await toBlobURL(`${cdnBaseUrl}/${coreFile}`, 'text/javascript'),
                wasmURL: await toBlobURL(`${cdnBaseUrl}/${wasmFile}`, 'application/wasm'),
            })

            onProgress?.(15, 'FFmpeg ready')
            ffmpeg = instance
            return instance
        } catch (err) {
            resetFFmpegInstance()
            throw err
        }
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

    try {
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

        onProgress?.(100, 'Complete!')
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } finally {
        await ff.deleteFile(inputName).catch(() => { })
        await ff.deleteFile(outputName).catch(() => { })
    }
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
    const inputFiles: string[] = []
    const progressPerFile = 60 / files.length
    const outputName = 'merged.mp4'

    try {
        // First, trim each file to its specified range
        for (let i = 0; i < files.length; i++) {
            const { file, trimStart, trimEnd } = files[i]
            const inputName = `input_${i}${getFileExtension(file.name)}`
            const trimmedName = `trimmed_${i}.mp4`
            inputFiles.push(inputName)

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
            await ff.deleteFile(inputName).catch(() => { })
        }

        // Create concat file
        onProgress?.(80, 'Merging clips...')
        const concatContent = trimmedFiles.map(f => `file '${f}'`).join('\n')
        await ff.writeFile('concat.txt', concatContent)

        // Merge
        await ff.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat.txt',
            '-c', 'copy',
            outputName
        ])

        onProgress?.(95, 'Finalizing...')
        const data = await ff.readFile(outputName)

        onProgress?.(100, 'Complete!')
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } finally {
        for (const f of inputFiles) {
            await ff.deleteFile(f).catch(() => { })
        }
        for (const f of trimmedFiles) {
            await ff.deleteFile(f).catch(() => { })
        }
        await ff.deleteFile('concat.txt').catch(() => { })
        await ff.deleteFile(outputName).catch(() => { })
    }
}

/**
 * Split a video at multiple points into separate clips
 * Uses WebCodecs for frame-accurate splitting when available,
 * falls back to FFmpeg for broader browser support.
 * Returns array of Blobs, one for each segment
 */
export async function splitVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    splitPoints: number[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob[]> {
    // Use WebCodecs for frame-accurate splitting if available
    if (isWebCodecsSupported()) {
        try {
            debug('splitVideo', 'Using WebCodecs for frame-accurate splitting')
            return await splitVideoWebCodecs(file, trimStart, trimEnd, splitPoints, onProgress)
        } catch (error) {
            // WebCodecs failed - fall back to FFmpeg
            warn('splitVideo', 'WebCodecs failed, falling back to FFmpeg:', error)
            onProgress?.(5, 'WebCodecs failed, using FFmpeg fallback...')
        }
    }

    // Fallback to FFmpeg (less accurate but broader browser/codec support)
    debug('splitVideo', 'Using FFmpeg for splitting')
    return splitVideoFFmpeg(file, trimStart, trimEnd, splitPoints, onProgress)
}

/**
 * FFmpeg-based video splitting (fallback for browsers without WebCodecs)
 */
async function splitVideoFFmpeg(
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
export function buildFilterChain(options: TransformOptions): string[] {
    const filters: string[] = []
    const {
        crop,
        rotation,
        flipH,
        flipV,
        aspectRatio,
        targetWidth,
        targetHeight,
        speed,
        sourceWidth,
        sourceHeight
    } = options

    // 1. Crop (MUST be applied first in original source coordinate space before rotation/transpose changes dimensions)
    if (crop && (crop.x !== 0 || crop.y !== 0 || crop.width !== 1 || crop.height !== 1)) {
        if (sourceWidth && sourceHeight) {
            const cropW = Math.max(2, Math.floor((crop.width * sourceWidth) / 2) * 2)
            const cropH = Math.max(2, Math.floor((crop.height * sourceHeight) / 2) * 2)
            const cropX = Math.floor((crop.x * sourceWidth) / 2) * 2
            const cropY = Math.floor((crop.y * sourceHeight) / 2) * 2
            filters.push(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
        } else {
            // Use expressions with input dimensions rounded to even integers
            filters.push(`crop=trunc(iw*${crop.width}/2)*2:trunc(ih*${crop.height}/2)*2:trunc(iw*${crop.x}/2)*2:trunc(ih*${crop.y}/2)*2`)
        }
    }

    // 2. Speed (video only - audio handled separately)
    if (speed && speed !== 1) {
        const ptsFactor = 1 / speed
        filters.push(`setpts=${ptsFactor.toFixed(4)}*PTS`)
    }

    // 3. Rotation (transpose filter)
    if (rotation === 90) {
        filters.push('transpose=1')
    } else if (rotation === 180) {
        filters.push('transpose=1,transpose=1')
    } else if (rotation === 270) {
        filters.push('transpose=2')
    }

    // 4. Flip
    if (flipH) {
        filters.push('hflip')
    }
    if (flipV) {
        filters.push('vflip')
    }

    // 5. Target resolution scaling (from export preset) OR aspect ratio with letterbox/pillarbox
    if (targetWidth && targetHeight) {
        filters.push(
            `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
            `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`
        )
    } else if (aspectRatio && aspectRatio !== 'original' && aspectRatio in ASPECT_RATIO_DIMENSIONS) {
        const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio as keyof typeof ASPECT_RATIO_DIMENSIONS]
        filters.push(
            `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease`,
            `pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2:black`
        )
    }

    // 6. Color Grading (Brightness, Contrast, Saturation) via eq filter
    const { brightness = 0, contrast = 1, saturation = 1 } = options
    if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
        filters.push(`eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`)
    }

    return filters
}

/**
 * Build audio filter chain for speed, volume, mute, and fades
 */
export function buildAudioFilterChain(transform: TransformOptions, duration: number): string[] {
    const filters: string[] = []
    const { speed, volume, muted, fadeIn, fadeOut } = transform

    // 1. Mute (if muted, we can just use volume=0)
    if (muted) {
        filters.push('volume=0')
        return filters // No need for other filters if muted
    }

    // 2. Volume (0-100 -> 0-1 multiplier) - 100 is default (1.0)
    if (volume !== undefined && volume !== 100) {
        const vol = Math.max(0, volume) / 100
        filters.push(`volume=${vol}`)
    }

    // 3. Speed (atempo)
    if (speed && speed !== 1) {
        filters.push(`atempo=${speed}`)
    }

    // 4. Fade In & Fade Out (bounded so sum <= duration)
    const effectiveFadeIn = fadeIn && fadeIn > 0 ? Math.min(fadeIn, duration) : 0
    const effectiveFadeOut = fadeOut && fadeOut > 0 ? Math.min(fadeOut, duration - effectiveFadeIn) : 0

    if (effectiveFadeIn > 0) {
        filters.push(`afade=t=in:st=0:d=${effectiveFadeIn}`)
    }

    if (effectiveFadeOut > 0) {
        const startTime = Math.max(0, duration - effectiveFadeOut)
        filters.push(`afade=t=out:st=${startTime.toFixed(3)}:d=${effectiveFadeOut}`)
    }

    return filters
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

    try {
        onProgress?.(20, 'Loading video file...')
        await ff.writeFile(inputName, await fetchFile(file))

        onProgress?.(30, 'Applying transforms...')

        // Calculate duration for audio fades (adjusting for speed)
        let duration = trimEnd - trimStart
        if (transform.speed && transform.speed !== 1) {
            duration = duration / transform.speed
        }

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

        // Add audio filter chain
        const audioFilters = buildAudioFilterChain(transform, duration)
        if (audioFilters.length > 0) {
            args.push('-af', audioFilters.join(','))
        }

        // Output settings
        args.push(
            ...getEncodingArgs(),
            outputName
        )

        await ff.exec(args)

        onProgress?.(90, 'Finalizing...')
        const data = await ff.readFile(outputName)

        onProgress?.(100, 'Complete!')
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } finally {
        await ff.deleteFile(inputName).catch(() => { })
        await ff.deleteFile(outputName).catch(() => { })
    }
}

/**
 * Reverse a video clip (plays backwards)
 * Note: video reversal is memory intensive as it buffers frames.
 */
export async function reverseVideo(
    file: File,
    trimStart: number,
    trimEnd: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ff = await getFFmpeg(onProgress)

    const inputName = 'input' + getFileExtension(file.name)
    const outputName = 'output.mp4'

    try {
        onProgress?.(20, 'Loading video file...')
        await ff.writeFile(inputName, await fetchFile(file))

        onProgress?.(30, 'Reversing video...')

        try {
            await ff.exec([
                '-i', inputName,
                '-ss', trimStart.toFixed(3),
                '-to', trimEnd.toFixed(3),
                '-vf', 'reverse',
                '-af', 'areverse',
                ...getEncodingArgs(),
                outputName
            ])
        } catch (e) {
            warn('FFmpeg', 'Reverse with audio failed, retrying video only:', e)
            await ff.deleteFile(outputName).catch(() => { })

            await ff.exec([
                '-i', inputName,
                '-ss', trimStart.toFixed(3),
                '-to', trimEnd.toFixed(3),
                '-vf', 'reverse',
                ...getEncodingArgs(),
                outputName
            ])
        }

        onProgress?.(90, 'Finalizing...')
        const data = await ff.readFile(outputName)

        onProgress?.(100, 'Complete!')
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } catch (err) {
        // If operation failed catastrophically, reset FFmpeg instance to prevent deadlock
        resetFFmpegInstance()
        throw err
    } finally {
        if (ffmpeg) {
            await ffmpeg.deleteFile(inputName).catch(() => { })
            await ffmpeg.deleteFile(outputName).catch(() => { })
        }
    }
}

export async function extractFrame(
    file: File,
    time: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ffmpegInstance = await getFFmpeg(onProgress)
    const inputName = 'input' + getFileExtension(file.name)
    const outputName = 'frame.webp'

    debug('FFmpeg', `Extracting frame at ${time.toFixed(3)}s as WebP (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    try {
        await ffmpegInstance.writeFile(inputName, await fetchFile(file))

        try {
            await ffmpegInstance.exec([
                '-ss', time.toFixed(3),
                '-i', inputName,
                '-frames:v', '1',
                '-c:v', 'libwebp',
                '-lossless', '0',
                '-q:v', '75',
                '-f', 'webp',
                '-update', '1',
                '-y',
                outputName
            ])
        } catch (execError: unknown) {
            const stats = await ffmpegInstance.listDir('/')
            const exists = stats.some(f => f.name === outputName)
            if (exists) {
                warn('FFmpeg', 'Ignored Aborted() exit - output file found.')
            } else {
                throw execError
            }
        }

        const data = await ffmpegInstance.readFile(outputName)
        return new Blob([data as Uint8Array], { type: 'image/webp' })
    } finally {
        await ffmpegInstance.deleteFile(inputName).catch(() => { })
        await ffmpegInstance.deleteFile(outputName).catch(() => { })
    }
}

export async function extractAudio(
    file: File,
    start: number,
    end: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ffmpegInstance = await getFFmpeg(onProgress)
    const { getFileExtension: getExt } = await import('./ffmpeg/config')
    const inputName = 'input' + getExt(file.name)
    const outputName = 'audio.mp3'

    try {
        await ffmpegInstance.writeFile(inputName, await fetchFile(file))

        try {
            await ffmpegInstance.exec([
                '-i', inputName,
                '-ss', start.toFixed(3),
                '-to', end.toFixed(3),
                '-q:a', '0',
                '-map', 'a',
                outputName
            ])

            const data = await ffmpegInstance.readFile(outputName)
            return new Blob([data as Uint8Array], { type: 'audio/mpeg' })
        } catch {
            throw new Error('No audio track found in video or audio stream could not be extracted.')
        }
    } finally {
        await ffmpegInstance.deleteFile(inputName).catch(() => { })
        await ffmpegInstance.deleteFile(outputName).catch(() => { })
    }
}

export async function removeAudio(
    file: File,
    start: number,
    end: number,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ffmpegInstance = await getFFmpeg(onProgress)
    const { getFileExtension: getExt } = await import('./ffmpeg/config')
    const inputName = 'input' + getExt(file.name)
    const outputName = 'video_no_audio.mp4'

    try {
        await ffmpegInstance.writeFile(inputName, await fetchFile(file))

        await ffmpegInstance.exec([
            '-i', inputName,
            '-ss', start.toFixed(3),
            '-to', end.toFixed(3),
            '-c:v', 'copy',
            '-an',
            outputName
        ])

        const data = await ffmpegInstance.readFile(outputName)
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } finally {
        await ffmpegInstance.deleteFile(inputName).catch(() => { })
        await ffmpegInstance.deleteFile(outputName).catch(() => { })
    }
}

export async function probeVideo(
    file: File,
    onProgress?: (progress: number, message: string) => void
): Promise<{ codec_name?: string; width?: number; height?: number }> {
    const ffmpegInstance = await getFFmpeg(onProgress)
    const { getFileExtension: getExt } = await import('./ffmpeg/config')
    const inputName = 'probe_input' + getExt(file.name)

    let output = ''
    const logHandler = ({ message }: { message: string }) => {
        output += message + '\n'
    }

    try {
        await ffmpegInstance.writeFile(inputName, await fetchFile(file))
        ffmpegInstance.on('log', logHandler)

        // FFmpeg without output file exits with code 1 after logging stream details
        await ffmpegInstance.exec(['-i', inputName]).catch(() => { })

        const videoStreamMatch = output.match(/Stream #\d:\d.*Video: ([^, ]+).* (\d+)x(\d+)/)
        if (videoStreamMatch) {
            return {
                codec_name: videoStreamMatch[1].toLowerCase(),
                width: parseInt(videoStreamMatch[2], 10),
                height: parseInt(videoStreamMatch[3], 10)
            }
        }
        return {}
    } finally {
        ffmpegInstance.off('log', logHandler)
        await ffmpegInstance.deleteFile(inputName).catch(() => { })
    }
}

export async function transcodeToH264(
    file: File,
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const ffmpeg = await getFFmpeg(onProgress)
    const { getFileExtension } = await import('./ffmpeg/config')
    const inputName = 'transcode_input' + getFileExtension(file.name)
    const outputName = 'transcoded.mp4'

    try {
        await ffmpeg.writeFile(inputName, await fetchFile(file))

        await ffmpeg.exec([
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'ultrafast', // Speed over quality for interactive fixes
            '-crf', '23',
            '-c:a', 'aac',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            outputName
        ])

        const data = await ffmpeg.readFile(outputName)
        return new Blob([data as Uint8Array], { type: 'video/mp4' })
    } finally {
        await ffmpeg.deleteFile(inputName).catch(() => { })
        await ffmpeg.deleteFile(outputName).catch(() => { })
    }
}
