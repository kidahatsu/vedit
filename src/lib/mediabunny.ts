/**
 * @fileoverview Mediabunny next-gen media processing engine.
 * Unified streaming demuxer, keyframe-accurate trimmer, and muxer using WebCodecs.
 */

import { Input, BlobSource, Output, BufferTarget, Mp4OutputFormat, Conversion, ALL_FORMATS } from 'mediabunny'
import { debug, warn } from './logger'

export interface MediabunnyVideoInfo {
    duration: number
    width: number
    height: number
    videoCodec?: string
    audioCodec?: string
}

/**
 * Fast metadata probing via Mediabunny
 */
export async function probeVideoMediabunny(file: File | Blob): Promise<MediabunnyVideoInfo> {
    const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
    })

    try {
        const videoTrack = await input.getPrimaryVideoTrack()
        const audioTrack = await input.getPrimaryAudioTrack()

        const duration = (await input.computeDuration()) || 0
        let width = 1920
        let height = 1080
        let videoCodec = 'unknown'

        if (videoTrack) {
            width = videoTrack.displayWidth || videoTrack.codedWidth || 1920
            height = videoTrack.displayHeight || videoTrack.codedHeight || 1080
            videoCodec = videoTrack.codec || 'h264'
        }

        const audioCodec = audioTrack?.codec || undefined

        debug('Mediabunny', `Probed ${file.size} bytes: ${width}x${height}, duration=${duration.toFixed(2)}s, codec=${videoCodec}`)

        return {
            duration,
            width,
            height,
            videoCodec,
            audioCodec,
        }
    } finally {
        input.dispose()
    }
}

/**
 * Trim video using Mediabunny streaming conversion
 */
export async function trimVideoMediabunny(
    file: File | Blob,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
    })

    const target = new BufferTarget()
    const output = new Output({
        target,
        format: new Mp4OutputFormat(),
    })

    try {
        onProgress?.(10)

        const conversion = await Conversion.init({
            input,
            output,
            trim: {
                start: startTime,
                end: endTime,
            },
        })

        if (onProgress) {
            conversion.onProgress = (progress: number) => {
                onProgress(Math.round(progress * 100))
            }
        }

        await conversion.execute()
        onProgress?.(100)

        const buffer = target.buffer
        if (!buffer) {
            throw new Error('Mediabunny produced empty output buffer')
        }

        debug('Mediabunny', `Trim complete: output size = ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`)
        return new Blob([buffer], { type: 'video/mp4' })
    } catch (err) {
        warn('Mediabunny', 'Trim error:', err)
        throw err
    } finally {
        input.dispose()
    }
}
