/**
 * @fileoverview Skeleton loading components for loading states.
 */

import styles from './Skeleton.module.css'

interface SkeletonBoxProps {
    width?: string | number
    height?: string | number
    borderRadius?: string
    className?: string
}

/**
 * Animated skeleton box for loading placeholders.
 */
export function SkeletonBox({
    width = '100%',
    height = '100%',
    borderRadius = 'var(--radius-md)',
    className = ''
}: SkeletonBoxProps) {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius,
            }}
            aria-hidden="true"
        />
    )
}

interface SkeletonTextProps {
    lines?: number
    className?: string
}

/**
 * Animated skeleton for text placeholders.
 */
export function SkeletonText({ lines = 1, className = '' }: SkeletonTextProps) {
    return (
        <div className={`${styles.skeletonText} ${className}`} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={styles.skeletonLine}
                    style={{
                        width: i === lines - 1 && lines > 1 ? '60%' : '100%'
                    }}
                />
            ))}
        </div>
    )
}

/**
 * Skeleton for clip card in the clips panel.
 */
export function SkeletonClipCard() {
    return (
        <div className={styles.skeletonClip} aria-hidden="true">
            <div className={styles.skeletonThumb} />
            <div className={styles.skeletonInfo}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonDuration} />
            </div>
        </div>
    )
}

/**
 * Skeleton for video player while loading.
 */
export function SkeletonVideoPlayer() {
    return (
        <div className={styles.skeletonPlayer} aria-hidden="true">
            <div className={styles.skeletonPlayButton} />
        </div>
    )
}
