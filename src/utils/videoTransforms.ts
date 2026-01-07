/**
 * @fileoverview Video transform utilities for CSS styling and state calculations.
 * Pure functions extracted from VideoPlayer for testability and reuse.
 */

import type { CSSProperties } from 'react'
import type { TransformState } from '../store/editorStore'

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
 * Builds CSS transform string from clip transform state.
 * Combines rotation and flip transformations.
 *
 * @param transform - Transform configuration from the clip
 * @returns CSS properties object with transform string, or empty object if no transforms
 *
 * @example
 * ```ts
 * const style = buildVideoTransformStyle({ rotation: 90, flipH: true, flipV: false, ... })
 * // Returns: { transform: 'rotate(90deg) scaleX(-1)' }
 * ```
 */
export function buildVideoTransformStyle(transform: TransformState): CSSProperties {
    const transforms: string[] = []

    if (transform.rotation !== 0) {
        transforms.push(`rotate(${transform.rotation}deg)`)
    }
    if (transform.flipH) {
        transforms.push('scaleX(-1)')
    }
    if (transform.flipV) {
        transforms.push('scaleY(-1)')
    }

    return transforms.length > 0 ? { transform: transforms.join(' ') } : {}
}

/**
 * Calculates crop box position as CSS percentage values.
 * Used for positioning the crop overlay on the video player.
 *
 * @param transform - Transform state containing normalized crop values (0-1)
 * @returns CSS positioning object with percentage strings
 *
 * @example
 * ```ts
 * const style = calculateCropBoxStyle({ cropX: 0.1, cropY: 0.2, cropWidth: 0.5, cropHeight: 0.6, ... })
 * // Returns: { left: '10%', top: '20%', width: '50%', height: '60%' }
 * ```
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
 * Used to show crop preview indicator when crop mode is off.
 *
 * @param transform - Transform state to check
 * @returns True if any crop value differs from default (full frame)
 *
 * @example
 * ```ts
 * hasCropApplied({ cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, ... }) // false
 * hasCropApplied({ cropX: 0.1, cropY: 0, cropWidth: 0.8, cropHeight: 1, ... }) // true
 * ```
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
 * Checks if any transforms (rotation, flip, speed change) are applied.
 * Used to determine if transformVideo should be called instead of simpler trimVideo.
 *
 * @param transform - Transform state to check
 * @returns True if any non-default transform is applied
 */
export function hasTransformsApplied(transform: TransformState): boolean {
    return (
        transform.aspectRatio !== 'original' ||
        transform.rotation !== 0 ||
        transform.flipH ||
        transform.flipV ||
        transform.speed !== 1 ||
        hasCropApplied(transform)
    )
}
