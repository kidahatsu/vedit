/**
 * @fileoverview High-Performance WebGPU Hardware-Accelerated Video Exporter.
 * Features strict encodeQueueSize backpressure management and accurate timestamp preservation.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { isWebGPUSupported, WebGPURenderer, type WebGPUTransformParams } from './renderer'
import {
    isWebCodecsSupported,
    demuxMP4,
    extractVideoSamples,
    extractAudioSamples,
} from '../webcodecs'
import { debug, warn } from '../logger'

export interface GPUExportOptions {
    file: File | Blob
    startTime?: number
    endTime?: number
    transform?: WebGPUTransformParams
    width?: number
    height?: number
    bitrate?: number
    onProgress?: (progress: number, message: string) => void
}

export async function isGPUExportSupported(): Promise<boolean> {
    const gpuOk = await isWebGPUSupported()
    const codecsOk = isWebCodecsSupported()
    return gpuOk && codecsOk
}

function getAvcCodecForResolution(width: number, height: number): string {
    const totalPixels = width * height
    if (totalPixels > 1920 * 1080) {
        return 'avc1.640033' // High Profile Level 5.1 (supports 4K UHD @ 30/60fps)
    }
    if (totalPixels > 1280 * 720) {
        return 'avc1.640028' // High Profile Level 4.0 (supports 1080p)
    }
    return 'avc1.64001f'     // High Profile Level 3.1 (720p/1080p30)
}

export async function exportVideoWithWebGPU(options: GPUExportOptions): Promise<Blob> {
    const {
        file,
        startTime = 0,
        endTime,
        transform = {},
        width,
        height,
        bitrate = 5_000_000,
        onProgress,
    } = options

    onProgress?.(5, 'Demuxing video container...')

    const fileObj = file instanceof File ? file : new File([file], 'input.mp4', { type: 'video/mp4' })
    const { demuxResult, mp4File } = await demuxMP4(fileObj)

    const videoInfo = demuxResult.video
    if (!videoInfo) {
        throw new Error('No video track found in input file')
    }

    const end = endTime ?? demuxResult.duration
    const isRotated90or270 = transform.rotation === 90 || transform.rotation === 270
    const rawWidth = width || (isRotated90or270 ? videoInfo.height : videoInfo.width)
    const rawHeight = height || (isRotated90or270 ? videoInfo.width : videoInfo.height)
    const outWidth = rawWidth & ~1
    const outHeight = rawHeight & ~1

    onProgress?.(10, 'Initializing WebGPU shader pipeline...')

    const offscreenCanvas = new OffscreenCanvas(outWidth, outHeight)
    const renderer = new WebGPURenderer()
    const initialized = await renderer.initialize(offscreenCanvas)

    if (!initialized) {
        throw new Error('Failed to initialize WebGPU renderer for export')
    }

    try {
        onProgress?.(15, 'Extracting sample streams...')
        const videoSamples = await extractVideoSamples(mp4File, demuxResult.buffer, videoInfo, startTime, end)
        if (videoSamples.length === 0) {
            throw new Error('No video samples extracted for the specified range')
        }

        const audioInfo = demuxResult.audio
        let audioSamples: import('mp4box').Sample[] = []
        if (audioInfo) {
            audioSamples = await extractAudioSamples(mp4File, demuxResult.buffer, audioInfo, startTime, end)
        }

        onProgress?.(25, 'Configuring hardware encoder & muxer...')

        const target = new ArrayBufferTarget()
        const muxer = new Muxer({
            target,
            video: {
                codec: 'avc',
                width: outWidth,
                height: outHeight,
            },
            audio: audioInfo && audioSamples.length > 0 ? {
                codec: 'aac',
                numberOfChannels: audioInfo.numberOfChannels,
                sampleRate: audioInfo.sampleRate,
            } : undefined,
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset',
        })

        let lastMeta: EncodedVideoChunkMetadata | undefined
        let encodeError: Error | null = null

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                if (meta?.decoderConfig) {
                    lastMeta = meta
                }
                muxer.addVideoChunk(chunk, meta || lastMeta)
            },
            error: (err) => { encodeError = err },
        })

        const resolvedCodec = getAvcCodecForResolution(outWidth, outHeight)

        videoEncoder.configure({
            codec: resolvedCodec,
            width: outWidth,
            height: outHeight,
            bitrate,
            framerate: 30,
            avc: { format: 'avc' },
        })

        // Add audio stream chunks directly (lossless passthrough)
        if (audioInfo && audioSamples.length > 0) {
            for (const sample of audioSamples) {
                const timestampUs = Math.max(0, Math.round(((sample.cts / audioInfo.timescale) - startTime) * 1_000_000))
                const durationUs = Math.max(0, Math.round((sample.duration / audioInfo.timescale) * 1_000_000))
                const chunk = new EncodedAudioChunk({
                    type: sample.is_sync ? 'key' : 'delta',
                    timestamp: timestampUs,
                    duration: durationUs,
                    data: sample.data,
                })
                muxer.addAudioChunk(chunk)
            }
        }

        onProgress?.(35, 'Streaming frames through WebGPU shaders & hardware encoder...')
        debug('GPUExport', `Streaming ${videoSamples.length} frames through WebGPU WGSL shaders (${outWidth}x${outHeight})`)

        let processedFrames = 0
        const startTimestampUs = Math.round(startTime * 1_000_000)

        const videoDecoder = new VideoDecoder({
            output: (frame) => {
                try {
                    // Discard pre-roll keyframe frames outside the trim window
                    if (frame.timestamp < startTimestampUs - 5000) {
                        frame.close()
                        return
                    }

                    renderer.renderFrame(frame, transform)
                    const rebasedTimestampUs = Math.max(0, frame.timestamp - startTimestampUs)
                    const frameDurationUs = frame.duration ?? undefined
                    frame.close() // Release hardware decode buffer immediately

                    const gpuFrame = new VideoFrame(offscreenCanvas, {
                        timestamp: rebasedTimestampUs,
                        duration: frameDurationUs,
                    })
                    videoEncoder.encode(gpuFrame, { keyFrame: processedFrames % 60 === 0 })
                    gpuFrame.close()

                    processedFrames++
                    if (processedFrames % 15 === 0) {
                        const pct = 35 + Math.round((processedFrames / videoSamples.length) * 55)
                        onProgress?.(pct, `Processing WebGPU frames (${processedFrames}/${videoSamples.length})...`)
                    }
                } catch (err) {
                    encodeError = err instanceof Error ? err : new Error(String(err))
                }
            },
            error: (err) => { encodeError = err },
        })

        videoDecoder.configure(videoInfo.codecConfig)

        // Stream decode with strict backpressure to prevent out-of-memory crashes
        for (const sample of videoSamples) {
            if (encodeError) throw encodeError

            while (videoEncoder.encodeQueueSize > 8 || videoDecoder.decodeQueueSize > 8) {
                await new Promise((resolve) => setTimeout(resolve, 5))
            }

            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: (sample.dts / videoInfo.timescale) * 1_000_000,
                data: sample.data,
            })
            videoDecoder.decode(chunk)
        }

        await videoDecoder.flush()
        videoDecoder.close()

        onProgress?.(92, 'Flushing hardware encoders...')

        await videoEncoder.flush()
        videoEncoder.close()

        muxer.finalize()

        onProgress?.(100, 'WebGPU hardware export complete!')
        return new Blob([target.buffer], { type: 'video/mp4' })
    } catch (err) {
        warn('GPUExport', 'WebGPU export encountered error:', err)
        throw err
    } finally {
        renderer.destroy()
    }
}
