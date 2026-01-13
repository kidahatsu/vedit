import { useState, useEffect } from 'react'
import { X, Download, Loader, CheckCircle, AlertCircle, Smartphone, Monitor, Square, Settings } from 'lucide-react'
import { useExportStore } from '../../store/exportStore'
import { EXPORT_PRESETS, getDurationWarning, type ExportPreset } from '../../store/exportPresets'
import styles from './ExportModal.module.css'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    /** Video duration in seconds for validation */
    videoDuration?: number
    /** Callback when export should start with selected preset */
    onStartExport?: (preset: ExportPreset) => void
    /** If true, skip preset selection and go directly to progress (legacy mode) */
    skipPresetSelection?: boolean
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
}: ExportModalProps) {
    const { status, progress, message, outputUrl, error, reset } = useExportStore()
    const [selectedPresetId, setSelectedPresetId] = useState('custom')

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedPresetId('custom')
        }
    }, [isOpen])

    if (!isOpen) return null

    const selectedPreset = EXPORT_PRESETS.find((p) => p.id === selectedPresetId)!
    const durationWarning = getDurationWarning(selectedPreset, videoDuration)
    const showPresetSelection = status === 'idle' && !skipPresetSelection
    const isProcessing = status === 'processing' || status === 'loading-ffmpeg'

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
                        {showPresetSelection ? 'Export Settings' :
                            status === 'complete' ? 'Export Complete' :
                                status === 'error' ? 'Export Failed' : 'Exporting...'}
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
                            <p className={styles.subtitle}>Choose export format</p>
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
                                    <span className={styles.infoLabel}>Resolution</span>
                                    <span className={styles.infoValue}>
                                        {selectedPreset.resolution.width === 0
                                            ? 'Original'
                                            : `${selectedPreset.resolution.width} × ${selectedPreset.resolution.height}`}
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Aspect Ratio</span>
                                    <span className={styles.infoValue}>{selectedPreset.aspectRatio}</span>
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
                                    Export
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
                            <p className={styles.message}>{message}</p>
                            <div className={styles.progressWrapper}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className={styles.progressText}>{progress}%</div>
                            </div>
                        </>
                    )}

                    {/* Complete State */}
                    {status === 'complete' && (
                        <>
                            <div className={styles.iconWrapper}>
                                <CheckCircle size={32} className={styles.iconSuccess} />
                            </div>
                            <p className={styles.message}>
                                Your video is ready to download!
                            </p>
                            <div className={styles.actions}>
                                <button className="btn" onClick={handleClose}>
                                    Close
                                </button>
                                <button className="btn btn-primary" onClick={handleDownload}>
                                    <Download size={16} />
                                    Download MP4
                                </button>
                            </div>
                        </>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <>
                            <div className={styles.iconWrapper}>
                                <AlertCircle size={32} className={styles.iconError} />
                            </div>
                            <div className={styles.error}>{error}</div>
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
