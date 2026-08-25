/**
 * @fileoverview Video transform utilities for CSS styling and state calculations.
 * Pure functions extracted from VideoPlayer for testability and reuse.
 */

import type { CSSProperties } from 'react'
import type { TransformState, AspectRatioPreset } from '../store/types'
import { ASPECT_RATIO_DIMENSIONS } from '../store/types'

/**
 * Normalized crop coordinates (0..1).
 */
export interface NormalizedCrop {
    cropX: number
    cropY: number
    cropWidth: number
    cropHeight: number
}

/**
 * CSS positioning object for crop box overlay.
 */
export interface CropBoxStyle {
    left: string
    top: string
    width: string
    height: string
}

/**
 * Calculates normalized (0..1) crop rectangle to fit a target aspect ratio on a source video.
 * Centers the crop box cleanly on the source video.
 */
export function calculateAspectRatioCrop(
    sourceWidth: number,
    sourceHeight: number,
    aspectRatio: AspectRatioPreset
): NormalizedCrop {
    if (aspectRatio === 'original' || sourceWidth <= 0 || sourceHeight <= 0) {
        return { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 }
    }

    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio]
    if (!dims) {
        return { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 }
    }

    const targetRatio = dims.width / dims.height
    const sourceRatio = sourceWidth / sourceHeight

    let cropWidth = 1
    let cropHeight = 1
    let cropX = 0
    let cropY = 0

    if (sourceRatio > targetRatio) {
        // Video is wider than target ratio (e.g. 16:9 video -> 9:16 or 1:1 target)
        // Keep full height, crop horizontal width
        cropWidth = targetRatio / sourceRatio
        cropHeight = 1
        cropX = (1 - cropWidth) / 2
        cropY = 0
    } else if (sourceRatio < targetRatio) {
        // Video is taller than target ratio (e.g. 9:16 video -> 16:9 target)
        // Keep full width, crop vertical height
        cropWidth = 1
        cropHeight = sourceRatio / targetRatio
        cropX = 0
        cropY = (1 - cropHeight) / 2
    }

    return {
        cropX: Math.max(0, Math.min(1, Number(cropX.toFixed(4)))),
        cropY: Math.max(0, Math.min(1, Number(cropY.toFixed(4)))),
        cropWidth: Math.max(0.05, Math.min(1, Number(cropWidth.toFixed(4)))),
        cropHeight: Math.max(0.05, Math.min(1, Number(cropHeight.toFixed(4)))),
    }
}

/**
 * Builds CSS transform and filter styles from clip transform state.
 * Combines rotation, flip, brightness, contrast, and saturation.
 *
 * @param transform - Transform configuration from the clip
 * @returns CSS properties object with transform and filter strings
 */
export function buildVideoTransformStyle(transform: TransformState): CSSProperties {
    const transforms: string[] = []
    const filters: string[] = []

    if (transform.rotation !== 0) {
        transforms.push(`rotate(${transform.rotation}deg)`)
    }
    if (transform.flipH) {
        transforms.push('scaleX(-1)')
    }
    if (transform.flipV) {
        transforms.push('scaleY(-1)')
    }

    if (transform.brightness !== undefined && transform.brightness !== 0) {
        filters.push(`brightness(${Math.max(0, 1 + transform.brightness)})`)
    }
    if (transform.contrast !== undefined && transform.contrast !== 1) {
        filters.push(`contrast(${Math.max(0, transform.contrast)})`)
    }
    if (transform.saturation !== undefined && transform.saturation !== 1) {
        filters.push(`saturate(${Math.max(0, transform.saturation)})`)
    }

    const style: CSSProperties = {}
    if (transforms.length > 0) {
        style.transform = transforms.join(' ')
    }
    if (filters.length > 0) {
        style.filter = filters.join(' ')
    }
    return style
}

/**
 * Calculates crop box position as CSS percentage values.
 * Used for positioning the crop overlay on the video player.
 */
export function calculateCropBoxStyle(transform: TransformState): CropBoxStyle {
    return {
        left: `${transform.cropX * 100}%`,
        top: `${transform.cropY * 100}%`,
        width: `${transform.cropWidth * 100}%`,
        height: `${transform.cropHeight * 100}%`,
    }
}

/**
 * Checks if a non-default crop is applied (not full frame).
 */
export function hasCropApplied(transform: TransformState): boolean {
    return (
        transform.cropX !== 0 ||
        transform.cropY !== 0 ||
        transform.cropWidth !== 1 ||
        transform.cropHeight !== 1
    )
}

/**
 * Checks if any transforms (rotation, flip, speed, color, audio) are applied.
 */
export function hasTransformsApplied(transform: TransformState): boolean {
    return (
        transform.aspectRatio !== 'original' ||
        transform.rotation !== 0 ||
        transform.flipH ||
        transform.flipV ||
        transform.speed !== 1 ||
        transform.volume !== 100 ||
        transform.muted ||
        transform.fadeIn !== 0 ||
        transform.fadeOut !== 0 ||
        (transform.brightness !== undefined && transform.brightness !== 0) ||
        (transform.contrast !== undefined && transform.contrast !== 1) ||
        (transform.saturation !== undefined && transform.saturation !== 1) ||
        hasCropApplied(transform)
    )
}
