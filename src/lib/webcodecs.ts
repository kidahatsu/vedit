/**
 * @fileoverview WebCodecs-based video processing for frame-accurate splitting.
 * Uses mp4box.js for demuxing/muxing and WebCodecs API for decode/encode.
 * 
 * Architecture:
 * 1. Demux MP4 → Extract video/audio tracks (mp4box.js)
 * 2. Decode → Convert to VideoFrame/AudioData objects (WebCodecs)
 * 3. Select → Pick exact frames for time range
 * 4. Encode → Convert back to encoded chunks (WebCodecs)
 * 5. Mux → Package into new MP4 container (mp4-muxer)
 */

import { createFile } from 'mp4box'
import type { MP4File, MP4ArrayBuffer, MP4Info, MP4VideoTrack, MP4AudioTrack, Sample } from 'mp4box'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if WebCodecs API is supported in the current browser
 */
export function isWebCodecsSupported(): boolean {
    return (
        typeof VideoDecoder !== 'undefined' &&
        typeof VideoEncoder !== 'undefined' &&
        typeof AudioDecoder !== 'undefined' &&
        typeof AudioEncoder !== 'undefined'
    )
}

// ============================================================================
// Types
// ============================================================================

interface VideoTrackInfo {
    track: MP4VideoTrack
    codec: string
    codecConfig: VideoDecoderConfig
    width: number
    height: number
    timescale: number
}

interface AudioTrackInfo {
    track: MP4AudioTrack
    codec: string
    codecConfig: AudioDecoderConfig
    sampleRate: number
    numberOfChannels: number
    timescale: number
}

interface DemuxResult {
    video: VideoTrackInfo | null
    audio: AudioTrackInfo | null
    duration: number
}

interface FrameData {
    frame: VideoFrame
    timestamp: number  // in seconds
}

interface AudioChunkData {
    data: AudioData
    timestamp: number  // in seconds
}

// ============================================================================
// MP4 Demuxer
// ============================================================================

/**
 * Demux an MP4 file to extract track information and samples
 */
