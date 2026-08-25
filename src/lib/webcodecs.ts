/**
 * @fileoverview WebCodecs hardware accelerated video decoding, splitting, and muxing.
 * Provides frame-accurate splitting with high performance on modern browsers.
 */

import { createFile, type MP4File, type MP4Info, type MP4VideoTrack, type MP4AudioTrack, type Sample, type MP4ArrayBuffer } from 'mp4box'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { warn } from './logger'

export interface DemuxResult {
    video: {
        track: MP4VideoTrack
        codec: string
        codecConfig: VideoDecoderConfig
        width: number
        height: number
        timescale: number
    } | null
    audio: {
        track: MP4AudioTrack
        codec: string
        codecConfig: AudioDecoderConfig
        sampleRate: number
        numberOfChannels: number
        timescale: number
    } | null
    duration: number
    buffer: ArrayBuffer
}

export interface VideoFrameData {
    frame: VideoFrame
    timestamp: number // In seconds
}

export interface AudioChunkData {
    data: AudioData
    timestamp: number // In seconds
}

/**
 * Check if WebCodecs is supported in the current environment
 */
export function isWebCodecsSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof VideoDecoder !== 'undefined' &&
        typeof VideoEncoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined'
    )
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

/**
 * Demux an MP4 file to extract track information and raw samples with timeout protection
 */
export async function demuxMP4(file: File, timeoutMs: number = 8000): Promise<{
    demuxResult: DemuxResult
    mp4File: MP4File
}> {
    return new Promise((resolve, reject) => {
        let settled = false
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true
                reject(new Error('MP4 demuxing timed out. The file may be corrupt or missing a valid MOOV atom.'))
            }
        }, timeoutMs)

        const mp4File = createFile()
        const demuxResult: DemuxResult = {
            video: null,
            audio: null,
            duration: 0,
            buffer: new ArrayBuffer(0),
        }

        mp4File.onReady = (info: MP4Info) => {
            if (settled) return
            settled = true
            clearTimeout(timer)

            demuxResult.duration = info.duration / info.timescale

            // Find video track
            const videoTrack = info.videoTracks[0] as MP4VideoTrack | undefined
            if (videoTrack) {
                const codecString = getVideoCodecString(videoTrack)
                demuxResult.video = {
                    track: videoTrack,
                    codec: codecString,
                    codecConfig: {
                        codec: codecString,
                        codedWidth: videoTrack.video.width,
                        codedHeight: videoTrack.video.height,
                        description: getAVCDecoderConfig(mp4File, videoTrack.id, demuxResult.buffer)
                    },
                    width: videoTrack.video.width,
                    height: videoTrack.video.height,
                    timescale: videoTrack.timescale
                }
            }

            // Find audio track
            const audioTrack = info.audioTracks[0] as MP4AudioTrack | undefined
            if (audioTrack) {
                const codecString = getAudioCodecString(audioTrack)
                demuxResult.audio = {
                    track: audioTrack,
                    codec: codecString,
                    codecConfig: {
                        codec: codecString,
                        sampleRate: audioTrack.audio.sample_rate,
                        numberOfChannels: audioTrack.audio.channel_count,
                        description: getAACDecoderConfig(mp4File, audioTrack.id, demuxResult.buffer)
                    },
                    sampleRate: audioTrack.audio.sample_rate,
                    numberOfChannels: audioTrack.audio.channel_count,
                    timescale: audioTrack.timescale
                }
            }

            resolve({ demuxResult, mp4File })
        }

        mp4File.onError = (error: string) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            reject(new Error(`MP4 demuxing error: ${error}`))
        }

        // Read file and feed to mp4box
        const reader = new FileReader()
        reader.onload = () => {
            const buffer = reader.result as ArrayBuffer
            demuxResult.buffer = buffer
            const mp4Buffer = buffer as MP4ArrayBuffer
            mp4Buffer.fileStart = 0
            mp4File.appendBuffer(mp4Buffer)
            mp4File.flush()
        }
        reader.onerror = () => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            reject(new Error('Failed to read file for demuxing'))
        }
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Get codec string from MP4VideoTrack
 */
