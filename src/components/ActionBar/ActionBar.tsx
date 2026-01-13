import { Scissors, Link, RotateCcw, Download, Split, Rewind } from 'lucide-react'
import { useEditorStore, type Clip } from '../../store/editorStore'
import { useSelectedClip, useHasClips, useCanMerge, useCanSplit, useSelectedClipHasModifications } from '../../store/selectors'
import { useExportStore } from '../../store/exportStore'
import { trimVideo, mergeVideos, splitVideo, transformVideo, reverseVideo } from '../../lib/ffmpeg'
import { createClipFromFile } from '../../utils/clipCreation'
import { wrapError } from '../../lib/errors'
import { hasTransformsApplied } from '../../utils/videoTransforms'
import { sanitizeFilename } from '../../utils/validation'
import { type ExportPreset } from '../../store/exportPresets'
import { type ExportMode } from '../../App'
import styles from './ActionBar.module.css'

interface ActionBarProps {
    onOpenExportModal: (mode: ExportMode, onExport: (preset: ExportPreset) => void) => void
}

export function ActionBar({ onOpenExportModal }: ActionBarProps) {
    const clips = useEditorStore((state) => state.clips)
    const reset = useEditorStore((state) => state.reset)
    const revertClip = useEditorStore((state) => state.revertClip)
    const addClip = useEditorStore((state) => state.addClip)
    const selectClip = useEditorStore((state) => state.selectClip)
    const setLoading = useEditorStore((state) => state.setLoading)
    const { startExport, setProcessing, setComplete, setError } = useExportStore()

    const selectedClip = useSelectedClip()
    const hasClips = useHasClips()
    const canMerge = useCanMerge()
    const canSplit = useCanSplit()
    const selectedClipHasModifications = useSelectedClipHasModifications()

    const handleTrim = () => {
        if (!selectedClip) return

        onOpenExportModal('trim', async (preset: ExportPreset) => {
            try {
                startExport()

                let blob: Blob

                // Determine if we need to apply transforms or just trim
                const needsTransform = hasTransformsApplied(selectedClip.transform) ||
                    (preset.aspectRatio !== 'original' && preset.resolution.width > 0)

                if (needsTransform) {
                    const { transform } = selectedClip
                    // Use preset aspect ratio if not 'original', otherwise use clip's transform
                    const aspectRatio = preset.aspectRatio !== 'original'
                        ? preset.aspectRatio
                        : transform.aspectRatio

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
                            // Pass target resolution from preset
                            targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                            targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                        },
                        (progress, message) => setProcessing(progress, message)
                    )
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
                const error = wrapError(err, 'trim', { filename: selectedClip.name })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleMerge = () => {
        if (!canMerge) return

        onOpenExportModal('merge', async (_preset: ExportPreset) => {
            try {
                startExport()

                const blob = await mergeVideos(
                    clips.map((clip: Clip) => ({
                        file: clip.file,
                        trimStart: clip.trimStart,
                        trimEnd: clip.trimEnd
                    })),
                    (progress, message) => setProcessing(progress, message)
                )

                const url = URL.createObjectURL(blob)
                setComplete(url)
            } catch (err) {
                const error = wrapError(err, 'merge', { clipCount: clips.length })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleSplit = () => {
        if (!selectedClip || !canSplit) return

        onOpenExportModal('split', async (_preset: ExportPreset) => {
            try {
                startExport()

                const blobs = await splitVideo(
                    selectedClip.file,
                    selectedClip.trimStart,
                    selectedClip.trimEnd,
                    selectedClip.splitPoints,
                    (progress, message) => setProcessing(progress, message)
                )

                // Download all segments with sanitized filenames
                const baseName = sanitizeFilename(
                    selectedClip.name.replace(/\.[^/.]+$/, '')
                )
                blobs.forEach((blob, i) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${baseName}_part${i + 1}.mp4`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                })

                setComplete('') // No single URL, files already downloaded
            } catch (err) {
                const error = wrapError(err, 'split', {
                    filename: selectedClip.name,
                    splitPoints: selectedClip.splitPoints.length
                })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleExportSelected = () => {
        if (selectedClip) {
            handleTrim()
        }
    }

    const handleReverse = async () => {
        if (!selectedClip) return

        const duration = selectedClip.trimEnd - selectedClip.trimStart
        if (duration > 10) {
            if (!confirm(`This clip is ${Math.round(duration)}s long. Reversing long clips (>10s) may consume significant memory and crash the application. Do you want to proceed?`)) {
                return
            }
        }

        setLoading(true)
        try {
            const reversedBlob = await reverseVideo(selectedClip.file, selectedClip.trimStart, selectedClip.trimEnd)
            // Create new file with meaningful name
            const nameParts = selectedClip.name.split('.')
            const ext = nameParts.pop()
            const baseName = nameParts.join('.')
            const newName = `${baseName} (Reversed).${ext || 'mp4'}`

            const newFile = new File([reversedBlob], newName, { type: selectedClip.file.type })
            const clip = await createClipFromFile(newFile)
            if (clip) {
                addClip(clip)
                selectClip(clip.id)
            }
        } catch (error) {
            console.error('[ActionBar] Failed to reverse clip:', error)
            alert('Failed to reverse clip. The browser might have run out of memory. Try using a shorter clip or lower resolution.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <footer className={styles.actionBar} role="toolbar" aria-label="Video editing actions">
            <div className={styles.group}>
                <button
                    className="btn"
                    onClick={handleTrim}
                    disabled={!selectedClip}
                    title="Trim selected clip"
                >
                    <Scissors size={16} />
                    Export Trim
                </button>

                <button
                    className={`btn ${canSplit ? 'btn-warning' : ''}`}
                    onClick={handleSplit}
                    disabled={!canSplit}
                    title={canSplit ? `Export ${selectedClip!.splitPoints.length + 1} segments` : 'Add split points in timeline first'}
                >
                    <Split size={16} />
                    {canSplit ? `Export ${selectedClip!.splitPoints.length + 1} Segments` : 'Export Split'}
                </button>

                <button
                    className="btn"
                    onClick={handleMerge}
                    disabled={!canMerge}
                    title="Merge and export all clips"
                >
                    <Link size={16} />
                    Export Merge
                </button>

                <button
                    className="btn"
                    onClick={() => selectedClip && revertClip(selectedClip.id)}
                    disabled={!selectedClip || !selectedClipHasModifications}
                    title="Revert selected clip to original"
                >
                    <RotateCcw size={16} />
                    Revert
                </button>

                <button
                    className="btn"
                    onClick={handleReverse}
                    disabled={!selectedClip}
                    title="Create a reversed copy of the selected clip"
                >
                    <Rewind size={16} />
                    Reverse
                </button>

                <div className={styles.divider} />

                <button
                    className="btn"
                    onClick={reset}
                    disabled={!hasClips}
                    title="Reset project (clear all)"
                >
                    <RotateCcw size={16} />
                    Reset
                </button>
            </div>

            <div className={styles.group}>
                <button
                    className={`btn btn-primary ${styles.exportBtn}`}
                    onClick={handleExportSelected}
                    disabled={!selectedClip}
                >
                    <Download size={16} />
                    Export Selected
                </button>
            </div>
        </footer>
    )
}
