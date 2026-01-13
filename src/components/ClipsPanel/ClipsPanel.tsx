import { useCallback, useRef, useState } from 'react'
import { Film, Plus, X, Upload, MoreVertical } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { formatTime } from '../../lib/utils'
import { hasTransformsApplied } from '../../utils/videoTransforms'
import { ClipActionsMenu } from './ClipActionsMenu'
import styles from './ClipsPanel.module.css'
import { reverseVideo } from '../../lib/ffmpeg'
import { createClipFromFile } from '../../utils/clipCreation'

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
        const clip = await createClipFromFile(file)
        if (clip) {
            addClip(clip)
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
            if (!confirm(`This clip is ${Math.round(duration)}s long. Reversing long clips (>10s) may consume significant memory and crash the application. Do you want to proceed?`)) {
                return
            }
        }

        setLoading(true)
        try {
            const reversedBlob = await reverseVideo(clip.file, clip.trimStart, clip.trimEnd)
            // Create new file with meaningful name
            const nameParts = clip.name.split('.')
            const ext = nameParts.pop()
            const baseName = nameParts.join('.')
            const newName = `${baseName} (Reversed).${ext || 'mp4'}`

            const newFile = new File([reversedBlob], newName, { type: clip.file.type })
            await processFile(newFile)
            // Note: processFile uses addClip which adds to end.
            // If we want to selecting it or something, we'd need clip ID.
            // createClipFromFile generates ID but returns it.
            // But processFile consumes it.
            // It's fine for now.
        } catch (error) {
            console.error('[ClipsPanel] Failed to reverse clip:', error)
            alert('Failed to reverse clip. The browser might have run out of memory. Try using a shorter clip or lower resolution.')
        } finally {
            setLoading(false)
        }
    }, [clips, setLoading, processFile])

    const handleDownload = useCallback((id: string) => {
        const clip = clips.find(c => c.id === id)
        if (!clip) return

        // Create temporary anchor to trigger download
        const url = URL.createObjectURL(clip.file)
        const a = document.createElement('a')
        a.href = url
        a.download = clip.name || `clip-${id}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
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
                                onContextMenu={(e) => handleContextMenu(e, clip.id)}
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
                                    className={styles.menuBtn}
                                    onClick={(e) => handleMenuOpen(e, clip.id)}
                                    title="Actions"
                                >
                                    <MoreVertical size={14} />
                                </button>
                                <button
                                    className={styles.removeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeClip(clip.id)
                                    }}
                                    title="Remove"
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