async function demuxMP4(file: File): Promise<{
    demuxResult: DemuxResult
    mp4File: MP4File
}> {
    return new Promise((resolve, reject) => {
        const mp4File = createFile()
        const demuxResult: DemuxResult = {
            video: null,
            audio: null,
            duration: 0
        }

        mp4File.onReady = (info: MP4Info) => {
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
                        description: getAVCDecoderConfig(mp4File, videoTrack.id)
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
                        description: getAACDecoderConfig(mp4File, audioTrack.id)
                    },
                    sampleRate: audioTrack.audio.sample_rate,
                    numberOfChannels: audioTrack.audio.channel_count,
                    timescale: audioTrack.timescale
                }
            }

            resolve({ demuxResult, mp4File })
        }

        mp4File.onError = (error: string) => {
            reject(new Error(`MP4 demuxing error: ${error}`))
        }

        // Read file and feed to mp4box
        const reader = new FileReader()
        reader.onload = () => {
            const buffer = reader.result as ArrayBuffer
            const mp4Buffer = buffer as MP4ArrayBuffer
            mp4Buffer.fileStart = 0
            mp4File.appendBuffer(mp4Buffer)
            mp4File.flush()
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Get video codec string for VideoDecoder config
 */
function getVideoCodecString(track: MP4VideoTrack): string {
    const codec = track.codec
    // Handle common codecs
    if (codec.startsWith('avc1')) {
        return codec // e.g., "avc1.64001f"
    }
    if (codec.startsWith('hev1') || codec.startsWith('hvc1')) {
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
 * Get audio codec string for AudioDecoder config
 */
function getAudioCodecString(track: MP4AudioTrack): string {
    const codec = track.codec
    if (codec.startsWith('mp4a')) {
        // AAC
        return 'mp4a.40.2' // AAC-LC
    }
    if (codec.startsWith('opus')) {
        return 'opus'
    }
    return codec
}

/**
 * Extract AVC/H.264 decoder configuration from mp4box
 */
function getAVCDecoderConfig(mp4File: MP4File, trackId: number): Uint8Array | undefined {
    const trak = mp4File.getTrackById(trackId)
    if (!trak) return undefined

    // Get the avcC box which contains SPS/PPS
    const stsd = trak.mdia?.minf?.stbl?.stsd
    if (!stsd) return undefined

    const entry = stsd.entries?.[0]
    if (!entry) return undefined

    // For AVC, look for avcC box
    const avcC = (entry as { avcC?: { data: Uint8Array } }).avcC
    if (avcC?.data) {
        return new Uint8Array(avcC.data)
    }

    return undefined
}

/**
 * Extract AAC decoder configuration from mp4box
 */
function getAACDecoderConfig(mp4File: MP4File, trackId: number): Uint8Array | undefined {
    const trak = mp4File.getTrackById(trackId)
    if (!trak) return undefined

    const stsd = trak.mdia?.minf?.stbl?.stsd
    if (!stsd) return undefined

    const entry = stsd.entries?.[0]
    if (!entry) return undefined

    // For AAC, look for esds box
    const esds = (entry as { esds?: { data: Uint8Array } }).esds
    if (esds?.data) {
        return new Uint8Array(esds.data)
    }

    return undefined
}

// ============================================================================
// Frame Extraction
// ============================================================================

/**
 * Extract video samples for a time range
 */
async function extractVideoSamples(
    mp4File: MP4File,
    videoInfo: VideoTrackInfo,
    startTime: number,
    endTime: number
): Promise<Sample[]> {
    return new Promise((resolve) => {
        const samples: Sample[] = []
        const trackId = videoInfo.track.id

        mp4File.onSamples = (id: number, _user: unknown, sampleArray: Sample[]) => {
            if (id === trackId) {
                for (const sample of sampleArray) {
                    const sampleTime = sample.cts / videoInfo.timescale
                    if (sampleTime >= startTime && sampleTime < endTime) {
                        samples.push(sample)
                    }
                }
            }
        }

        mp4File.setExtractionOptions(trackId, null, { nbSamples: Infinity })
        mp4File.start()

        // Give it time to extract, then resolve
        setTimeout(() => {
            mp4File.stop()
            resolve(samples)
        }, 100)
    })
}

/**
 * Extract audio samples for a time range
 */
async function extractAudioSamples(
    mp4File: MP4File,
    audioInfo: AudioTrackInfo,
    startTime: number,
    endTime: number
): Promise<Sample[]> {
    return new Promise((resolve) => {
        const samples: Sample[] = []
        const trackId = audioInfo.track.id

        mp4File.onSamples = (id: number, _user: unknown, sampleArray: Sample[]) => {
            if (id === trackId) {
                for (const sample of sampleArray) {
                    const sampleTime = sample.cts / audioInfo.timescale
                    if (sampleTime >= startTime && sampleTime < endTime) {
                        samples.push(sample)
                    }
                }
            }
        }

        mp4File.setExtractionOptions(trackId, null, { nbSamples: Infinity })
        mp4File.start()

        setTimeout(() => {
            mp4File.stop()
            resolve(samples)
        }, 100)
    })
}

// ============================================================================
// Decode / Encode
// ============================================================================

/**
 * Decode video samples to VideoFrame objects
 */
async function decodeVideoSamples(
    samples: Sample[],
    config: VideoDecoderConfig,
    timescale: number,
    baseTimestamp: number = 0
): Promise<FrameData[]> {
    return new Promise((resolve, reject) => {
        const frames: FrameData[] = []

        const decoder = new VideoDecoder({
            output: (frame) => {
                frames.push({
                    frame,
                    timestamp: (frame.timestamp ?? 0) / 1_000_000 // Convert microseconds to seconds
                })
            },
            error: (error) => {
                reject(error)
            }
        })

        decoder.configure(config)

        for (const sample of samples) {
            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: ((sample.cts / timescale) - baseTimestamp) * 1_000_000, // Convert to microseconds
                data: sample.data
            })
            decoder.decode(chunk)
        }

        decoder.flush().then(() => {
            decoder.close()
            resolve(frames)
        }).catch(reject)
    })
}

/**
 * Decode audio samples to AudioData objects
 */
async function decodeAudioSamples(
    samples: Sample[],
    config: AudioDecoderConfig,
    timescale: number,
    baseTimestamp: number = 0
): Promise<AudioChunkData[]> {
    return new Promise((resolve, reject) => {
        const audioData: AudioChunkData[] = []

        const decoder = new AudioDecoder({
            output: (data) => {
                audioData.push({
                    data,
                    timestamp: (data.timestamp ?? 0) / 1_000_000
                })
            },
            error: (error) => {
                reject(error)
            }
        })

        decoder.configure(config)

        for (const sample of samples) {
            const chunk = new EncodedAudioChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: ((sample.cts / timescale) - baseTimestamp) * 1_000_000,
                data: sample.data
            })
            decoder.decode(chunk)
        }

        decoder.flush().then(() => {
            decoder.close()
            resolve(audioData)
        }).catch(reject)
    })
}

// ============================================================================
// Muxing
// ============================================================================

/**
 * Encode frames and mux into MP4
 */
