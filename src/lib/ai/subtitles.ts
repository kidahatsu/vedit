/**
 * @fileoverview In-Browser AI Subtitles & Captioning using Whisper WebGPU.
 * Generates time-aligned subtitle cues and formats to .srt / .vtt.
 */

import { debug, warn } from '../logger'

export interface SubtitleCue {
    start: number
    end: number
    text: string
}

/**
 * Format timestamp in seconds to SRT time format: HH:MM:SS,mmm
 */
export function formatSRTTime(seconds: number): string {
    const totalMs = Math.max(0, Math.round(seconds * 1000))
    const h = Math.floor(totalMs / 3600000).toString().padStart(2, '0')
    const m = Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0')
    const s = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0')
    const ms = (totalMs % 1000).toString().padStart(3, '0')
    return `${h}:${m}:${s},${ms}`
}

/**
 * Format timestamp in seconds to WebVTT time format: HH:MM:SS.mmm
 */
export function formatVTTTime(seconds: number): string {
    return formatSRTTime(seconds).replace(',', '.')
}

/**
 * Convert an array of SubtitleCues to a standard SubRip (.srt) file content
 */
export function formatAsSRT(cues: SubtitleCue[]): string {
    return cues
        .map((cue, index) => {
            return `${index + 1}\n${formatSRTTime(cue.start)} --> ${formatSRTTime(cue.end)}\n${cue.text.trim()}\n`
        })
        .join('\n')
}

/**
 * Convert an array of SubtitleCues to a standard WebVTT (.vtt) file content
 */
export function formatAsVTT(cues: SubtitleCue[]): string {
    const header = 'WEBVTT\n\n'
    const body = cues
        .map((cue, index) => {
            return `${index + 1}\n${formatVTTTime(cue.start)} --> ${formatVTTTime(cue.end)}\n${cue.text.trim()}\n`
        })
        .join('\n')
    return header + body
}

/**
 * Generate subtitles using in-browser Whisper WebGPU
 */
export async function generateSubtitlesWebGPU(
    audioBlob: Blob,
    onProgress?: (progress: number, message: string) => void
): Promise<SubtitleCue[]> {
    onProgress?.(10, 'Initializing Whisper AI engine...')

    try {
        const { pipeline } = await import('@huggingface/transformers')

        const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu

        onProgress?.(20, hasWebGPU ? 'Loading Whisper model (WebGPU accelerated)...' : 'Loading Whisper model (WASM fallback)...')

        const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
            device: hasWebGPU ? 'webgpu' : 'wasm',
            dtype: 'fp32',
            progress_callback: (info: unknown) => {
                const progressInfo = info as { progress?: number }
                if (progressInfo?.progress !== undefined) {
                    const pct = 20 + Math.round(progressInfo.progress * 30)
                    onProgress?.(pct, `Downloading AI weights: ${Math.round(progressInfo.progress * 100)}%`)
                }
            }
        })

        onProgress?.(60, 'Transcribing audio track...')

        // Read and decode audio, then resample strictly to 16,000 Hz for Whisper
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = new AudioContextClass()

        let channelData16k: Float32Array
        try {
            let decodedBuffer: AudioBuffer
            try {
                const arrayBuffer = await audioBlob.arrayBuffer()
                decodedBuffer = await audioContext.decodeAudioData(arrayBuffer)
            } catch {
                warn('Subtitles', 'Direct audio decode failed; extracting audio track via FFmpeg...')
                const { extractAudio } = await import('../ffmpeg')
                const fileObj = audioBlob instanceof File ? audioBlob : new File([audioBlob], 'input.mp4', { type: audioBlob.type || 'video/mp4' })
                const extractedBlob = await extractAudio(fileObj, 0, 999999)
                const extractedBuffer = await extractedBlob.arrayBuffer()
                decodedBuffer = await audioContext.decodeAudioData(extractedBuffer)
            }
            const targetSampleRate = 16000
            const offlineCtx = new OfflineAudioContext(
                1,
                Math.max(1, Math.ceil(decodedBuffer.duration * targetSampleRate)),
                targetSampleRate
            )

            const source = offlineCtx.createBufferSource()
            source.buffer = decodedBuffer
            source.connect(offlineCtx.destination)
            source.start(0)

            const renderedBuffer = await offlineCtx.startRendering()
            channelData16k = renderedBuffer.getChannelData(0)
        } finally {
            await audioContext.close().catch(() => {})
        }

        onProgress?.(80, 'Generating timestamped cues...')

        // Run transcription pipeline with 16kHz mono audio
        const result = await transcriber(channelData16k, {
            return_timestamps: true,
            chunk_length_s: 30,
            stride_length_s: 5,
        }) as { chunks?: { timestamp: [number, number]; text: string }[]; text?: string }

        onProgress?.(100, 'Subtitles ready!')

        const cues: SubtitleCue[] = []
        if (result.chunks && Array.isArray(result.chunks)) {
            for (const chunk of result.chunks) {
                if (chunk.timestamp && chunk.timestamp.length === 2 && chunk.text) {
                    cues.push({
                        start: chunk.timestamp[0] ?? 0,
                        end: chunk.timestamp[1] ?? chunk.timestamp[0] + 2,
                        text: chunk.text.trim(),
                    })
                }
            }
        } else if (result.text) {
            cues.push({
                start: 0,
                end: channelData16k.length / 16000,
                text: result.text.trim(),
            })
        }

        debug('Subtitles', `Generated ${cues.length} subtitle cues`)
        return cues
    } catch (err) {
        warn('Subtitles', 'Failed to generate subtitles via Whisper WebGPU:', err)
        throw err
    }
}
