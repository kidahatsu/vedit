import { X, Download, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { useExportStore } from '../../store/exportStore'
import styles from './ExportModal.module.css'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
    const { status, progress, message, outputUrl, error, reset } = useExportStore()

    if (!isOpen) return null

    const handleClose = () => {
        if (status !== 'processing' && status !== 'loading-ffmpeg') {
            reset()
            onClose()
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

    const isProcessing = status === 'processing' || status === 'loading-ffmpeg'

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {status === 'complete' ? 'Export Complete' :
                            status === 'error' ? 'Export Failed' : 'Exporting...'}
                    </h2>
                    {!isProcessing && (
                        <button className={styles.closeBtn} onClick={handleClose}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        {status === 'complete' ? (
                            <CheckCircle size={32} className={styles.iconSuccess} />
                        ) : status === 'error' ? (
                            <AlertCircle size={32} className={styles.iconError} />
                        ) : (
                            <Loader size={32} className={styles.iconSpinner} />
                        )}
                    </div>

                    {isProcessing && (
                        <>
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

                    {status === 'complete' && (
                        <p className={styles.message}>
                            Your video is ready to download!
                        </p>
                    )}

                    {status === 'error' && (
                        <div className={styles.error}>{error}</div>
                    )}

                    <div className={styles.actions}>
                        {status === 'complete' && (
                            <>
                                <button className="btn" onClick={handleClose}>
                                    Close
                                </button>
                                <button className="btn btn-primary" onClick={handleDownload}>
                                    <Download size={16} />
                                    Download MP4
                                </button>
                            </>
                        )}

                        {status === 'error' && (
                            <button className="btn" onClick={handleClose}>
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