async function encodeAndMux(
    videoFrames: FrameData[],
    audioData: AudioChunkData[],
    videoConfig: { width: number; height: number },
    audioConfig: { sampleRate: number; numberOfChannels: number } | null
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const target = new ArrayBufferTarget()

        const muxerOptions: ConstructorParameters<typeof Muxer>[0] = {
            target,
            video: {
                codec: 'avc',
                width: videoConfig.width,
                height: videoConfig.height
            },
            fastStart: 'in-memory'
        }

        if (audioConfig) {
            muxerOptions.audio = {
                codec: 'aac',
                sampleRate: audioConfig.sampleRate,
                numberOfChannels: audioConfig.numberOfChannels
            }
        }

        const muxer = new Muxer(muxerOptions)

        // Video encoder
        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                muxer.addVideoChunk(chunk, meta)
            },
            error: (error) => {
                reject(error)
            }
        })

        videoEncoder.configure({
            codec: 'avc1.64001f', // H.264 High Profile Level 3.1
            width: videoConfig.width,
            height: videoConfig.height,
            bitrate: 5_000_000, // 5 Mbps
            framerate: 30
        })

        // Audio encoder (if we have audio)
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
                codec: 'mp4a.40.2', // AAC-LC
                sampleRate: audioConfig.sampleRate,
                numberOfChannels: audioConfig.numberOfChannels,
                bitrate: 128_000 // 128 kbps
            })
        }

        // Encode all video frames
        for (const { frame } of videoFrames) {
            videoEncoder.encode(frame, { keyFrame: false })
            frame.close()
        }

        // Encode all audio data
        if (audioEncoder) {
            for (const { data } of audioData) {
                audioEncoder.encode(data)
                data.close()
            }
        }

        // Flush and finalize
        const flushPromises: Promise<void>[] = [videoEncoder.flush()]
        if (audioEncoder) {
            flushPromises.push(audioEncoder.flush())
        }

        Promise.all(flushPromises).then(() => {
            videoEncoder.close()
            if (audioEncoder) {
                audioEncoder.close()
            }

            muxer.finalize()
            const buffer = target.buffer
            resolve(new Blob([buffer], { type: 'video/mp4' }))
        }).catch(reject)
    })
}

// ============================================================================
// Main Split Function
// ============================================================================

/**
 * Split a video at multiple points using WebCodecs for frame-accurate results.
 * 
 * @param file - The input video file
 * @param trimStart - Start time in seconds
 * @param trimEnd - End time in seconds
 * @param splitPoints - Array of timestamps where to split (in seconds)
 * @param onProgress - Progress callback
 * @returns Array of Blob objects, one for each segment
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

    onProgress?.(5, 'Parsing video file...')

    // Step 1: Demux the MP4 file
    const { demuxResult } = await demuxMP4(file)

    if (!demuxResult.video) {
        throw new Error('No video track found in file')
    }

    // Validate codec is supported by WebCodecs
    const codecSupport = await VideoDecoder.isConfigSupported(demuxResult.video.codecConfig)
    if (!codecSupport.supported) {
        throw new Error(`Video codec "${demuxResult.video.codec}" is not supported by WebCodecs`)
    }

    const videoInfo = demuxResult.video
    const audioInfo = demuxResult.audio

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
    const progressPerSegment = 85 / segments.length

    for (let i = 0; i < segments.length; i++) {
        const { start, end } = segments[i]
        const baseProgress = 10 + i * progressPerSegment

        onProgress?.(baseProgress, `Processing segment ${i + 1}/${segments.length}...`)

        // Need to re-demux for each segment to get fresh samples
        const { demuxResult: segDemux, mp4File: segMp4 } = await demuxMP4(file)

        // Extract samples for this time range
        onProgress?.(baseProgress + progressPerSegment * 0.2, `Extracting frames...`)
        const videoSamples = await extractVideoSamples(segMp4, segDemux.video!, start, end)

        // Validate we got samples
        if (videoSamples.length === 0) {
            throw new Error(`No video samples found for segment ${i + 1} (${start.toFixed(2)}s - ${end.toFixed(2)}s)`)
        }

        let audioSamples: Sample[] = []
        if (segDemux.audio) {
            audioSamples = await extractAudioSamples(segMp4, segDemux.audio, start, end)
        }

        // Decode samples to frames
        onProgress?.(baseProgress + progressPerSegment * 0.4, `Decoding ${videoSamples.length} frames...`)
        const videoFrames = await decodeVideoSamples(
            videoSamples,
            segDemux.video!.codecConfig,
            segDemux.video!.timescale,
            start
        )

        // Validate we got frames
        if (videoFrames.length === 0) {
            throw new Error(`Failed to decode video frames for segment ${i + 1}. The codec may not be fully supported.`)
        }

        let audioData: AudioChunkData[] = []
        if (segDemux.audio && audioSamples.length > 0) {
            audioData = await decodeAudioSamples(
                audioSamples,
                segDemux.audio.codecConfig,
                segDemux.audio.timescale,
                start
            )
        }

        // Encode and mux into new MP4
        onProgress?.(baseProgress + progressPerSegment * 0.7, `Encoding segment ${i + 1}...`)
        const blob = await encodeAndMux(
            videoFrames,
            audioData,
            { width: videoInfo.width, height: videoInfo.height },
            audioInfo ? { sampleRate: audioInfo.sampleRate, numberOfChannels: audioInfo.numberOfChannels } : null
        )

        blobs.push(blob)
    }

    onProgress?.(100, 'Complete!')
    return blobs
}
