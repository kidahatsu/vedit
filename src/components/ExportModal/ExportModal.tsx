import { useState, useEffect } from 'react'
import { X, Download, Loader, CheckCircle, AlertCircle, Smartphone, Monitor, Square, Settings } from 'lucide-react'
import { useExportStore } from '../../store/exportStore'
import { EXPORT_PRESETS, getDurationWarning, type ExportPreset } from '../../store/exportPresets'
import styles from './ExportModal.module.css'

export type ExportMode = 'trim' | 'merge' | 'split'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    /** Video duration in seconds for validation */
    videoDuration?: number
    /** Callback when export should start with selected preset */
    onStartExport?: (preset: ExportPreset) => void
    /** If true, skip preset selection and go directly to progress */
    skipPresetSelection?: boolean
    /** Type of export operation */
    exportMode?: ExportMode
}

const iconMap = {
    smartphone: Smartphone,
    monitor: Monitor,
    square: Square,
    settings: Settings,
}

export function ExportModal({
    isOpen,
    onClose,
    videoDuration = 0,
    onStartExport,
    skipPresetSelection = false,
    exportMode = 'trim',
}: ExportModalProps) {
    const { status, progress, message, outputUrl, error, reset } = useExportStore()
    const [selectedPresetId, setSelectedPresetId] = useState('custom')
    const isProcessing = status === 'processing' || status === 'loading-ffmpeg'

    // Reset selection when modal opens and listen for Escape key
    useEffect(() => {
        if (isOpen) {
            setSelectedPresetId('custom')
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isProcessing) {
                reset()
                onClose()
            }
        }

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, isProcessing, onClose, reset])

    if (!isOpen) return null

    const selectedPreset = EXPORT_PRESETS.find((p) => p.id === selectedPresetId)!
    const durationWarning = getDurationWarning(selectedPreset, videoDuration)
    const shouldSkipPresets = skipPresetSelection || exportMode === 'split' || exportMode === 'merge'
    const showPresetSelection = status === 'idle' && !shouldSkipPresets

    const handleClose = () => {
        if (!isProcessing) {
            reset()
            onClose()
        }
    }

    const handleStartExport = () => {
        if (onStartExport && selectedPreset) {
            onStartExport(selectedPreset)
        }
    }

    const handleDownload = () => {
        if (outputUrl) {
            const a = document.createElement('a')
            a.href = outputUrl
            a.download = `vedit-export-${Date.now()}.mp4`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    const modalTitle = showPresetSelection
        ? 'Export Settings'
        : status === 'complete'
            ? exportMode === 'split'
                ? 'Split Export Complete'
                : exportMode === 'merge'
                    ? 'Merge Complete'
                    : 'Export Complete'
            : status === 'error'
                ? 'Export Failed'
                : exportMode === 'split'
                    ? 'Exporting Split Video Segments...'
                    : exportMode === 'merge'
                        ? 'Merging Timeline Clips...'
                        : 'Exporting Video...'

    return (
        <div
            className={styles.overlay}
            onClick={handleClose}
            role="presentation"
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="export-modal-title"
            >
                <div className={styles.header}>
                    <h2 id="export-modal-title" className={styles.title}>
                        {modalTitle}
                    </h2>
                    {!isProcessing && (
                        <button
                            className={styles.closeBtn}
                            onClick={handleClose}
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className={styles.content}>
                    {/* Preset Selection */}
                    {showPresetSelection && (
                        <>
                            <p className={styles.subtitle}>
                                Choose an export preset or keep current studio workspace framing
                            </p>
                            <div className={styles.presetGrid}>
                                {EXPORT_PRESETS.map((preset) => {
                                    const Icon = iconMap[preset.icon]
                                    const isSelected = preset.id === selectedPresetId
                                    return (
                                        <button
                                            key={preset.id}
                                            className={`${styles.presetBtn} ${isSelected ? styles.presetBtnActive : ''}`}
                                            onClick={() => setSelectedPresetId(preset.id)}
                                            style={{
                                                '--preset-color': preset.color,
                                            } as React.CSSProperties}
                                        >
                                            <Icon size={20} />
                                            <span>{preset.name}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Preset Info */}
                            <div className={styles.presetInfo}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Framing & Resolution</span>
                                    <span className={styles.infoValue}>
                                        {selectedPreset.id === 'custom'
                                            ? 'Current Workspace Settings (Live Framing & Grading)'
                                            : `${selectedPreset.resolution.width} × ${selectedPreset.resolution.height} (${selectedPreset.aspectRatio})`}
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Target Aspect Ratio</span>
                                    <span className={styles.infoValue}>
                                        {selectedPreset.id === 'custom' ? 'Active Clip Aspect Ratio' : selectedPreset.aspectRatio}
                                    </span>
                                </div>
                                {selectedPreset.maxDuration && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Max Duration</span>
                                        <span className={styles.infoValue}>
                                            {Math.floor(selectedPreset.maxDuration / 60)}m {selectedPreset.maxDuration % 60}s
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Duration Warning */}
                            {durationWarning && (
                                <div className={styles.warning}>
                                    <AlertCircle size={16} />
                                    <span>{durationWarning}</span>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button className="btn" onClick={handleClose}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={handleStartExport}>
                                    <Download size={16} />
                                    Export Video
                                </button>
                            </div>
                        </>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <>
                            <div className={styles.iconWrapper}>
                                <Loader size={32} className={styles.iconSpinner} />
                            </div>
                            <p className={styles.message} aria-live="polite">{message}</p>
                            <div
                                className={styles.progressWrapper}
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Export progress"
                            >
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className={styles.progressText}>{progress}%</div>
                            </div>
                            <div className={styles.actions} style={{ marginTop: '1.25rem', justifyContent: 'center' }}>
                                <button className="btn" onClick={() => { reset(); onClose(); }}>
                                    Cancel Processing
                                </button>
                            </div>
                        </>
                    )}

                    {/* Complete State */}
                    {status === 'complete' && (
                        <>
                            <div className={styles.iconWrapper}>
                                <CheckCircle size={32} className={styles.iconSuccess} />
                            </div>
                            <p className={styles.message} aria-live="polite">
                                {outputUrl ? 'Your video is ready to download!' : 'All split segments downloaded successfully!'}
                            </p>
                            <div className={styles.actions}>
                                <button className="btn" onClick={handleClose}>
                                    Close
                                </button>
                                {outputUrl && (
                                    <button className="btn btn-primary" onClick={handleDownload}>
                                        <Download size={16} />
                                        Download MP4
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <>
                            <div className={styles.iconWrapper}>
                                <AlertCircle size={32} className={styles.iconError} />
                            </div>
                            <div className={styles.error} role="alert">{error}</div>
                            <div className={styles.actions}>
                                <button className="btn" onClick={handleClose}>
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
