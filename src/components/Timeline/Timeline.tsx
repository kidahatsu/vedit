import { useCallback, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime, clamp } from '../../lib/utils'
import styles from './Timeline.module.css'

/** Minimum interval between seek preview updates (ms) */
const SEEK_PREVIEW_THROTTLE_MS = 100

export function Timeline() {
    const {
        clips, selectedClipId, selectClip, updateClipTrim,
        removeSplitPoint, addSplitPoint, updateSplitPoint, splitMode, toggleSplitMode,
        setSeekPreviewTime
    } = useEditorStore()
    const selectedClip = useSelectedClip()

    const [hoverTime, setHoverTime] = useState<number | null>(null)
    const [hoverPercent, setHoverPercent] = useState<number | null>(null)
    // Split marker drag state
    const [draggingSplitTime, setDraggingSplitTime] = useState<number | null>(null)
    const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null)
    const clipRef = useRef<HTMLDivElement>(null)

    // Throttle ref for seek preview
    const lastSeekTimeRef = useRef<number>(0)

    const handleTrimDrag = useCallback(
        (e: React.MouseEvent, handle: 'left' | 'right') => {
            e.stopPropagation()
            if (!selectedClip || !clipRef.current) return

            const clipRect = clipRef.current.getBoundingClientRect()
            const duration = selectedClip.duration

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const x = moveEvent.clientX - clipRect.left
                const percent = clamp(x / clipRect.width, 0, 1)
                const time = percent * duration

                if (handle === 'left') {
                    const newStart = clamp(time, 0, selectedClip.trimEnd - 0.1)
                    updateClipTrim(selectedClip.id, newStart, selectedClip.trimEnd)
                } else {
                    const newEnd = clamp(time, selectedClip.trimStart + 0.1, duration)
                    updateClipTrim(selectedClip.id, selectedClip.trimStart, newEnd)
                }
            }

            const handleMouseUp = () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        },
        [selectedClip, updateClipTrim]
    )

    /**
     * Throttled seek preview update.
     * Limits calls to once per SEEK_PREVIEW_THROTTLE_MS to prevent excessive renders.
     */
    const throttledSeekPreview = useCallback((time: number) => {
        const now = Date.now()
        if (now - lastSeekTimeRef.current >= SEEK_PREVIEW_THROTTLE_MS) {
            setSeekPreviewTime(time)
            lastSeekTimeRef.current = now
        }
    }, [setSeekPreviewTime])

    const handleClipMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, clip: typeof selectedClip) => {
        // Only track hover for split mode on the selected clip
        if (!clip || !splitMode || clip.id !== selectedClipId) {
            setHoverTime(null)
            setHoverPercent(null)
            return
        }

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = clamp(x / rect.width, 0, 1)
        const time = percent * clip.duration

        setHoverPercent(percent * 100)
        setHoverTime(time)

        // Preview the frame in video player (throttled)
        if (time >= clip.trimStart && time <= clip.trimEnd) {
            throttledSeekPreview(time)
        }
    }, [splitMode, selectedClipId, throttledSeekPreview])

    const handleClipMouseLeave = useCallback(() => {
        setHoverTime(null)
        setHoverPercent(null)
    }, [])

    // Split marker drag handlers
    const handleSplitMarkerDragStart = useCallback((e: React.MouseEvent, splitTime: number, clip: typeof selectedClip) => {
        e.stopPropagation()
        e.preventDefault()
        if (!clip || !clipRef.current) return

        setDraggingSplitTime(splitTime)
        setDragPreviewTime(splitTime)

        const clipRect = clipRef.current.getBoundingClientRect()
        const duration = clip.duration

        // Track the last calculated time for use in mouseup
        let lastClampedTime = splitTime

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const x = moveEvent.clientX - clipRect.left
            const percent = clamp(x / clipRect.width, 0, 1)
            const time = percent * duration
            // Clamp within trim range
            lastClampedTime = clamp(time, clip.trimStart + 0.01, clip.trimEnd - 0.01)
            setDragPreviewTime(lastClampedTime)

            // Live video preview while dragging
            useEditorStore.getState().setSeekPreviewTime(lastClampedTime)
        }

        const handleMouseUp = () => {
            const finalTime = lastClampedTime

            // Update the split point position
            updateSplitPoint(clip.id, splitTime, finalTime)

            // Reset drag state first
            setDraggingSplitTime(null)
            setDragPreviewTime(null)

            // Trigger video preview at final position AFTER state updates
            // Use requestAnimationFrame to ensure React has processed state updates
            requestAnimationFrame(() => {
                useEditorStore.getState().setSeekPreviewTime(finalTime)
            })

            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }, [updateSplitPoint])

    const handleClipClick = useCallback((_e: React.MouseEvent<HTMLDivElement>, clip: typeof selectedClip) => {
        if (!clip) return

        // In split mode on the selected clip with valid hover position
        if (splitMode && clip.id === selectedClipId && hoverTime !== null) {
            // Only add split if within trim range
            if (hoverTime > clip.trimStart && hoverTime < clip.trimEnd) {
                addSplitPoint(clip.id, hoverTime)
                // Trigger video preview at the split position
                setSeekPreviewTime(hoverTime)
            }
        } else {
            // Select the clip (works in both split mode and normal mode)
            selectClip(clip.id)
        }
    }, [splitMode, selectedClipId, hoverTime, addSplitPoint, selectClip, setSeekPreviewTime])

    if (clips.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.timeline}>
                    <div className={styles.empty}>Import clips to start editing</div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.timeline}>
                <div className={styles.track}>
                    {clips.map((clip) => {
                        const isSelected = clip.id === selectedClipId
                        const trimStartPercent = (clip.trimStart / clip.duration) * 100
                        const trimEndPercent = 100 - (clip.trimEnd / clip.duration) * 100

                        return (
                            <div
                                key={clip.id}
                                ref={isSelected ? clipRef : undefined}
                                className={`${styles.clip} ${isSelected ? styles.clipSelected : ''} ${splitMode && isSelected ? styles.clipSplitMode : ''}`}
                                onClick={(e) => handleClipClick(e, clip)}
                                onMouseMove={(e) => handleClipMouseMove(e, clip)}
                                onMouseLeave={handleClipMouseLeave}
                            >
                                {clip.thumbnailUrl && (
                                    <img
                                        src={clip.thumbnailUrl}
                                        alt={clip.name}
                                        className={styles.clipThumbnail}
                                    />
                                )}
                                <div className={styles.clipName}>{clip.name}</div>

                                {isSelected && (
                                    <>
                                        <div
                                            className={styles.trimOverlay}
                                            style={{
                                                left: 0,
                                                width: `${trimStartPercent}%`
                                            }}
                                        />
                                        <div
                                            className={styles.trimOverlay}
                                            style={{
                                                right: 0,
                                                width: `${trimEndPercent}%`
                                            }}
                                        />
                                        <div
                                            className={`${styles.trimHandle} ${styles.trimHandleLeft}`}
                                            style={{ left: `${trimStartPercent}%` }}
                                            onMouseDown={(e) => handleTrimDrag(e, 'left')}
                                        />
                                        <div
                                            className={`${styles.trimHandle} ${styles.trimHandleRight}`}
                                            style={{ right: `${trimEndPercent}%` }}
                                            onMouseDown={(e) => handleTrimDrag(e, 'right')}
                                        />

                                        {/* Split markers */}
                                        {clip.splitPoints.map((splitTime) => {
                                            const isDragging = draggingSplitTime === splitTime
                                            const displayTime = isDragging && dragPreviewTime !== null ? dragPreviewTime : splitTime
                                            const splitPercent = (displayTime / clip.duration) * 100
                                            return (
                                                <div
                                                    key={splitTime}
                                                    className={`${styles.splitMarker} ${isDragging ? styles.splitMarkerDragging : ''}`}
                                                    style={{ left: `${splitPercent}%` }}
                                                    onMouseDown={(e) => handleSplitMarkerDragStart(e, splitTime, clip)}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation()
                                                        removeSplitPoint(clip.id, splitTime)
                                                    }}
                                                    title={`Split at ${formatTime(displayTime)} (drag to move, double-click to remove)`}
                                                >
                                                    {isDragging && (
                                                        <span className={styles.splitCursorTime}>
                                                            {formatTime(displayTime)}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {/* Hover cursor in split mode */}
                                        {splitMode && hoverPercent !== null && hoverTime !== null && !draggingSplitTime && (
                                            <div
                                                className={styles.splitCursor}
                                                style={{ left: `${hoverPercent}%` }}
                                            >
                                                <span className={styles.splitCursorTime}>
                                                    {formatTime(hoverTime)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>

                {selectedClip && (
                    <div className={styles.timecodes}>
                        <span className={styles.timecode}>In: {formatTime(selectedClip.trimStart)}</span>
                        <span className={styles.timecode}>
                            Duration: {formatTime(selectedClip.trimEnd - selectedClip.trimStart)}
                        </span>
                        <span className={styles.timecode}>Out: {formatTime(selectedClip.trimEnd)}</span>
                    </div>
                )}
            </div>

            {selectedClip && (
                <div className={styles.trimInfo}>
                    <button
                        className={`${styles.splitModeBtn} ${splitMode ? styles.splitModeBtnActive : ''}`}
                        onClick={toggleSplitMode}
                        title={splitMode ? 'Exit split mode' : 'Enter split mode (click timeline to add splits)'}
                    >
                        ✂️ {splitMode ? 'Exit Split Mode' : 'Add Splits'}
                    </button>

                    <span className={styles.trimInfoText}>
                        Trim: <span className={styles.trimBadge}>{formatTime(selectedClip.trimStart)}</span>
                        → <span className={styles.trimBadge}>{formatTime(selectedClip.trimEnd)}</span>
                        {selectedClip.splitPoints.length > 0 && (
                            <> | Splits: <span className={styles.splitBadge}>{selectedClip.splitPoints.length}</span></>
                        )}
                    </span>
                </div>
            )}
        </div>
    )
}


