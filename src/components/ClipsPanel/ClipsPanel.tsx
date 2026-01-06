import { useCallback, useRef, useState } from 'react'
import { Film, Plus, X, Upload } from 'lucide-react'
import { useEditorStore, type Clip, DEFAULT_TRANSFORM } from '../../store/editorStore'
import { formatTime, generateId } from '../../lib/utils'
import styles from './ClipsPanel.module.css'

export function ClipsPanel() {
    const { clips, selectedClipId, addClip, removeClip, selectClip } = useEditorStore()
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFiles = useCallback(async (files: FileList) => {
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('video/')) continue

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
            video.src = URL.createObjectURL(file)

            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => {
                    clip.duration = video.duration
                    clip.trimEnd = video.duration

                    // Generate thumbnail
                    video.currentTime = Math.min(1, video.duration / 2)
                }

                video.onseeked = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = 160
                    canvas.height = 90
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        clip.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
                    }
                    URL.revokeObjectURL(video.src)
                    resolve()
                }
            })

            addClip(clip)
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
