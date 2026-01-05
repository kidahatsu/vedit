import { Scissors, Link, RotateCcw, Download, Split } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useExportStore } from '../../store/exportStore'
import { trimVideo, mergeVideos, splitVideo } from '../../lib/ffmpeg'
import styles from './ActionBar.module.css'

interface ActionBarProps {
    onOpenExportModal: () => void
}

export function ActionBar({ onOpenExportModal }: ActionBarProps) {
    const { clips, selectedClipId, reset } = useEditorStore()
    const { startExport, setProcessing, setComplete, setError } = useExportStore()

    const selectedClip = clips.find((c) => c.id === selectedClipId)
    const hasClips = clips.length > 0
    const canMerge = clips.length >= 2
    const canSplit = selectedClip && selectedClip.splitPoints.length > 0


    const handleTrim = async () => {
        if (!selectedClip) return

        try {
            startExport()
            onOpenExportModal()

            const blob = await trimVideo(
                selectedClip.file,
                selectedClip.trimStart,
                selectedClip.trimEnd,
                (progress, message) => setProcessing(progress, message)
            )

            const url = URL.createObjectURL(blob)
            setComplete(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed')
        }
    }

    const handleMerge = async () => {
        if (!canMerge) return

        try {
            startExport()
            onOpenExportModal()

            const blob = await mergeVideos(
                clips.map((clip) => ({
                    file: clip.file,
                    trimStart: clip.trimStart,
                    trimEnd: clip.trimEnd
                })),
                (progress, message) => setProcessing(progress, message)
            )

            const url = URL.createObjectURL(blob)
            setComplete(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Merge failed')
        }
    }

    const handleSplit = async () => {
        if (!selectedClip || !canSplit) return

        try {
            startExport()
            onOpenExportModal()

            const blobs = await splitVideo(
                selectedClip.file,
                selectedClip.trimStart,
                selectedClip.trimEnd,
                selectedClip.splitPoints,
                (progress, message) => setProcessing(progress, message)
            )

            // Download all segments
            const baseName = selectedClip.name.replace(/\.[^/.]+$/, '')
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
            setError(err instanceof Error ? err.message : 'Split failed')
        }
    }

    const handleExportSelected = () => {
        if (selectedClip) {
            handleTrim()
        }
    }

    return (
        <footer className={styles.actionBar}>
            <div className={styles.group}>
                <button
                    className="btn"
                    onClick={handleTrim}
                    disabled={!selectedClip}
                    title="Trim selected clip"
                >
                    <Scissors size={16} />
                    Trim
                </button>

                <button
                    className={`btn ${canSplit ? 'btn-warning' : ''}`}
                    onClick={handleSplit}
                    disabled={!canSplit}
                    title={canSplit ? `Split into ${selectedClip!.splitPoints.length + 1} parts` : 'Add split points first'}
                >
                    <Split size={16} />
                    {canSplit ? `✂️ Split → ${selectedClip!.splitPoints.length + 1} parts` : 'Split (0)'}
                </button>

                <button
                    className="btn"
                    onClick={handleMerge}
                    disabled={!canMerge}
                    title="Merge all clips"
                >
                    <Link size={16} />
                    Merge All
                </button>

                <div className={styles.divider} />

                <button
                    className="btn"
                    onClick={reset}
                    disabled={!hasClips}
                    title="Reset all"
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

