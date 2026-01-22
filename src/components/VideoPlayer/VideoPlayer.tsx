import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Play, Pause, Volume2, VolumeX, Film } from 'lucide-react'
import { useEditorStore, ASPECT_RATIO_DIMENSIONS } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime } from '../../lib/utils'
import { buildVideoTransformStyle, calculateCropBoxStyle, hasCropApplied } from '../../utils/videoTransforms'
import { probeVideo } from '../../lib/ffmpeg'
import styles from './VideoPlayer.module.css'

type DragHandle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'bottom' | 'left' | 'right' | 'move' | null

export function VideoPlayer() {
    const cropMode = useEditorStore((state) => state.cropMode)
    const updateClipTrim = useEditorStore((state) => state.updateClipTrim)
    const addSplitPoint = useEditorStore((state) => state.addSplitPoint)
    const updateTransform = useEditorStore((state) => state.updateTransform)
    const seekPreviewTime = useEditorStore((state) => state.seekPreviewTime)
    const setSeekPreviewTime = useEditorStore((state) => state.setSeekPreviewTime)
    const selectedClip = useSelectedClip()
    const selectedClipId = selectedClip?.id ?? null

    const videoRef = useRef<HTMLVideoElement>(null)
    const playerRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, _setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [codec, setCodec] = useState<string | null>(null)

    // Crop drag state
    const [isDragging, setIsDragging] = useState(false)
    const [dragHandle, setDragHandle] = useState<DragHandle>(null)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 1, height: 1 })

    // Create object URL when clip changes
    // Track URL and clip ID in refs to handle React StrictMode double-invocation
    const blobUrlRef = useRef<{ url: string; clipId: string } | null>(null)

    useEffect(() => {
        const currentClipId = selectedClip?.id
        const currentFile = selectedClip?.file

        if (!currentFile || !currentClipId) {
            // No clip selected, clear state but don't revoke yet
            // (the URL might still be needed if this is StrictMode unmount/remount)
            setVideoUrl(null)
            setIsPlaying(false)
            return
        }

        // Check if we already have a URL for this exact file reference
        if (blobUrlRef.current?.clipId === currentClipId && (blobUrlRef.current as unknown as { file: File }).file === currentFile) {
            // Same clip and same file, reuse existing URL
            setVideoUrl(blobUrlRef.current.url)
            return
        }

        // Different clip or different file, revoke old URL and create new one
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current.url)
        }

        const newUrl = URL.createObjectURL(currentFile)
        blobUrlRef.current = { url: newUrl, clipId: currentClipId, file: currentFile } as { url: string; clipId: string; file: File }
        setVideoUrl(newUrl)
        setCurrentTime(selectedClip.trimStart)

        // Cleanup on unmount only (not on dependency change)
        return () => {
            // Only revoke if this is a true unmount (component removed)
            // For dependency changes, we handle it at the top of the effect
        }
    }, [selectedClip?.id, selectedClip?.file, selectedClip?.trimStart])

    // Probe codec when clip changes
    useEffect(() => {
        if (!selectedClip?.file) {
            setCodec(null)
            return
        }

        let isMounted = true
        probeVideo(selectedClip.file).then(info => {
            if (isMounted && info.codec_name) {
                setCodec(info.codec_name)
                if (info.codec_name.includes('hevc') || info.codec_name.includes('hvc1')) {
                    console.warn(`[VideoPlayer] Incompatible codec detected: ${info.codec_name}. Video may be invisible.`)
                }
            }
        })

        return () => {
            isMounted = false
        }
    }, [selectedClip?.id, selectedClip?.file])

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current.url)
                blobUrlRef.current = null
            }
        }
    }, [])

    // Sync video element with state
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime)
            // Loop within trim range
            if (selectedClip && video.currentTime >= selectedClip.trimEnd) {
                video.currentTime = selectedClip.trimStart
                video.pause()
                setIsPlaying(false)
            }
        }

        const logDiagnostics = () => {
            if (!videoRef.current) return
            const v = videoRef.current
            const rect = v.getBoundingClientRect()
            console.log(`[VideoPlayer] VISIBILITY CHECK:
                ReadyState: ${v.readyState}
                CurrentTime: ${v.currentTime}
                Video Size: ${v.videoWidth}x${v.videoHeight}
                DOM Rect: ${rect.width}x${rect.height} at (${rect.left}, ${rect.top})
                Offset Size: ${v.offsetWidth}x${v.offsetHeight}
                Parent Size: ${v.parentElement?.clientWidth}x${v.parentElement?.clientHeight}
                Src (first 50): ${v.src.substring(0, 50)}...`)
        }

        const handleLoadedMetadata = () => {
            setDuration(video.duration)
            if (selectedClip) {
                // Nudge it to 0.1s to be sure we are on a real frame
                video.currentTime = selectedClip.trimStart + 0.1
            }
            logDiagnostics()
        }

        const handleCanPlay = () => {
            logDiagnostics()
        }

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleEnded = () => setIsPlaying(false)

        // Handle video errors (e.g., revoked blob URLs after undo)
        const handleError = (e: Event) => {
            const videoElement = e.currentTarget as HTMLVideoElement;
            console.error('Video error:', videoElement.error)
            // Silently handle errors from revoked blob URLs
            // This can happen when undo removes a clip and the URL is revoked
            setVideoUrl(null)
            setIsPlaying(false)
            logDiagnostics()
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('error', handleError)

        // Initial check
        logDiagnostics()

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('error', handleError)
        }
    }, [videoUrl, selectedClipId, selectedClip])

    // Sync playback rate with speed transform for live preview
    useEffect(() => {
        const video = videoRef.current
        if (!video || !selectedClip) return

        video.playbackRate = selectedClip.transform.speed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClip?.transform.speed])

    // Respond to seek preview requests from Timeline
    useEffect(() => {
        const video = videoRef.current
        if (!video || seekPreviewTime === null) return

        video.currentTime = seekPreviewTime
        setCurrentTime(seekPreviewTime)
        // Clear the preview request
        setSeekPreviewTime(null)
    }, [seekPreviewTime, setSeekPreviewTime])

    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            video.pause()
        } else {
            if (selectedClip && video.currentTime >= selectedClip.trimEnd) {
                video.currentTime = selectedClip.trimStart
            }
            video.play()
        }
        setIsPlaying(!isPlaying)
    }, [isPlaying, selectedClip])

    const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current
        if (!video || !duration) return

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width
        const newTime = percent * duration

        video.currentTime = newTime
        setCurrentTime(newTime)
    }, [duration])

    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        video.muted = !isMuted
        setIsMuted(!isMuted)
    }, [isMuted])

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return

            switch (e.code) {
                case 'Space':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'KeyI':
                    if (selectedClip && selectedClipId) {
                        updateClipTrim(selectedClipId, currentTime, selectedClip.trimEnd)
                    }
                    break
                case 'KeyO':
                    if (selectedClip && selectedClipId) {
                        updateClipTrim(selectedClipId, selectedClip.trimStart, currentTime)
                    }
                    break
                case 'KeyS':
                    // Add split point at current time
                    if (selectedClipId && currentTime > 0) {
                        addSplitPoint(selectedClipId, currentTime)
                    }
                    break
                case 'ArrowLeft':
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, currentTime - (e.shiftKey ? 1 : 1 / 30))
                    }
                    break
                case 'ArrowRight':
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(duration, currentTime + (e.shiftKey ? 1 : 1 / 30))
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay, selectedClip, selectedClipId, currentTime, duration, updateClipTrim, addSplitPoint])

    // Build video transform style using shared utility
    const videoTransformStyle = useMemo(() => {
        if (!selectedClip) return {}
        return buildVideoTransformStyle(selectedClip.transform)
    }, [selectedClip])

    // Crop overlay handlers
    const handleCropMouseDown = useCallback((e: React.MouseEvent, handle: DragHandle) => {
        if (!cropMode || !selectedClip) return
        e.preventDefault()
        e.stopPropagation()

        setIsDragging(true)
        setDragHandle(handle)
        setDragStart({ x: e.clientX, y: e.clientY })
        setCropStart({
            x: selectedClip.transform.cropX,
            y: selectedClip.transform.cropY,
            width: selectedClip.transform.cropWidth,
            height: selectedClip.transform.cropHeight
        })
    }, [cropMode, selectedClip])

    const handleCropMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragHandle || !playerRef.current || !selectedClipId) return

        const rect = playerRef.current.getBoundingClientRect()
        const deltaX = (e.clientX - dragStart.x) / rect.width
        const deltaY = (e.clientY - dragStart.y) / rect.height

        let newX = cropStart.x
        let newY = cropStart.y
        let newWidth = cropStart.width
        let newHeight = cropStart.height

        switch (dragHandle) {
            case 'move':
                newX = Math.max(0, Math.min(1 - newWidth, cropStart.x + deltaX))
                newY = Math.max(0, Math.min(1 - newHeight, cropStart.y + deltaY))
                break
            case 'topLeft':
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.1, cropStart.x + deltaX))
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.1, cropStart.y + deltaY))
                newWidth = cropStart.width - (newX - cropStart.x)
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'topRight':
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.1, cropStart.y + deltaY))
                newWidth = Math.max(0.1, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'bottomLeft':
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.1, cropStart.x + deltaX))
                newWidth = cropStart.width - (newX - cropStart.x)
                newHeight = Math.max(0.1, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'bottomRight':
                newWidth = Math.max(0.1, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                newHeight = Math.max(0.1, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'top':
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.1, cropStart.y + deltaY))
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'bottom':
                newHeight = Math.max(0.1, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'left':
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.1, cropStart.x + deltaX))
                newWidth = cropStart.width - (newX - cropStart.x)
                break
            case 'right':
                newWidth = Math.max(0.1, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                break
        }

        updateTransform(selectedClipId, {
            cropX: newX,
            cropY: newY,
            cropWidth: newWidth,
            cropHeight: newHeight
        })
    }, [isDragging, dragHandle, dragStart, cropStart, selectedClipId, updateTransform])

    const handleCropMouseUp = useCallback(() => {
        setIsDragging(false)
        setDragHandle(null)
    }, [])

    // Add/remove global mouse listeners for crop dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleCropMouseMove)
            window.addEventListener('mouseup', handleCropMouseUp)
            return () => {
                window.removeEventListener('mousemove', handleCropMouseMove)
                window.removeEventListener('mouseup', handleCropMouseUp)
            }
        }
    }, [isDragging, handleCropMouseMove, handleCropMouseUp])

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    // Crop box position/size using shared utility
    const cropBox = selectedClip ? calculateCropBoxStyle(selectedClip.transform) : null

    // Check if a non-default crop is applied using shared utility
    const isCropped = selectedClip && hasCropApplied(selectedClip.transform)

    // Aspect ratio preview - calculate letterbox/pillarbox effect
    const aspectRatioStyle = useMemo(() => {
        if (!selectedClip || selectedClip.transform.aspectRatio === 'original') {
            return {}
        }

        const dims = ASPECT_RATIO_DIMENSIONS[selectedClip.transform.aspectRatio]

        // Only set aspect ratio - let CSS module handle max-height/max-width constraints
        return {
            aspectRatio: `${dims.width} / ${dims.height}`,
        }
    }, [selectedClip])

    // Show aspect ratio indicator text
    const aspectRatioLabel = selectedClip?.transform.aspectRatio !== 'original'
        ? selectedClip?.transform.aspectRatio
        : null

    return (
        <div className={styles.container}>
            <div
                className={`${styles.player} ${aspectRatioLabel ? styles.aspectPreviewActive : ''}`}
                ref={playerRef}
                style={aspectRatioStyle}
            >
                {videoUrl ? (
                    <>
                        <div className={styles.videoWrapper}>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className={styles.video}
                                style={videoTransformStyle}
                                muted
                                playsInline
                                onClick={!cropMode ? togglePlay : undefined}
                            />
                        </div>

                        {/* Incompatible Codec Warning */}
                        {(codec?.includes('hevc') || codec?.includes('hvc1')) && (
                            <div className={styles.codecWarning}>
                                <div className={styles.codecWarningContent}>
                                    <VolumeX size={48} className={styles.codecWarningIcon} />
                                    <h3>Unsupported Video Format</h3>
                                    <p>This video uses the <strong>{codec}</strong> codec, which your browser doesn't support for preview.</p>
                                    <p className={styles.hint}>Use <strong>"Fix Visibility"</strong> in Actions to make it visible.</p>
                                </div>
                            </div>
                        )}

                        {/* Aspect Ratio Indicator */}
                        {aspectRatioLabel && (
                            <div className={styles.aspectIndicator}>
                                {aspectRatioLabel}
                            </div>
                        )}

                        {/* Crop Preview Indicator (when crop mode is off but crop is applied) */}
                        {!cropMode && isCropped && selectedClip && cropBox && (
                            <div className={styles.cropPreviewOverlay}>
                                <div
                                    className={styles.cropPreviewBox}
                                    style={cropBox}
                                    onClick={() => useEditorStore.getState().toggleCropMode()}
                                    title="Click to edit crop region"
                                >
                                    <div className={styles.cropPreviewLabel}>
                                        ✂️ {Math.round(selectedClip.transform.cropWidth * 100)}% × {Math.round(selectedClip.transform.cropHeight * 100)}%
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Crop Overlay (edit mode) */}
                        {cropMode && selectedClip && cropBox && (
                            <div className={styles.cropOverlay}>
                                <div
                                    className={styles.cropBox}
                                    style={cropBox}
                                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                                >
                                    {/* Rule of thirds grid */}
                                    <div className={styles.cropGrid}>
                                        <div className={`${styles.cropGridLine} ${styles.h1}`} />
                                        <div className={`${styles.cropGridLine} ${styles.h2}`} />
                                        <div className={`${styles.cropGridLine} ${styles.v1}`} />
                                        <div className={`${styles.cropGridLine} ${styles.v2}`} />
                                    </div>

                                    {/* Resize handles */}
                                    <div
                                        className={`${styles.cropHandle} ${styles.topLeft}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'topLeft')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.topRight}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'topRight')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.bottomLeft}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'bottomLeft')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.bottomRight}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'bottomRight')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.top}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'top')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.bottom}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'bottom')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.left}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'left')}
                                    />
                                    <div
                                        className={`${styles.cropHandle} ${styles.right}`}
                                        onMouseDown={(e) => handleCropMouseDown(e, 'right')}
                                    />

                                    {/* Crop info */}
                                    <div className={styles.cropInfo}>
                                        {Math.round(selectedClip.transform.cropWidth * 100)}% × {Math.round(selectedClip.transform.cropHeight * 100)}%
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.controls}>
                            <button className={styles.playBtn} onClick={togglePlay}>
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>

                            <span className={styles.time}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>

                            <div className={styles.scrubber} onClick={handleScrub}>
                                <div className={styles.progress} style={{ width: `${progress}%` }} />
                                <div className={styles.scrubberHandle} style={{ left: `${progress}%` }} />
                            </div>

                            <div className={styles.volume}>
                                <button className={styles.volumeBtn} onClick={toggleMute}>
                                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={styles.placeholder}>
                        <Film size={48} className={styles.placeholderIcon} />
                        <div>Select a clip to preview</div>
                    </div>
                )}
            </div>
        </div>
    )
}
