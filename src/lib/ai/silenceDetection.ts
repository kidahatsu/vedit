/**
 * @fileoverview Voice Activity Detection (VAD) and Silence Gap Analyzer.
 * Detects pauses and dead air in audio tracks to automate smart jump-cuts.
 */

import { debug, warn } from '../logger'

export interface SilenceDetectionOptions {
    /** Threshold in decibels below which audio is considered silence (e.g. -35 dB) */
    thresholdDb?: number
    /** Minimum duration of silence in seconds to trigger a split (default 0.4s) */
    minSilenceDurationSec?: number
    /** Padding in seconds to preserve before and after speech (default 0.05s) */
    paddingSec?: number
}

/**
 * Detect silence intervals in an audio/video file and return split timestamps
 */
export async function detectSilenceSplitPoints(
    file: File | Blob,
    options: SilenceDetectionOptions = {}
): Promise<number[]> {
    const {
        thresholdDb = -35,
        minSilenceDurationSec = 0.4,
        paddingSec = 0.05,
    } = options

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser')
    }

    const audioContext = new AudioContextClass()

    try {
        let audioBuffer: AudioBuffer

        try {
            const arrayBuffer = await file.arrayBuffer()
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        } catch {
            // If browser decodeAudioData or arrayBuffer rejects video container, extract audio via FFmpeg
            warn('SilenceDetection', 'Direct audio decode failed; extracting audio track via FFmpeg...')
            const { extractAudio } = await import('../ffmpeg')
            const fileObj = file instanceof File ? file : new File([file], 'input.mp4', { type: file.type || 'video/mp4' })
            const audioBlob = await extractAudio(fileObj, 0, 999999)
            const extractedBuffer = await audioBlob.arrayBuffer()
            audioBuffer = await audioContext.decodeAudioData(extractedBuffer)
        }

        const channelData = audioBuffer.getChannelData(0)
        const sampleRate = audioBuffer.sampleRate
        const windowSize = Math.max(128, Math.floor(sampleRate * 0.02)) // 20ms window
        const thresholdLinear = Math.pow(10, thresholdDb / 20)

        const splitPoints: number[] = []
        let inSilence = false
        let silenceStart = 0

        for (let i = 0; i < channelData.length; i += windowSize) {
            let sum = 0
            const end = Math.min(i + windowSize, channelData.length)
            const count = end - i
            for (let j = i; j < end; j++) {
                sum += channelData[j] * channelData[j]
            }
            const rms = Math.sqrt(sum / count)
            const timeSec = i / sampleRate

            if (rms < thresholdLinear) {
                if (!inSilence) {
                    inSilence = true
                    silenceStart = timeSec
                }
            } else {
                if (inSilence) {
                    inSilence = false
                    const silenceDuration = timeSec - silenceStart
                    if (silenceDuration >= minSilenceDurationSec) {
                        const splitStart = Math.max(0, silenceStart + paddingSec)
                        const splitEnd = Math.max(splitStart, timeSec - paddingSec)
                        splitPoints.push(Number(splitStart.toFixed(3)))
                        splitPoints.push(Number(splitEnd.toFixed(3)))
                    }
                }
            }
        }

        // Handle silence at the end of the file
        if (inSilence) {
            const totalDuration = channelData.length / sampleRate
            if (totalDuration - silenceStart >= minSilenceDurationSec) {
                splitPoints.push(Number((silenceStart + paddingSec).toFixed(3)))
            }
        }

        const uniqueSorted = Array.from(new Set(splitPoints)).sort((a, b) => a - b)
        debug('SilenceDetection', `Detected ${uniqueSorted.length} split markers from silence analysis`)
        return uniqueSorted
    } finally {
        await audioContext.close().catch(() => {})
    }
}