function getVideoCodecString(track: MP4VideoTrack): string {
    const codec = track.codec
    if (codec.startsWith('avc1') || codec.startsWith('avc3')) {
        return codec
    }
    if (codec.startsWith('hvc1') || codec.startsWith('hev1')) {
        return codec
    }
    if (codec.startsWith('vp09')) {
        return codec
    }
    if (codec.startsWith('av01')) {
        return codec
    }
    return codec
}

/**
 * Get codec string from MP4AudioTrack
 */
function getAudioCodecString(track: MP4AudioTrack): string {
    const codec = track.codec
    if (codec.startsWith('mp4a')) {
        return codec
    }
    if (codec.startsWith('opus')) {
        return 'opus'
    }
    return codec
}

/**
 * Extract AVC (H.264) decoder configuration record (avcC) from MP4
 */
function getAVCDecoderConfig(
    mp4File: MP4File,
    trackId: number,
    _buffer: ArrayBuffer
): Uint8Array | undefined {
    try {
        const trak = mp4File.getTrackById(trackId)
        if (!trak) return undefined

        const stbl = trak.mdia?.minf?.stbl
        if (!stbl?.stsd) return undefined

        const entries = (stbl.stsd.entries ?? []) as unknown as Array<{ format: string; avcC?: { write: (s: unknown) => void } }>
        const avc1 = entries.find((e) => e.format === 'avc1' || e.format === 'avc3')
        if (!avc1?.avcC) return undefined

        const avcC = avc1.avcC
        const stream = new (mp4File as unknown as { DataStream: new (size: number, endianness: boolean, write: boolean) => { getUint8Array: () => Uint8Array } }).DataStream(1024, false, true)
        avcC.write(stream)
        return stream.getUint8Array()
    } catch (e) {
        warn('WebCodecs', 'Failed to extract AVC decoder config:', e)
        return undefined
    }
}

/**
 * Extract AAC decoder configuration record (esds) from MP4
 */
function getAACDecoderConfig(
    mp4File: MP4File,
    trackId: number,
    _buffer: ArrayBuffer
): Uint8Array | undefined {
    try {
        const trak = mp4File.getTrackById(trackId)
        if (!trak) return undefined

        const stbl = trak.mdia?.minf?.stbl
        if (!stbl?.stsd) return undefined

        const entries = (stbl.stsd.entries ?? []) as unknown as Array<{ format: string; esds?: { esd?: { descs?: Array<{ tag: number; descs?: Array<{ tag: number; data?: number[] }> }> } } }>
        const mp4a = entries.find((e) => e.format === 'mp4a')
        if (!mp4a?.esds?.esd?.descs) return undefined

        const esd = mp4a.esds.esd
        const decConfig = esd.descs?.find((d) => d.tag === 4)
        if (!decConfig?.descs) return undefined

        const decSpecific = decConfig.descs.find((d) => d.tag === 5)
        if (!decSpecific?.data) return undefined

        return new Uint8Array(decSpecific.data)
    } catch (e) {
        warn('WebCodecs', 'Failed to extract AAC decoder config:', e)
        return undefined
    }
}

/**
 * Extract video samples from MP4 for a specific time range
 */
