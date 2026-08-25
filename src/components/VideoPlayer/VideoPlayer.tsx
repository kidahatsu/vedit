import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Play, Pause, Volume2, VolumeX, Film, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime, clamp } from '../../lib/utils'
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
    const videoWrapperRef = useRef<HTMLDivElement>(null)
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null)
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
    // Track URL, clip ID, and file reference to handle React StrictMode
    const blobUrlRef = useRef<{ url: string; clipId: string; file: File } | null>(null)
    const selectedClipRef = useRef(selectedClip)
    selectedClipRef.current = selectedClip

    useEffect(() => {
        const currentClipId = selectedClip?.id
        const currentFile = selectedClip?.file

        if (!currentFile || !currentClipId) {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current.url)
                blobUrlRef.current = null
            }
            setVideoUrl(null)
            setIsPlaying(false)
            return
        }

        // Check if we already have a URL for this exact file reference
        if (blobUrlRef.current?.clipId === currentClipId && blobUrlRef.current?.file === currentFile) {
            setVideoUrl(blobUrlRef.current.url)
            return
        }

        // Different clip or different file, revoke old URL and create new one
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current.url)
        }

        const newUrl = URL.createObjectURL(currentFile)
        blobUrlRef.current = { url: newUrl, clipId: currentClipId, file: currentFile }
        setVideoUrl(newUrl)
        setCurrentTime(selectedClip.trimStart)
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
            }
        }).catch(() => {
            if (isMounted) {
                setCodec(null)
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
        if (!video || !videoUrl) return

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime)
            const clip = selectedClipRef.current
            // Loop within trim range
            if (clip && video.currentTime >= clip.trimEnd) {
                video.currentTime = clip.trimStart
                video.pause()
                setIsPlaying(false)
            }
        }

        const handleLoadedMetadata = () => {
            setDuration(video.duration)
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                setVideoDimensions({ width: video.videoWidth, height: video.videoHeight })
            }
            const clip = selectedClipRef.current
            if (clip) {
                video.currentTime = clip.trimStart
            }
        }

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleEnded = () => setIsPlaying(false)

        // Handle video errors (e.g., revoked blob URLs after undo)
        const handleError = (e: Event) => {
            const videoElement = e.currentTarget as HTMLVideoElement
            console.error('Video error:', videoElement.error)
            setVideoUrl(null)
            setIsPlaying(false)
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('error', handleError)

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('error', handleError)
        }
    }, [videoUrl])

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

        const nextMuted = !isMuted
        video.muted = nextMuted
        setIsMuted(nextMuted)
    }, [isMuted])

    // Sync volume and muted state to video element
    useEffect(() => {
        const video = videoRef.current
        if (!video || !selectedClip) return

        const targetVolume = Math.max(0, Math.min(1, (selectedClip.transform.volume ?? 100) / 100))
        video.volume = targetVolume
        video.muted = isMuted || !!selectedClip.transform.muted
    }, [selectedClip, isMuted])

    const stepFrame = useCallback((frames: number) => {
        if (!videoRef.current || !selectedClip) return
        const newTime = clamp(
            videoRef.current.currentTime + (frames * (1 / 30)),
            selectedClip.trimStart,
            selectedClip.trimEnd
        )
        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
    }, [selectedClip])

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            switch (e.code) {
                case 'Space':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'KeyM':
                    e.preventDefault()
                    toggleMute()
                    break
                case 'Comma': // <
                    e.preventDefault()
                    stepFrame(-1)
                    break
                case 'Period': // >
                    e.preventDefault()
                    stepFrame(1)
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
    }, [togglePlay, toggleMute, stepFrame, selectedClip, selectedClipId, currentTime, duration, updateClipTrim, addSplitPoint])

    // Build video transform style using shared utility
    const videoTransformStyle = useMemo(() => {
        if (!selectedClip) return {}
        return buildVideoTransformStyle(selectedClip.transform)
    }, [selectedClip])

    // Crop overlay handlers
    const handleCropMouseDown = useCallback((e: React.MouseEvent, handle: DragHandle) => {
        if (!selectedClip) return
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
    }, [selectedClip])

    const handleCropMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragHandle || !videoWrapperRef.current || !selectedClipId) return

        const rect = videoWrapperRef.current.getBoundingClientRect()
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
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.05, cropStart.x + deltaX))
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.05, cropStart.y + deltaY))
                newWidth = cropStart.width - (newX - cropStart.x)
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'topRight':
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.05, cropStart.y + deltaY))
                newWidth = Math.max(0.05, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'bottomLeft':
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.05, cropStart.x + deltaX))
                newWidth = cropStart.width - (newX - cropStart.x)
                newHeight = Math.max(0.05, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'bottomRight':
                newWidth = Math.max(0.05, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                newHeight = Math.max(0.05, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'top':
                newY = Math.max(0, Math.min(cropStart.y + cropStart.height - 0.05, cropStart.y + deltaY))
                newHeight = cropStart.height - (newY - cropStart.y)
                break
            case 'bottom':
                newHeight = Math.max(0.05, Math.min(1 - cropStart.y, cropStart.height + deltaY))
                break
            case 'left':
                newX = Math.max(0, Math.min(cropStart.x + cropStart.width - 0.05, cropStart.x + deltaX))
                newWidth = cropStart.width - (newX - cropStart.x)
                break
            case 'right':
                newWidth = Math.max(0.05, Math.min(1 - cropStart.x, cropStart.width + deltaX))
                break
        }

        updateTransform(selectedClipId, {
            cropX: Number(newX.toFixed(4)),
            cropY: Number(newY.toFixed(4)),
            cropWidth: Number(newWidth.toFixed(4)),
            cropHeight: Number(newHeight.toFixed(4))
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

    // Show aspect ratio indicator text
    const aspectRatioLabel = selectedClip?.transform.aspectRatio !== 'original'
        ? selectedClip?.transform.aspectRatio
        : null

    const showCropOverlay = Boolean((cropMode || isCropped || (selectedClip && selectedClip.transform.aspectRatio !== 'original')) && selectedClip && cropBox)

    return (
        <div className={styles.container}>
            <div className={styles.ambientBacklight} />
            <div
                className={styles.player}
                ref={playerRef}
            >
                {videoUrl ? (
                    <>
                        <div
                            className={styles.videoWrapper}
                            ref={videoWrapperRef}
                            style={videoDimensions ? { aspectRatio: `${videoDimensions.width} / ${videoDimensions.height}` } : undefined}
                        >
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className={styles.video}
                                style={videoTransformStyle}
                                playsInline
                                onClick={!showCropOverlay ? togglePlay : undefined}
                            />

                            {/* Active Interactive Crop Box & Edge Lines */}
                            {showCropOverlay && selectedClip && cropBox && (
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

                                        {/* Crop info badge */}
                                        <div className={styles.cropInfo}>
                                            {selectedClip.transform.aspectRatio !== 'original' ? `${selectedClip.transform.aspectRatio} ` : ''}
                                            ({Math.round(selectedClip.transform.cropWidth * 100)}% × {Math.round(selectedClip.transform.cropHeight * 100)}%)
                                        </div>
                                    </div>
                                </div>
                            )}
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

                        {/* Aspect Ratio Indicator Badge */}
                        {selectedClip && aspectRatioLabel && (
                            <div className={styles.aspectIndicator}>
                                {aspectRatioLabel} ({Math.round(selectedClip.transform.cropWidth * 100)}% × {Math.round(selectedClip.transform.cropHeight * 100)}%)
                            </div>
                        )}

                        <div className={styles.controls}>
                            <div className={styles.transportBtnGroup}>
                                <button
                                    className={styles.stepBtn}
                                    onClick={() => stepFrame(-1)}
                                    title="Previous Frame (Left Arrow)"
                                    aria-label="Previous frame"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    className={styles.playBtn}
                                    onClick={togglePlay}
                                    title="Play / Pause (Space)"
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
                                </button>
                                <button
                                    className={styles.stepBtn}
                                    onClick={() => stepFrame(1)}
                                    title="Next Frame (Right Arrow)"
                                    aria-label="Next frame"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <span className={styles.time}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>

                            <div
                                className={styles.scrubber}
                                onClick={handleScrub}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowLeft') {
                                        e.preventDefault()
                                        stepFrame(e.shiftKey ? -5 : -1)
                                    } else if (e.key === 'ArrowRight') {
                                        e.preventDefault()
                                        stepFrame(e.shiftKey ? 5 : 1)
                                    } else if (e.key === 'Home') {
                                        e.preventDefault()
                                        if (videoRef.current) {
                                            videoRef.current.currentTime = 0
                                            setCurrentTime(0)
                                        }
                                    } else if (e.key === 'End') {
                                        e.preventDefault()
                                        if (videoRef.current) {
                                            videoRef.current.currentTime = duration
                                            setCurrentTime(duration)
                                        }
                                    }
                                }}
                                tabIndex={0}
                                role="slider"
                                aria-orientation="horizontal"
                                aria-valuemin={0}
                                aria-valuemax={duration}
                                aria-valuenow={currentTime}
                                aria-valuetext={formatTime(currentTime)}
                                aria-label="Playback progress"
                            >
                                <div className={styles.progress} style={{ width: `${progress}%` }} />
                                <div className={styles.scrubberHandle} style={{ left: `${progress}%` }} />
                            </div>

                            <div className={styles.volume}>
                                <button
                                    className={styles.volumeBtn}
                                    onClick={toggleMute}
                                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={styles.placeholder}>
                        <Film size={44} className={styles.placeholderIcon} />
                        <div>Select a clip to preview</div>
                    </div>
                )}
            </div>
        </div>
    )
}
