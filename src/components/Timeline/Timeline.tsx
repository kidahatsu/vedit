import { useCallback, useRef, useState, useMemo } from 'react'
import {
    Scissors,
    Split,
    Link,
    RotateCcw,
    Image,
    Film
} from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip, useCanMerge, useCanSplit, useSelectedClipHasModifications } from '../../store/selectors'
import { useExportStore } from '../../store/exportStore'
import { isGPUExportSupported, exportVideoWithWebGPU } from '../../lib/webgpu/gpuExport'
import { trimVideo, mergeVideos, splitVideo, transformVideo, extractFrame } from '../../lib/ffmpeg'
import { hasTransformsApplied } from '../../utils/videoTransforms'
import { sanitizeFilename } from '../../utils/validation'
import { type ExportPreset } from '../../store/exportPresets'
import { type ExportMode } from '../../App'
import { formatTime, clamp } from '../../lib/utils'
import styles from './Timeline.module.css'

const SEEK_PREVIEW_THROTTLE_MS = 100

interface TimelineProps {
    onOpenExportModal?: (mode: ExportMode, onExport: (preset: ExportPreset) => void) => void
}

export function Timeline({ onOpenExportModal }: TimelineProps) {
    const clips = useEditorStore((state) => state.clips)
    const selectedClipId = useEditorStore((state) => state.selectedClipId)
    const selectClip = useEditorStore((state) => state.selectClip)
    const updateClipTrim = useEditorStore((state) => state.updateClipTrim)
    const removeSplitPoint = useEditorStore((state) => state.removeSplitPoint)
    const addSplitPoint = useEditorStore((state) => state.addSplitPoint)
    const updateSplitPoint = useEditorStore((state) => state.updateSplitPoint)
    const splitMode = useEditorStore((state) => state.splitMode)
    const toggleSplitMode = useEditorStore((state) => state.toggleSplitMode)
    const setSeekPreviewTime = useEditorStore((state) => state.setSeekPreviewTime)
    const revertClip = useEditorStore((state) => state.revertClip)
    const setLoading = useEditorStore((state) => state.setLoading)
    const { startExport, setProcessing, setComplete, setError } = useExportStore()

    const selectedClip = useSelectedClip()
    const canMerge = useCanMerge()
    const canSplit = useCanSplit()
    const selectedClipHasModifications = useSelectedClipHasModifications()

    const [hoverTime, setHoverTime] = useState<number | null>(null)
    const [hoverPercent, setHoverPercent] = useState<number | null>(null)
    const [draggingSplitTime, setDraggingSplitTime] = useState<number | null>(null)
    const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null)
    const [draggingTrim, setDraggingTrim] = useState<{ handle: 'left' | 'right'; time: number } | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const lastSeekTimeRef = useRef<number>(0)

    const throttledSeekPreview = useCallback((time: number) => {
        const now = Date.now()
        if (now - lastSeekTimeRef.current >= SEEK_PREVIEW_THROTTLE_MS) {
            setSeekPreviewTime(time)
            lastSeekTimeRef.current = now
        }
    }, [setSeekPreviewTime])

    // Generate timeline ruler ticks
    const rulerTicks = useMemo(() => {
        if (!selectedClip || selectedClip.duration <= 0) return []
        const duration = selectedClip.duration
        const count = Math.min(10, Math.max(4, Math.floor(duration)))
        const step = duration / count
        const ticks: { time: number; percent: number; label: string }[] = []

        for (let i = 0; i <= count; i++) {
            const time = i * step
            ticks.push({
                time,
                percent: (time / duration) * 100,
                label: formatTime(time).split('.')[0]
            })
        }
        return ticks
    }, [selectedClip])

    const handleTrimDrag = useCallback(
        (e: React.MouseEvent, handle: 'left' | 'right') => {
            e.stopPropagation()
            if (!selectedClip || !trackRef.current) return

            const trackRect = trackRef.current.getBoundingClientRect()
            const duration = selectedClip.duration
            let lastTime = handle === 'left' ? selectedClip.trimStart : selectedClip.trimEnd

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const x = moveEvent.clientX - trackRect.left
                const percent = clamp(x / trackRect.width, 0, 1)
                const time = percent * duration

                if (handle === 'left') {
                    lastTime = clamp(time, 0, selectedClip.trimEnd - 0.1)
                    setDraggingTrim({ handle: 'left', time: lastTime })
                    throttledSeekPreview(lastTime)
                } else {
                    lastTime = clamp(time, selectedClip.trimStart + 0.1, duration)
                    setDraggingTrim({ handle: 'right', time: lastTime })
                    throttledSeekPreview(lastTime)
                }
            }

            const handleMouseUp = () => {
                setDraggingTrim(null)
                if (handle === 'left') {
                    updateClipTrim(selectedClip.id, lastTime, selectedClip.trimEnd)
                } else {
                    updateClipTrim(selectedClip.id, selectedClip.trimStart, lastTime)
                }
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        },
        [selectedClip, updateClipTrim, throttledSeekPreview]
    )

    const handleTrackMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!selectedClip || !splitMode) {
            setHoverTime(null)
            setHoverPercent(null)
            return
        }

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = clamp(x / rect.width, 0, 1)
        const time = percent * selectedClip.duration

        setHoverPercent(percent * 100)
        setHoverTime(time)

        if (time >= selectedClip.trimStart && time <= selectedClip.trimEnd) {
            throttledSeekPreview(time)
        }
    }, [splitMode, selectedClip, throttledSeekPreview])

    const handleTrackMouseLeave = useCallback(() => {
        setHoverTime(null)
        setHoverPercent(null)
    }, [])

    const handleSplitMarkerDragStart = useCallback((e: React.MouseEvent, splitTime: number) => {
        e.stopPropagation()
        e.preventDefault()
        if (!selectedClip || !trackRef.current) return

        setDraggingSplitTime(splitTime)
        setDragPreviewTime(splitTime)

        const trackRect = trackRef.current.getBoundingClientRect()
        const duration = selectedClip.duration
        let lastClampedTime = splitTime

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const x = moveEvent.clientX - trackRect.left
            const percent = clamp(x / trackRect.width, 0, 1)
            const time = percent * duration
            lastClampedTime = clamp(time, selectedClip.trimStart + 0.01, selectedClip.trimEnd - 0.01)
            setDragPreviewTime(lastClampedTime)
            useEditorStore.getState().setSeekPreviewTime(lastClampedTime)
        }

        const handleMouseUp = () => {
            const finalTime = lastClampedTime
            updateSplitPoint(selectedClip.id, splitTime, finalTime)
            setDraggingSplitTime(null)
            setDragPreviewTime(null)

            requestAnimationFrame(() => {
                useEditorStore.getState().setSeekPreviewTime(finalTime)
            })

            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }, [selectedClip, updateSplitPoint])

    const handleTrackClick = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
        if (!selectedClip) return

        if (splitMode && hoverTime !== null) {
            if (hoverTime > selectedClip.trimStart && hoverTime < selectedClip.trimEnd) {
                addSplitPoint(selectedClip.id, hoverTime)
                setSeekPreviewTime(hoverTime)
            }
        }
    }, [splitMode, selectedClip, hoverTime, addSplitPoint, setSeekPreviewTime])

    // Quick Toolbar Action Handlers
    const handleTrimExport = () => {
        if (!selectedClip || !onOpenExportModal) return
        onOpenExportModal('trim', async (preset: ExportPreset) => {
            try {
                startExport()
                let blob: Blob
                const needsTransform = hasTransformsApplied(selectedClip.transform) ||
                    (preset.aspectRatio !== 'original' && preset.resolution.width > 0)
                const gpuSupported = await isGPUExportSupported().catch(() => false)

                if (needsTransform) {
                    const { transform } = selectedClip
                    const aspectRatio = preset.aspectRatio !== 'original' ? preset.aspectRatio : transform.aspectRatio
                    if (gpuSupported && transform.speed === 1 && aspectRatio === 'original') {
                        blob = await exportVideoWithWebGPU({
                            file: selectedClip.file,
                            startTime: selectedClip.trimStart,
                            endTime: selectedClip.trimEnd,
                            transform: {
                                rotation: transform.rotation,
                                flipH: transform.flipH,
                                flipV: transform.flipV,
                                cropX: transform.cropX,
                                cropY: transform.cropY,
                                cropWidth: transform.cropWidth,
                                cropHeight: transform.cropHeight,
                                brightness: transform.brightness,
                                contrast: transform.contrast,
                                saturation: transform.saturation,
                            },
                            width: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                            height: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            onProgress: (progress, message) => setProcessing(progress, message),
                        }).catch(async () => {
                            return transformVideo(
                                selectedClip.file,
                                selectedClip.trimStart,
                                selectedClip.trimEnd,
                                {
                                    aspectRatio,
                                    rotation: transform.rotation,
                                    flipH: transform.flipH,
                                    flipV: transform.flipV,
                                    speed: transform.speed,
                                    crop: {
                                        x: transform.cropX,
                                        y: transform.cropY,
                                        width: transform.cropWidth,
                                        height: transform.cropHeight
                                    },
                                    brightness: transform.brightness,
                                    contrast: transform.contrast,
                                    saturation: transform.saturation,
                                    targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                    targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                                },
                                (progress, message) => setProcessing(progress, message)
                            )
                        })
                    } else {
                        blob = await transformVideo(
                            selectedClip.file,
                            selectedClip.trimStart,
                            selectedClip.trimEnd,
                            {
                                aspectRatio,
                                rotation: transform.rotation,
                                flipH: transform.flipH,
                                flipV: transform.flipV,
                                speed: transform.speed,
                                crop: {
                                    x: transform.cropX,
                                    y: transform.cropY,
                                    width: transform.cropWidth,
                                    height: transform.cropHeight
                                },
                                targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            },
                            (progress, message) => setProcessing(progress, message)
                        )
                    }
                } else {
                    blob = await trimVideo(
                        selectedClip.file,
                        selectedClip.trimStart,
                        selectedClip.trimEnd,
                        (progress, message) => setProcessing(progress, message)
                    )
                }

                const url = URL.createObjectURL(blob)
                setComplete(url)
            } catch (err) {
                console.error('[Timeline] Trim failed:', err)
                setError('Failed to trim video.')
            }
        })
    }

    const handleSplitExport = () => {
        if (!selectedClip || !onOpenExportModal || !canSplit) return
        onOpenExportModal('split', async () => {
            try {
                startExport()
                const blobs = await splitVideo(
                    selectedClip.file,
                    selectedClip.trimStart,
                    selectedClip.trimEnd,
                    selectedClip.splitPoints,
                    (progress, message) => setProcessing(progress, message)
                )

                if (blobs.length > 0) {
                    for (let i = 0; i < blobs.length; i++) {
                        const blob = blobs[i]
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        const baseName = sanitizeFilename(selectedClip.name.replace(/\.[^/.]+$/, ''))
                        a.download = `${baseName}_part_${i + 1}.mp4`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        setTimeout(() => URL.revokeObjectURL(url), 10000)
                    }
                }
                setComplete('')
            } catch (err) {
                console.error('[Timeline] Split failed:', err)
                setError('Failed to split video.')
            }
        })
    }

    const handleMergeExport = () => {
        if (!canMerge || !onOpenExportModal) return
        onOpenExportModal('merge', async () => {
            try {
                startExport()
                const blob = await mergeVideos(
                    clips.map((c) => ({
                        file: c.file,
                        trimStart: c.trimStart,
                        trimEnd: c.trimEnd,
                    })),
                    (progress, message) => setProcessing(progress, message)
                )
                const url = URL.createObjectURL(blob)
                setComplete(url)
            } catch (err) {
                console.error('[Timeline] Merge failed:', err)
                setError('Failed to merge videos.')
            }
        })
    }

    const handleExtractFrame = async (position: 'first' | 'last') => {
        if (!selectedClip) return
        const time = position === 'first' ? selectedClip.trimStart : selectedClip.trimEnd
        setLoading(true)
        try {
            const blob = await extractFrame(selectedClip.file, time)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const baseName = sanitizeFilename(selectedClip.name.replace(/\.[^/.]+$/, ''))
            a.download = `${baseName}_frame_${position}.webp`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 10000)
        } catch (error) {
            console.error('[Timeline] Frame extraction failed:', error)
            alert('Failed to extract frame.')
        } finally {
            setLoading(false)
        }
    }

    if (clips.length === 0) {
        return (
            <div className={styles.container} role="region" aria-label="Magnetic Studio Timeline">
                <div className={styles.timelineStage}>
                    <div className={styles.empty}>Import clips to start editing</div>
                </div>
            </div>
        )
    }

    const effectiveTrimStart = selectedClip && draggingTrim?.handle === 'left' ? draggingTrim.time : (selectedClip?.trimStart ?? 0)
    const effectiveTrimEnd = selectedClip && draggingTrim?.handle === 'right' ? draggingTrim.time : (selectedClip?.trimEnd ?? 1)
    const clipDuration = selectedClip?.duration ?? 1
    const trimStartPercent = (effectiveTrimStart / clipDuration) * 100
    const trimEndPercent = 100 - (effectiveTrimEnd / clipDuration) * 100

    return (
        <div className={styles.container} role="region" aria-label="Magnetic Studio Timeline">
            {/* Timeline Studio Toolbar Ribbon */}
            <div className={styles.toolbar}>
                <div className={styles.toolGroup}>
                    <button
                        className={`btn ${splitMode ? styles.toolBtnActive : ''}`}
                        onClick={toggleSplitMode}
                        disabled={!selectedClip}
                        title={splitMode ? 'Exit Split Mode' : 'Enter Split Mode (Click timeline to add cuts)'}
                    >
                        <Split size={13} />
                        <span>{splitMode ? 'Exit Split Mode' : 'Add Splits (S)'}</span>
                    </button>

                    <button
                        className={`btn ${canSplit ? 'btn-warning' : ''}`}
                        onClick={handleSplitExport}
                        disabled={!canSplit}
                        title={canSplit ? `Export ${selectedClip!.splitPoints.length + 1} Segments` : 'Add split points in timeline first'}
                    >
                        <span>{canSplit ? `Export Split (${selectedClip!.splitPoints.length + 1})` : 'Export Split'}</span>
                    </button>

                    <button
                        className="btn"
                        onClick={handleTrimExport}
                        disabled={!selectedClip}
                        title="Export Trimmed Range"
                    >
                        <Scissors size={13} />
                        <span>Export Trim</span>
                    </button>

                    <button
                        className="btn"
                        onClick={handleMergeExport}
                        disabled={!canMerge}
                        title="Merge all imported clips"
                    >
                        <Link size={13} />
                        <span>Export Merge</span>
                    </button>

                    <div className={styles.divider} />

                    <button
                        className="btn"
                        onClick={() => handleExtractFrame('first')}
                        disabled={!selectedClip}
                        title="Export first frame as WebP image"
                    >
                        <Image size={13} />
                        <span>First Frame</span>
                    </button>

                    <button
                        className="btn"
                        onClick={() => handleExtractFrame('last')}
                        disabled={!selectedClip}
                        title="Export last frame as WebP image"
                    >
                        <Image size={13} />
                        <span>Last Frame</span>
                    </button>

                    <button
                        className="btn"
                        onClick={() => selectedClip && revertClip(selectedClip.id)}
                        disabled={!selectedClip || !selectedClipHasModifications}
                        title="Revert selected clip to original"
                    >
                        <RotateCcw size={13} />
                        <span>Revert</span>
                    </button>
                </div>

                {selectedClip && (
                    <div className={styles.timecodeGroup}>
                        <span className={styles.timecodeLabel}>Clip:</span>
                        <span className={styles.timecodeValue}>{selectedClip.name}</span>
                        <span className={styles.timecodeLabel}>· In:</span>
                        <span className={styles.timecodeValue}>{formatTime(selectedClip.trimStart)}</span>
                        <span className={styles.timecodeLabel}>Out:</span>
                        <span className={styles.timecodeValue}>{formatTime(selectedClip.trimEnd)}</span>
                        <span className={styles.timecodeLabel}>Duration:</span>
                        <span className={styles.timecodeValue}>{formatTime(selectedClip.trimEnd - selectedClip.trimStart)}</span>
                    </div>
                )}
            </div>

            {/* Clip Selector Tabs (if multiple clips exist) */}
            {clips.length > 1 && (
                <div className={styles.clipTabs}>
                    {clips.map((c) => (
                        <button
                            key={c.id}
                            className={`${styles.clipTab} ${c.id === selectedClipId ? styles.clipTabActive : ''}`}
                            onClick={() => selectClip(c.id)}
                            title={`Edit ${c.name}`}
                        >
                            <Film size={11} />
                            <span>{c.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Time Ruler */}
            <div className={styles.ruler}>
                {rulerTicks.map((tick, i) => (
                    <div
                        key={i}
                        className={`${styles.rulerTick} ${i % 2 === 0 ? styles.rulerTickMajor : ''}`}
                        style={{ left: `${tick.percent}%` }}
                    >
                        {i % 2 === 0 && (
                            <span className={styles.rulerLabel}>{tick.label}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Stage Track */}
            <div className={styles.timelineStage}>
                {selectedClip ? (
                    <div
                        ref={trackRef}
                        className={`${styles.trackContainer} ${splitMode ? styles.trackSplitMode : ''}`}
                        onClick={handleTrackClick}
                        onMouseMove={handleTrackMouseMove}
                        onMouseLeave={handleTrackMouseLeave}
                    >
                        {/* Filmstrip simulation */}
                        {selectedClip.thumbnailUrl && (
                            <div className={styles.filmstrip}>
                                {Array.from({ length: 12 }).map((_, idx) => (
                                    <img
                                        key={idx}
                                        src={selectedClip.thumbnailUrl || undefined}
                                        alt=""
                                        className={styles.filmstripFrame}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Simulated audio waveform bar */}
                        <div className={styles.waveformBar} />

                        {/* Trim Overlays */}
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

                        {/* Tactile Trim Handles */}
                        <div
                            className={`${styles.trimHandle} ${styles.trimHandleLeft}`}
                            style={{ left: `${trimStartPercent}%` }}
                            onMouseDown={(e) => handleTrimDrag(e, 'left')}
                            onKeyDown={(e) => {
                                const step = e.shiftKey ? 0.5 : 0.05
                                if (e.key === 'ArrowLeft') {
                                    e.preventDefault()
                                    updateClipTrim(selectedClip.id, Math.max(0, selectedClip.trimStart - step), selectedClip.trimEnd)
                                } else if (e.key === 'ArrowRight') {
                                    e.preventDefault()
                                    updateClipTrim(selectedClip.id, Math.min(selectedClip.trimEnd - 0.1, selectedClip.trimStart + step), selectedClip.trimEnd)
                                }
                            }}
                            role="slider"
                            tabIndex={0}
                            aria-label="Trim start"
                            aria-valuemin={0}
                            aria-valuemax={selectedClip.trimEnd - 0.1}
                            aria-valuenow={selectedClip.trimStart}
                            aria-valuetext={formatTime(selectedClip.trimStart)}
                        />
                        <div
                            className={`${styles.trimHandle} ${styles.trimHandleRight}`}
                            style={{ right: `${trimEndPercent}%` }}
                            onMouseDown={(e) => handleTrimDrag(e, 'right')}
                            onKeyDown={(e) => {
                                const step = e.shiftKey ? 0.5 : 0.05
                                if (e.key === 'ArrowLeft') {
                                    e.preventDefault()
                                    updateClipTrim(selectedClip.id, selectedClip.trimStart, Math.max(selectedClip.trimStart + 0.1, selectedClip.trimEnd - step))
                                } else if (e.key === 'ArrowRight') {
                                    e.preventDefault()
                                    updateClipTrim(selectedClip.id, selectedClip.trimStart, Math.min(selectedClip.duration, selectedClip.trimEnd + step))
                                }
                            }}
                            role="slider"
                            tabIndex={0}
                            aria-label="Trim end"
                            aria-valuemin={selectedClip.trimStart + 0.1}
                            aria-valuemax={selectedClip.duration}
                            aria-valuenow={selectedClip.trimEnd}
                            aria-valuetext={formatTime(selectedClip.trimEnd)}
                        />

                        {/* Split markers */}
                        {selectedClip.splitPoints.map((splitTime) => {
                            const isDragging = draggingSplitTime === splitTime
                            const displayTime = isDragging && dragPreviewTime !== null ? dragPreviewTime : splitTime
                            const splitPercent = (displayTime / selectedClip.duration) * 100
                            return (
                                <div
                                    key={splitTime}
                                    className={`${styles.splitMarker} ${isDragging ? styles.splitMarkerDragging : ''}`}
                                    style={{ left: `${splitPercent}%` }}
                                    onMouseDown={(e) => handleSplitMarkerDragStart(e, splitTime)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Delete' || e.key === 'Backspace') {
                                            e.preventDefault()
                                            removeSplitPoint(selectedClip.id, splitTime)
                                        } else if (e.key === 'ArrowLeft') {
                                            e.preventDefault()
                                            const newTime = Math.max(selectedClip.trimStart + 0.05, splitTime - (e.shiftKey ? 0.5 : 0.05))
                                            updateSplitPoint(selectedClip.id, splitTime, Number(newTime.toFixed(3)))
                                        } else if (e.key === 'ArrowRight') {
                                            e.preventDefault()
                                            const newTime = Math.min(selectedClip.trimEnd - 0.05, splitTime + (e.shiftKey ? 0.5 : 0.05))
                                            updateSplitPoint(selectedClip.id, splitTime, Number(newTime.toFixed(3)))
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        removeSplitPoint(selectedClip.id, splitTime)
                                    }}
                                    role="slider"
                                    tabIndex={0}
                                    aria-valuemin={selectedClip.trimStart}
                                    aria-valuemax={selectedClip.trimEnd}
                                    aria-label={`Split marker at ${formatTime(displayTime)}`}
                                    aria-valuenow={displayTime}
                                    aria-valuetext={formatTime(displayTime)}
                                    title={`Split at ${formatTime(displayTime)} (drag/arrows to move, Del/double-click to remove)`}
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
                    </div>
                ) : (
                    <div className={styles.empty}>Select a clip from the Media Library</div>
                )}
            </div>
        </div>
    )
}