export async function extractVideoSamples(
    mp4File: MP4File,
    _buffer: ArrayBuffer,
    videoInfo: NonNullable<DemuxResult['video']>,
    startTimeSec: number,
    endTimeSec: number
): Promise<Sample[]> {
    return new Promise((resolve) => {
        const samples: Sample[] = []
        const startDts = startTimeSec * videoInfo.timescale
        const endDts = endTimeSec * videoInfo.timescale

        let keyframeDts = 0
        let foundStartKeyframe = false

        mp4File.setExtractionOptions(videoInfo.track.id, null, {
            nbSamples: 1000
        })

        mp4File.onSamples = (id: number, _user: unknown, extractedSamples: Sample[]) => {
            if (id !== videoInfo.track.id) return

            for (const sample of extractedSamples) {
                const sampleDts = sample.dts

                if (sample.is_sync && sampleDts <= startDts) {
                    keyframeDts = sampleDts
                    foundStartKeyframe = true
                }

                if (foundStartKeyframe && sampleDts >= keyframeDts && sampleDts <= endDts) {
                    samples.push(sample)
                }

                if (sampleDts > endDts) {
                    break
                }
            }
        }

        mp4File.start()

        setTimeout(() => {
            mp4File.stop()
            resolve(samples)
        }, 100)
    })
}

/**
 * Extract audio samples from MP4 for a specific time range
 */
export async function extractAudioSamples(
    mp4File: MP4File,
    _buffer: ArrayBuffer,
    audioInfo: NonNullable<DemuxResult['audio']>,
    startTimeSec: number,
    endTimeSec: number
): Promise<Sample[]> {
    return new Promise((resolve) => {
        const samples: Sample[] = []
        const startDts = startTimeSec * audioInfo.timescale
        const endDts = endTimeSec * audioInfo.timescale

        mp4File.setExtractionOptions(audioInfo.track.id, null, {
            nbSamples: 1000
        })

        mp4File.onSamples = (id: number, _user: unknown, extractedSamples: Sample[]) => {
            if (id !== audioInfo.track.id) return

            for (const sample of extractedSamples) {
                const sampleDts = sample.dts

                if (sampleDts >= startDts && sampleDts <= endDts) {
                    samples.push(sample)
                }

                if (sampleDts > endDts) {
                    break
                }
            }
        }

        mp4File.start()

        setTimeout(() => {
            mp4File.stop()
            resolve(samples)
        }, 100)
    })
}

/**
 * Decode video samples to VideoFrame objects
 */
export async function decodeVideoSamples(
    samples: Sample[],
    codecConfig: VideoDecoderConfig,
    timescale: number,
    startTimeSec: number
): Promise<VideoFrameData[]> {
    return new Promise((resolve, reject) => {
        const frames: VideoFrameData[] = []
        let pendingFrames = 0
        let isFlushing = false

        const decoder = new VideoDecoder({
            output: (frame: VideoFrame) => {
                const timestampSec = frame.timestamp / 1_000_000

                if (timestampSec >= startTimeSec - 0.05) {
                    frames.push({
                        frame,
                        timestamp: timestampSec
                    })
                } else {
                    frame.close()
                }

                pendingFrames--
                if (isFlushing && pendingFrames === 0) {
                    decoder.close()
                    resolve(frames)
                }
            },
            error: (error) => {
                decoder.close()
                reject(error)
            }
        })

        try {
            decoder.configure(codecConfig)

            for (const sample of samples) {
                const chunk = new EncodedVideoChunk({
                    type: sample.is_sync ? 'key' : 'delta',
                    timestamp: (sample.dts / timescale) * 1_000_000,
                    duration: (sample.duration / timescale) * 1_000_000,
                    data: sample.data
                })

                pendingFrames++
                decoder.decode(chunk)
            }

            isFlushing = true
            decoder.flush().then(() => {
                if (pendingFrames === 0) {
                    decoder.close()
                    resolve(frames)
                }
            }).catch(reject)
        } catch (e) {
            decoder.close()
            reject(e)
        }
    })
}

/**
 * Decode audio samples to AudioData objects
 */
