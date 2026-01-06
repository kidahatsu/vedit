import { useCallback, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { formatTime, clamp } from '../../lib/utils'
import styles from './Timeline.module.css'

interface TimelineProps {
    onSeekPreview?: (time: number) => void
}

export function Timeline({ onSeekPreview }: TimelineProps) {
    const {
        clips, selectedClipId, selectClip, updateClipTrim,
        removeSplitPoint, addSplitPoint, splitMode, toggleSplitMode
    } = useEditorStore()
    const selectedClip = clips.find((c) => c.id === selectedClipId)

    const [_dragging, setDragging] = useState<'left' | 'right' | null>(null)
    const [hoverTime, setHoverTime] = useState<number | null>(null)
    const [hoverPercent, setHoverPercent] = useState<number | null>(null)
    const clipRef = useRef<HTMLDivElement>(null)

    const handleTrimDrag = useCallback(
        (e: React.MouseEvent, handle: 'left' | 'right') => {
            e.stopPropagation()
            if (!selectedClip || !clipRef.current) return

            setDragging(handle)
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
                setDragging(null)
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        },
        [selectedClip, updateClipTrim]
    )

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

        // Preview the frame in video player
        if (onSeekPreview && time >= clip.trimStart && time <= clip.trimEnd) {
            onSeekPreview(time)
        }
    }, [splitMode, selectedClipId, onSeekPreview])

    const handleClipMouseLeave = useCallback(() => {
        setHoverTime(null)
        setHoverPercent(null)
    }, [])

    const handleClipClick = useCallback((_e: React.MouseEvent<HTMLDivElement>, clip: typeof selectedClip) => {
        if (!clip) return

        // In split mode on the selected clip with valid hover position
        if (splitMode && clip.id === selectedClipId && hoverTime !== null) {
            // Only add split if within trim range
            if (hoverTime > clip.trimStart && hoverTime < clip.trimEnd) {
                addSplitPoint(clip.id, hoverTime)
            }
        } else {
            // Select the clip (works in both split mode and normal mode)
            selectClip(clip.id)
        }
    }, [splitMode, selectedClipId, hoverTime, addSplitPoint, selectClip])

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
                                            const splitPercent = (splitTime / clip.duration) * 100
                                            return (
                                                <div
                                                    key={splitTime}
                                                    className={styles.splitMarker}
                                                    style={{ left: `${splitPercent}%` }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        removeSplitPoint(clip.id, splitTime)
                                                    }}
                                                    title={`Split at ${formatTime(splitTime)} (click to remove)`}
                                                />
                                            )
                                        })}

                                        {/* Hover cursor in split mode */}
                                        {splitMode && hoverPercent !== null && hoverTime !== null && (
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


