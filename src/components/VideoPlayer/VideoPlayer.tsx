import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Film } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { formatTime } from '../../lib/utils'
import styles from './VideoPlayer.module.css'

export function VideoPlayer() {
    const { clips, selectedClipId, updateClipTrim, addSplitPoint } = useEditorStore()
    const selectedClip = clips.find((c) => c.id === selectedClipId)

    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, _setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)

    // Create object URL when clip changes
    useEffect(() => {
        if (selectedClip) {
            const url = URL.createObjectURL(selectedClip.file)
            setVideoUrl(url)
            setCurrentTime(selectedClip.trimStart)
            return () => URL.revokeObjectURL(url)
        } else {
            setVideoUrl(null)
            setIsPlaying(false)
        }
    }, [selectedClip])

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

        const handleLoadedMetadata = () => {
            setDuration(video.duration)
            if (selectedClip) {
                video.currentTime = selectedClip.trimStart
            }
        }

        const handleEnded = () => setIsPlaying(false)

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('ended', handleEnded)

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('ended', handleEnded)
        }
    }, [selectedClip])

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

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div className={styles.container}>
            <div className={styles.player}>
                {videoUrl ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className={styles.video}
                            onClick={togglePlay}
                        />
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