export async function decodeAudioSamples(
    samples: Sample[],
    codecConfig: AudioDecoderConfig,
    timescale: number,
    startTimeSec: number
): Promise<AudioChunkData[]> {
    return new Promise((resolve, reject) => {
        const audioChunks: AudioChunkData[] = []
        let pendingChunks = 0
        let isFlushing = false

        const decoder = new AudioDecoder({
            output: (data: AudioData) => {
                const timestampSec = data.timestamp / 1_000_000

                if (timestampSec >= startTimeSec - 0.05) {
                    audioChunks.push({
                        data,
                        timestamp: timestampSec
                    })
                } else {
                    data.close()
                }

                pendingChunks--
                if (isFlushing && pendingChunks === 0) {
                    decoder.close()
                    resolve(audioChunks)
                }
            },
            error: (error) => {
                decoder.close()
                reject(error)
            }
        })

        try {
            decoder.configure(codecConfig)

            for (const sample of samples) {
                const chunk = new EncodedAudioChunk({
                    type: sample.is_sync ? 'key' : 'delta',
                    timestamp: (sample.dts / timescale) * 1_000_000,
                    duration: (sample.duration / timescale) * 1_000_000,
                    data: sample.data
                })

                pendingChunks++
                decoder.decode(chunk)
            }

            isFlushing = true
            decoder.flush().then(() => {
                if (pendingChunks === 0) {
                    decoder.close()
                    resolve(audioChunks)
                }
            }).catch(reject)
        } catch (e) {
            decoder.close()
            reject(e)
        }
    })
}

/**
 * Encode video frames and audio chunks, then mux to MP4 Blob
 */
export async function encodeAndMux(
    videoFrames: VideoFrameData[],
    audioData: AudioChunkData[],
    videoConfig: { width: number; height: number },
    audioConfig?: { sampleRate: number; numberOfChannels: number }
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const target = new ArrayBufferTarget()
        const outWidth = videoConfig.width & ~1
        const outHeight = videoConfig.height & ~1

        const muxer = new Muxer({
            target,
            video: {
                codec: 'avc',
                width: outWidth,
                height: outHeight
            },
            audio: audioConfig ? {
                codec: 'aac',
                numberOfChannels: audioConfig.numberOfChannels,
                sampleRate: audioConfig.sampleRate
            } : undefined,
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset'
        })

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                muxer.addVideoChunk(chunk, meta)
            },
            error: (error) => {
                reject(error)
            }
        })

        const resolvedCodec = getAvcCodecForResolution(outWidth, outHeight)

        videoEncoder.configure({
            codec: resolvedCodec,
            width: outWidth,
            height: outHeight,
            bitrate: 5_000_000,
            framerate: 30
        })

        let audioEncoder: AudioEncoder | null = null
        if (audioConfig && audioData.length > 0) {
            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => {
                    muxer.addAudioChunk(chunk, meta)
                },
                error: (error) => {
                    reject(error)
                }
            })

            audioEncoder.configure({
                codec: 'mp4a.40.2',
                sampleRate: audioConfig.sampleRate,
                numberOfChannels: audioConfig.numberOfChannels,
                bitrate: 128_000
            })
        }

        const runEncoding = async () => {
            try {
                for (let i = 0; i < videoFrames.length; i++) {
                    const { frame, timestamp } = videoFrames[i]
                    const isKeyFrame = i === 0 || i % 60 === 0

                    while (videoEncoder.encodeQueueSize > 16) {
                        await new Promise((r) => {
                            videoEncoder.ondequeue = r as () => void
                        })
                    }

                    const rebasedFrame = new VideoFrame(frame, {
                        timestamp: Math.max(0, Math.round(timestamp * 1_000_000)),
                        duration: frame.duration ?? undefined
                    })

                    videoEncoder.encode(rebasedFrame, { keyFrame: isKeyFrame })
                    rebasedFrame.close()
                    frame.close()
                }

                if (audioEncoder) {
                    for (const { data } of audioData) {
                        while (audioEncoder.encodeQueueSize > 16) {
                            await new Promise((r) => {
                                if (audioEncoder) audioEncoder.ondequeue = r as () => void
                            })
                        }
                        audioEncoder.encode(data)
                        data.close()
                    }
                }

                const flushPromises: Promise<void>[] = [videoEncoder.flush()]
                if (audioEncoder) {
                    flushPromises.push(audioEncoder.flush())
                }

                await Promise.all(flushPromises)
                videoEncoder.close()
                if (audioEncoder) {
                    audioEncoder.close()
                }

                muxer.finalize()
                const buffer = target.buffer
                resolve(new Blob([buffer], { type: 'video/mp4' }))
            } catch (err) {
                reject(err)
            } finally {
                // Defensive GPU resource cleanup
                for (const { frame } of videoFrames) {
                    try { frame.close() } catch { /* ignore */ }
                }
                for (const { data } of audioData) {
                    try { data.close() } catch { /* ignore */ }
                }
            }
        }

        runEncoding()
    })
}

