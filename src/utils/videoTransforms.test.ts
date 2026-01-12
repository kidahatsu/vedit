import { describe, it, expect } from 'vitest'
import {
    buildVideoTransformStyle,
    calculateCropBoxStyle,
    hasCropApplied,
    hasTransformsApplied,
} from './videoTransforms'
import { DEFAULT_TRANSFORM, type TransformState } from '../store/editorStore'

describe('buildVideoTransformStyle', () => {
    it('returns empty object for default transform', () => {
        expect(buildVideoTransformStyle(DEFAULT_TRANSFORM)).toEqual({})
    })

    it('applies rotation', () => {
        const transform = { ...DEFAULT_TRANSFORM, rotation: 90 as const }
        expect(buildVideoTransformStyle(transform)).toEqual({
            transform: 'rotate(90deg)',
        })
    })

    it('applies horizontal flip', () => {
        const transform = { ...DEFAULT_TRANSFORM, flipH: true }
        expect(buildVideoTransformStyle(transform)).toEqual({
            transform: 'scaleX(-1)',
        })
    })

    it('applies vertical flip', () => {
        const transform = { ...DEFAULT_TRANSFORM, flipV: true }
        expect(buildVideoTransformStyle(transform)).toEqual({
            transform: 'scaleY(-1)',
        })
    })

    it('combines multiple transforms', () => {
        const transform: TransformState = {
            ...DEFAULT_TRANSFORM,
            rotation: 180,
            flipH: true,
            flipV: true,
        }
        expect(buildVideoTransformStyle(transform)).toEqual({
            transform: 'rotate(180deg) scaleX(-1) scaleY(-1)',
        })
    })
})

describe('calculateCropBoxStyle', () => {
    it('returns full frame for default transform', () => {
        expect(calculateCropBoxStyle(DEFAULT_TRANSFORM)).toEqual({
            left: '0%',
            top: '0%',
            width: '100%',
            height: '100%',
        })
    })

    it('calculates percentage values from normalized crop', () => {
        const transform: TransformState = {
            ...DEFAULT_TRANSFORM,
            cropX: 0.1,
            cropY: 0.2,
            cropWidth: 0.5,
            cropHeight: 0.6,
        }
        expect(calculateCropBoxStyle(transform)).toEqual({
            left: '10%',
            top: '20%',
            width: '50%',
            height: '60%',
        })
    })
})

describe('hasCropApplied', () => {
    it('returns false for default (full frame)', () => {
        expect(hasCropApplied(DEFAULT_TRANSFORM)).toBe(false)
    })

    it('returns true when cropX is non-zero', () => {
        expect(hasCropApplied({ ...DEFAULT_TRANSFORM, cropX: 0.1 })).toBe(true)
    })

    it('returns true when cropY is non-zero', () => {
        expect(hasCropApplied({ ...DEFAULT_TRANSFORM, cropY: 0.1 })).toBe(true)
    })

    it('returns true when cropWidth is less than 1', () => {
        expect(hasCropApplied({ ...DEFAULT_TRANSFORM, cropWidth: 0.8 })).toBe(true)
    })

    it('returns true when cropHeight is less than 1', () => {
        expect(hasCropApplied({ ...DEFAULT_TRANSFORM, cropHeight: 0.8 })).toBe(true)
    })
})

describe('hasTransformsApplied', () => {
    it('returns false for default transform', () => {
        expect(hasTransformsApplied(DEFAULT_TRANSFORM)).toBe(false)
    })

    it('returns true for non-original aspect ratio', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, aspectRatio: '16:9' })).toBe(true)
    })

    it('returns true for rotation', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, rotation: 90 })).toBe(true)
    })

    it('returns true for flipH', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, flipH: true })).toBe(true)
    })

    it('returns true for flipV', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, flipV: true })).toBe(true)
    })

    it('returns true for speed change', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, speed: 2 })).toBe(true)
    })

    it('returns true for crop', () => {
        expect(hasTransformsApplied({ ...DEFAULT_TRANSFORM, cropWidth: 0.5 })).toBe(true)
    })
})
