import { describe, it, expect } from 'vitest'
import { formatTime, formatFFmpegTime, parseTime, generateId, clamp } from './utils'

describe('formatTime', () => {
    it('formats seconds to MM:SS', () => {
        expect(formatTime(0)).toBe('00:00')
        expect(formatTime(65)).toBe('01:05')
        expect(formatTime(599)).toBe('09:59')
    })

    it('formats to HH:MM:SS when >= 1 hour', () => {
        expect(formatTime(3600)).toBe('01:00:00')
        expect(formatTime(3665)).toBe('01:01:05')
        expect(formatTime(7325)).toBe('02:02:05')
    })

    it('handles edge cases', () => {
        expect(formatTime(-1)).toBe('00:00')
        expect(formatTime(NaN)).toBe('00:00')
        expect(formatTime(Infinity)).toBe('00:00')
    })
})

describe('formatFFmpegTime', () => {
    it('formats to HH:MM:SS.mmm', () => {
        expect(formatFFmpegTime(0)).toBe('00:00:00.000')
        expect(formatFFmpegTime(65.123)).toBe('00:01:05.123')
        expect(formatFFmpegTime(3665.5)).toBe('01:01:05.500')
    })

    it('handles edge cases', () => {
        expect(formatFFmpegTime(-1)).toBe('00:00:00.000')
        expect(formatFFmpegTime(NaN)).toBe('00:00:00.000')
    })
})

describe('parseTime', () => {
    it('parses MM:SS format', () => {
        expect(parseTime('01:05')).toBe(65)
        expect(parseTime('00:30')).toBe(30)
    })

    it('parses HH:MM:SS format', () => {
        expect(parseTime('01:01:05')).toBe(3665)
        expect(parseTime('02:00:00')).toBe(7200)
    })

    it('returns 0 for invalid format', () => {
        expect(parseTime('invalid')).toBe(0)
        expect(parseTime('')).toBe(0)
    })
})

describe('generateId', () => {
    it('generates unique IDs', () => {
        const id1 = generateId()
        const id2 = generateId()
        expect(id1).not.toBe(id2)
    })

    it('includes timestamp component', () => {
        const id = generateId()
        expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
})

describe('clamp', () => {
    it('clamps values within range', () => {
        expect(clamp(5, 0, 10)).toBe(5)
        expect(clamp(-5, 0, 10)).toBe(0)
        expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles edge cases', () => {
        expect(clamp(0, 0, 0)).toBe(0)
        expect(clamp(5, 5, 5)).toBe(5)
    })
})
