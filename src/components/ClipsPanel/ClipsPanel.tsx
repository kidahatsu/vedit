import { useCallback, useRef, useState } from 'react'
import { Film, Plus, X, Upload, MoreVertical } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime } from '../../lib/utils'
import { hasTransformsApplied } from '../../utils/videoTransforms'
import { ClipActionsMenu } from './ClipActionsMenu'
import { reverseVideo } from '../../lib/ffmpeg'
import { createClipFromFile } from '../../utils/clipCreation'
import { sanitizeFilename } from '../../utils/validation'
import styles from './ClipsPanel.module.css'

export function ClipsPanel() {
    const clips = useEditorStore((state) => state.clips)
    const addClip = useEditorStore((state) => state.addClip)
    const removeClip = useEditorStore((state) => state.removeClip)
    const revertClip = useEditorStore((state) => state.revertClip)
    const duplicateClip = useEditorStore((state) => state.duplicateClip)
    const selectClip = useEditorStore((state) => state.selectClip)
    const setLoading = useEditorStore((state) => state.setLoading)
    const selectedClip = useSelectedClip()
    const selectedClipId = selectedClip?.id ?? null
    const [isDragOver, setIsDragOver] = useState(false)
    const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processFile = useCallback(async (file: File) => {
        try {
            const clip = await createClipFromFile(file)
            if (clip) {
                addClip(clip)
            }
        } catch (error) {
            console.error(`[ClipsPanel] Error loading file "${file.name}":`, error)
            alert(error instanceof Error ? error.message : `Failed to load "${file.name}"`)
        }
    }, [addClip])

    const handleFiles = useCallback(async (files: FileList) => {
        setLoading(true)
        try {
            for (const file of Array.from(files)) {
                await processFile(file)
            }
        } finally {
            setLoading(false)
        }
    }, [processFile, setLoading])

    const handleReverse = useCallback(async (id: string) => {
        const clip = clips.find(c => c.id === id)
        if (!clip) return

        const duration = clip.trimEnd - clip.trimStart
        if (duration > 10) {
            if (!confirm(`This clip is ${Math.round(duration)}s long. Reversing long clips (>10s) may consume significant memory. Proceed?`)) {
                return
            }
        }

        setLoading(true)
        try {
            const reversedBlob = await reverseVideo(clip.file, clip.trimStart, clip.trimEnd)
            const nameParts = clip.name.split('.')
            const ext = nameParts.pop()
            const baseName = nameParts.join('.')
            const newName = `${baseName} (Reversed).${ext || 'mp4'}`

            const newFile = new File([reversedBlob], newName, { type: clip.file.type })
            await processFile(newFile)
        } catch (error) {
            console.error('[ClipsPanel] Failed to reverse clip:', error)
            alert('Failed to reverse clip. The browser might have run out of memory.')
        } finally {
            setLoading(false)
        }
    }, [clips, setLoading, processFile])

    const handleDownload = useCallback((id: string) => {
        const clip = clips.find(c => c.id === id)
        if (!clip) return

        const url = URL.createObjectURL(clip.file)
        const a = document.createElement('a')
        a.href = url
        a.download = sanitizeFilename(clip.name || `clip-${id}.mp4`)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 15000)
    }, [clips])

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

    const handleContextMenu = useCallback((e: React.MouseEvent, clipId: string) => {
        e.preventDefault()
        setActiveMenu({ id: clipId, x: e.clientX, y: e.clientY })
    }, [])

    const handleMenuOpen = useCallback((e: React.MouseEvent, clipId: string) => {
        e.stopPropagation()
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setActiveMenu({ id: clipId, x: rect.left, y: rect.bottom })
    }, [])

    const activeClip = activeMenu ? clips.find(c => c.id === activeMenu.id) : null
    const activeClipHasMods = activeClip ? (
        activeClip.trimStart > 0 ||
        activeClip.trimEnd < activeClip.duration ||
        activeClip.splitPoints.length > 0 ||
        hasTransformsApplied(activeClip.transform)
    ) : false

    return (
        <aside className={styles.panel} aria-label="Media asset drawer">
            <div className={styles.panelHeader}>
                <span className={styles.title}>Media Library</span>
                {clips.length > 0 && (
                    <span className={styles.countBadge}>{clips.length}</span>
                )}
            </div>

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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleFileSelect()
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Import media files"
                >
                    <Upload size={28} className={styles.dropIcon} />
                    <div className={styles.dropTitle}>Import Media</div>
                    <div className={styles.dropSubtitle}>
                        Drop MP4/MOV or click to browse
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        selectClip(clip.id)
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, clip.id)}
                                role="button"
                                tabIndex={0}
                                aria-selected={selectedClipId === clip.id}
                            >
                                <div className={styles.thumbnailContainer}>
                                    {clip.thumbnailUrl ? (
                                        <img
                                            src={clip.thumbnailUrl}
                                            alt={clip.name}
                                            className={styles.thumbnail}
                                        />
                                    ) : (
                                        <div className={styles.thumbnailPlaceholder}>
                                            <Film size={14} />
                                        </div>
                                    )}
                                    <span className={styles.clipDurationBadge}>
                                        {formatTime(clip.duration)}
                                    </span>
                                </div>
                                <div className={styles.clipInfo}>
                                    <div className={styles.clipName} title={clip.name}>{clip.name}</div>
                                    <div className={styles.clipDuration}>
                                        {formatTime(clip.trimEnd - clip.trimStart)} selected
                                    </div>
                                </div>
                                <button
                                    className={styles.menuBtn}
                                    onClick={(e) => handleMenuOpen(e, clip.id)}
                                    title="Options"
                                    aria-label="Clip options"
                                >
                                    <MoreVertical size={13} />
                                </button>
                                <button
                                    className={styles.removeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeClip(clip.id)
                                    }}
                                    title="Remove clip"
                                    aria-label="Remove clip"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className={styles.addButton} onClick={handleFileSelect}>
                        <Plus size={14} />
                        <span>Add Media</span>
                    </button>
                    {activeMenu && activeClip && (
                        <ClipActionsMenu
                            clipId={activeMenu.id}
                            clipName={activeClip.name}
                            position={{ x: activeMenu.x, y: activeMenu.y }}
                            hasModifications={activeClipHasMods}
                            onRevert={() => revertClip(activeMenu.id)}
                            onReverse={() => handleReverse(activeMenu.id)}
                            onDuplicate={() => duplicateClip(activeMenu.id)}
                            onDownload={() => handleDownload(activeMenu.id)}
                            onDelete={() => removeClip(activeMenu.id)}
                            onClose={() => setActiveMenu(null)}
                        />
                    )}
                </>
            )}
        </aside>
    )
}