/**
 * Split video using WebCodecs with single-pass demuxing
 */
export async function splitVideoWebCodecs(
    file: File,
    trimStart: number,
    trimEnd: number,
    splitPoints: number[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob[]> {
    if (!isWebCodecsSupported()) {
        throw new Error('WebCodecs is not supported in this browser')
    }

    onProgress?.(5, 'Demuxing video container...')
    const { demuxResult, mp4File } = await demuxMP4(file)

    if (!demuxResult.video) {
        throw new Error('No video track found in input file')
    }

    const codecSupport = await VideoDecoder.isConfigSupported(demuxResult.video.codecConfig)
    if (!codecSupport.supported) {
        throw new Error(`Video codec "${demuxResult.video.codec}" is not supported by WebCodecs`)
    }

    const videoInfo = demuxResult.video
    const audioInfo = demuxResult.audio

    const validSplitPoints = splitPoints
        .filter(t => t > trimStart && t < trimEnd)
        .sort((a, b) => a - b)

    const points = [trimStart, ...validSplitPoints, trimEnd]
    const segments: { start: number; end: number }[] = []

    for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1] })
    }

    const blobs: Blob[] = []
    const progressPerSegment = 85 / segments.length

    for (let i = 0; i < segments.length; i++) {
        const { start, end } = segments[i]
        const baseProgress = 10 + i * progressPerSegment

        onProgress?.(baseProgress, `Processing segment ${i + 1}/${segments.length}...`)

        onProgress?.(baseProgress + progressPerSegment * 0.2, `Extracting frames for segment ${i + 1}...`)
        const videoSamples = await extractVideoSamples(mp4File, demuxResult.buffer, videoInfo, start, end)

        if (videoSamples.length === 0) {
            throw new Error(`No video samples found for segment ${i + 1} (${start.toFixed(2)}s - ${end.toFixed(2)}s)`)
        }

        let audioSamples: Sample[] = []
        if (audioInfo) {
            audioSamples = await extractAudioSamples(mp4File, demuxResult.buffer, audioInfo, start, end)
        }

        onProgress?.(baseProgress + progressPerSegment * 0.4, `Decoding frames...`)
        const videoFrames = await decodeVideoSamples(
            videoSamples,
            videoInfo.codecConfig,
            videoInfo.timescale,
            start
        )

        if (videoFrames.length === 0) {
            throw new Error(`Failed to decode video frames for segment ${i + 1}. The codec may not be fully supported.`)
        }

        let audioData: AudioChunkData[] = []
        if (audioInfo && audioSamples.length > 0) {
            audioData = await decodeAudioSamples(
                audioSamples,
                audioInfo.codecConfig,
                audioInfo.timescale,
                start
            )
        }

        onProgress?.(baseProgress + progressPerSegment * 0.7, `Encoding segment ${i + 1}...`)
        const segmentBlob = await encodeAndMux(
            videoFrames,
            audioData,
            { width: videoInfo.width, height: videoInfo.height },
            audioInfo ? { sampleRate: audioInfo.sampleRate, numberOfChannels: audioInfo.numberOfChannels } : undefined
        )

        blobs.push(segmentBlob)
    }

    onProgress?.(100, 'Split complete!')
    return blobs
}
