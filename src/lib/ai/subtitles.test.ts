import { describe, it, expect } from 'vitest'
import { formatSRTTime, formatVTTTime, formatAsSRT, formatAsVTT, type SubtitleCue } from './subtitles'

describe('AI Subtitles Formatter', () => {
    it('formats timestamp correctly to SRT time', () => {
        expect(formatSRTTime(0)).toBe('00:00:00,000')
        expect(formatSRTTime(65.432)).toBe('00:01:05,432')
        expect(formatSRTTime(3661.05)).toBe('01:01:01,050')
    })

    it('formats timestamp correctly to WebVTT time', () => {
        expect(formatVTTTime(0)).toBe('00:00:00.000')
        expect(formatVTTTime(65.432)).toBe('00:01:05.432')
    })

    it('formats SubtitleCue array to valid SubRip text', () => {
        const cues: SubtitleCue[] = [
            { start: 0.5, end: 2.5, text: 'Hello, welcome to VEdit!' },
            { start: 3.0, end: 5.2, text: 'Next-gen video editing in browser.' },
        ]

        const srt = formatAsSRT(cues)
        expect(srt).toContain('1\n00:00:00,500 --> 00:00:02,500\nHello, welcome to VEdit!')
        expect(srt).toContain('2\n00:00:03,000 --> 00:00:05,200\nNext-gen video editing in browser.')
    })

    it('formats SubtitleCue array to valid WebVTT text', () => {
        const cues: SubtitleCue[] = [
            { start: 1.0, end: 3.0, text: 'Testing WebVTT format' },
        ]

        const vtt = formatAsVTT(cues)
        expect(vtt.startsWith('WEBVTT')).toBe(true)
        expect(vtt).toContain('1\n00:00:01.000 --> 00:00:03.000\nTesting WebVTT format')
    })
})
