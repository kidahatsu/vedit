import { describe, it, expect } from 'vitest'
import { buildAudioFilterChain, type TransformOptions } from './ffmpeg'

describe('buildAudioFilterChain', () => {
    it('returns empty array when no audio transforms', () => {
        const transform: TransformOptions = {
            volume: 100,
            muted: false,
            fadeIn: 0,
            fadeOut: 0
        }
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual([])
    })

    it('returns mute filter when muted', () => {
        const transform: TransformOptions = { muted: true }
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual(['volume=0'])
    })

    it('returns volume filter when volume changed', () => {
        const transform: TransformOptions = { volume: 50 }
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual(['volume=0.5'])
    })

    it('returns fade in filter', () => {
        const transform: TransformOptions = { fadeIn: 2 }
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual(['afade=t=in:st=0:d=2'])
    })

    it('returns fade out filter correctly calculated', () => {
        const transform: TransformOptions = { fadeOut: 2 }
        // Duration 10s, fade out 2s -> starts at 8s
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual(['afade=t=out:st=8.000:d=2'])
    })

    it('combines multiple filters', () => {
        const transform: TransformOptions = {
            volume: 150,
            fadeIn: 1,
            fadeOut: 1
        }
        const filters = buildAudioFilterChain(transform, 10)
        expect(filters).toEqual([
            'volume=1.5',
            'afade=t=in:st=0:d=1',
            'afade=t=out:st=9.000:d=1'
        ])
    })

    it('handles speed interaction for fades (passed duration should be pre-adjusted)', () => {
        // transformVideo logic calculates adjusted duration before passing to buildAudioFilterChain
        // so we just test that the function uses the passed duration
        const transform: TransformOptions = {
            speed: 2, // 2x speed
            fadeOut: 1
        }
        const adjustedDuration = 5 // 10s / 2 = 5s
        const filters = buildAudioFilterChain(transform, adjustedDuration)

        // Should have atempo and fade out based on 5s duration
        expect(filters).toEqual([
            'atempo=2',
            'afade=t=out:st=4.000:d=1'
        ])
    })
})
