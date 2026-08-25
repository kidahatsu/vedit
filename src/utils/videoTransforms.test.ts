import { describe, it, expect } from 'vitest'
import {
    buildVideoTransformStyle,
    calculateCropBoxStyle,
    hasCropApplied,
    hasTransformsApplied,
    calculateAspectRatioCrop,
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

describe('calculateAspectRatioCrop', () => {
    it('returns full frame for original aspect ratio', () => {
        expect(calculateAspectRatioCrop(1920, 1080, 'original')).toEqual({
            cropX: 0,
            cropY: 0,
            cropWidth: 1,
            cropHeight: 1,
        })
    })

    it('returns full frame when video matches target aspect ratio', () => {
        expect(calculateAspectRatioCrop(1920, 1080, '16:9')).toEqual({
            cropX: 0,
            cropY: 0,
            cropWidth: 1,
            cropHeight: 1,
        })
    })

    it('calculates accurate centered 9:16 crop on 16:9 video', () => {
        const crop = calculateAspectRatioCrop(1920, 1080, '9:16')
        expect(crop.cropHeight).toBe(1)
        expect(crop.cropWidth).toBeCloseTo(0.3164, 3)
        expect(crop.cropX).toBeCloseTo(0.3418, 3)
        expect(crop.cropY).toBe(0)
    })

    it('calculates accurate centered 1:1 square crop on 16:9 video', () => {
        const crop = calculateAspectRatioCrop(1920, 1080, '1:1')
        expect(crop.cropHeight).toBe(1)
        expect(crop.cropWidth).toBeCloseTo(0.5625, 3)
        expect(crop.cropX).toBeCloseTo(0.2188, 3)
        expect(crop.cropY).toBe(0)
    })

    it('calculates accurate centered 4:5 social crop on 16:9 video', () => {
        const crop = calculateAspectRatioCrop(1920, 1080, '4:5')
        expect(crop.cropHeight).toBe(1)
        expect(crop.cropWidth).toBeCloseTo(0.45, 2)
        expect(crop.cropX).toBeCloseTo(0.275, 2)
        expect(crop.cropY).toBe(0)
    })

    it('calculates accurate centered 16:9 landscape crop on 9:16 portrait video', () => {
        const crop = calculateAspectRatioCrop(1080, 1920, '16:9')
        expect(crop.cropWidth).toBe(1)
        expect(crop.cropHeight).toBeCloseTo(0.3164, 3)
        expect(crop.cropX).toBe(0)
        expect(crop.cropY).toBeCloseTo(0.3418, 3)
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
