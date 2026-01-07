import { useCallback, useRef, useState } from 'react'
import { Film, Plus, X, Upload } from 'lucide-react'
import { useEditorStore, type Clip, DEFAULT_TRANSFORM } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime, generateId } from '../../lib/utils'
import { validateVideoFile } from '../../utils/validation'
import styles from './ClipsPanel.module.css'

export function ClipsPanel() {
    const { clips, addClip, removeClip, selectClip } = useEditorStore()
    const selectedClip = useSelectedClip()
    const selectedClipId = selectedClip?.id ?? null
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFiles = useCallback(async (files: FileList) => {
        for (const file of Array.from(files)) {
            // Validate file before processing
            const validation = validateVideoFile(file)
            if (!validation.valid) {
                console.warn(`[ClipsPanel] Skipping invalid file: ${validation.error}`)
                continue
            }

            // Create object URL - will be revoked after metadata extraction
            const objectUrl = URL.createObjectURL(file)

            const clip: Clip = {
                id: generateId(),
                file,
                name: file.name,
                duration: 0,
                thumbnailUrl: null,
                trimStart: 0,
                trimEnd: 0,
                splitPoints: [],
                transform: { ...DEFAULT_TRANSFORM }
            }

            // Get video duration and thumbnail
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.src = objectUrl

            try {
                await new Promise<void>((resolve, reject) => {
                    const cleanup = () => {
                        URL.revokeObjectURL(objectUrl)
                    }

                    const timeoutId = setTimeout(() => {
                        cleanup()
                        reject(new Error('Video metadata loading timeout'))
                    }, 10000) // 10s timeout

                    video.onerror = () => {
                        clearTimeout(timeoutId)
                        cleanup()
                        reject(new Error('Failed to load video metadata'))
                    }

                    video.onloadedmetadata = () => {
                        clip.duration = video.duration
                        clip.trimEnd = video.duration
                        // Generate thumbnail from middle of video
                        video.currentTime = Math.min(1, video.duration / 2)
                    }

                    video.onseeked = () => {
                        clearTimeout(timeoutId)
                        try {
                            const canvas = document.createElement('canvas')
                            canvas.width = 160
                            canvas.height = 90
                            const ctx = canvas.getContext('2d')
                            if (ctx) {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                                clip.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
                            }
                        } catch (e) {
                            console.warn('[ClipsPanel] Failed to generate thumbnail:', e)
                        }
                        cleanup()
                        resolve()
                    }
                })

                addClip(clip)
            } catch (err) {
                console.error('[ClipsPanel] Error processing video file:', err)
                // URL already cleaned up in error handler
            }
        }
    }, [addClip])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files)
        }
    }, [handleFiles])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false)
    }, [])

    const handleFileSelect = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            handleFiles(e.target.files)
            e.target.value = ''
        }
    }, [handleFiles])

    return (
        <aside className={styles.panel}>
            <div className={styles.title}>Clips</div>

            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                hidden
                onChange={handleInputChange}
            />

            {clips.length === 0 ? (
                <div
                    className={`${styles.dropZone} ${isDragOver ? styles.active : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleFileSelect}
                >
                    <Upload size={32} className={styles.dropIcon} />
                    <div>Drop videos here</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                        or click to browse
                    </div>
                </div>
            ) : (
                <>
                    <div
                        className={styles.list}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {clips.map((clip) => (
                            <div
                                key={clip.id}
                                className={`${styles.clip} ${selectedClipId === clip.id ? styles.clipSelected : ''}`}
                                onClick={() => selectClip(clip.id)}
                            >
                                {clip.thumbnailUrl ? (
                                    <img
                                        src={clip.thumbnailUrl}
                                        alt={clip.name}
                                        className={styles.thumbnail}
                                    />
                                ) : (
                                    <div className={styles.thumbnailPlaceholder}>
                                        <Film size={16} />
                                    </div>
                                )}
                                <div className={styles.clipInfo}>
                                    <div className={styles.clipName}>{clip.name}</div>
                                    <div className={styles.clipDuration}>
                                        {formatTime(clip.trimEnd - clip.trimStart)} / {formatTime(clip.duration)}
                                    </div>
                                </div>
                                <button
                                    className={styles.removeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeClip(clip.id)
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className={styles.addButton} onClick={handleFileSelect}>
                        <Plus size={16} />
                        Add Clip
                    </button>
                </>
            )}
        </aside>
    )
}
