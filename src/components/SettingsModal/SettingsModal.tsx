import { useState, useEffect } from 'react'
import { X, HardDrive, Cpu, ShieldCheck, Trash2 } from 'lucide-react'
import { clearStoredProject } from '../../lib/storage'
import { clearOPFS } from '../../lib/storage/opfs'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [storageUsage, setStorageUsage] = useState<string>('Calculating...')
    const [hasWebGPU, setHasWebGPU] = useState<boolean>(false)
    const [clearing, setClearing] = useState<boolean>(false)

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !clearing) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        // Check WebGPU availability
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
            setHasWebGPU(true)
        }

        // Estimate Storage
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then((estimate) => {
                const usedMb = estimate.usage ? (estimate.usage / (1024 * 1024)).toFixed(1) : '0'
                const quotaMb = estimate.quota ? (estimate.quota / (1024 * 1024 * 1024)).toFixed(1) : '0'
                setStorageUsage(`${usedMb} MB used (Quota: ${quotaMb} GB)`)
            }).catch(() => {
                setStorageUsage('Available')
            })
        }

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, clearing, onClose])

    const handleClearStorage = async () => {
        if (!window.confirm('Are you sure you want to clear all locally cached project data and temporary files? This will reset the workspace.')) {
            return
        }

        setClearing(true)
        try {
            await clearStoredProject()
            await clearOPFS()
            localStorage.clear()
            sessionStorage.clear()
            window.location.reload()
        } catch (err) {
            console.error('Failed to clear storage:', err)
            setClearing(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-modal-title"
            >
                <div className={styles.header}>
                    <h2 id="settings-modal-title" className={styles.title}>
                        Settings & Diagnostics
                    </h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close settings modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <HardDrive size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Storage & Cache
                        </h3>
                        <div className={styles.row}>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowLabel}>Browser Storage Usage</span>
                                <span className={styles.rowSub}>Includes IndexedDB project state & OPFS media assets</span>
                            </div>
                            <span className={styles.badge}>{storageUsage}</span>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowLabel}>Clear Local Storage</span>
                                <span className={styles.rowSub}>Purge cached video buffers and reset editor state</span>
                            </div>
                            <button
                                className={styles.dangerBtn}
                                onClick={handleClearStorage}
                                disabled={clearing}
                            >
                                <Trash2 size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                                {clearing ? 'Clearing...' : 'Clear All'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Cpu size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Hardware Acceleration
                        </h3>
                        <div className={styles.row}>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowLabel}>WebGPU Engine</span>
                                <span className={styles.rowSub}>Hardware-accelerated shader transforms & Whisper AI</span>
                            </div>
                            <span className={`${styles.badge} ${hasWebGPU ? styles.badgeActive : ''}`}>
                                {hasWebGPU ? 'Enabled (Active)' : 'Not Supported'}
                            </span>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowLabel}>WebCodecs Hardware Muxer</span>
                                <span className={styles.rowSub}>Low-latency frame decoding & encoding</span>
                            </div>
                            <span className={`${styles.badge} ${typeof window !== 'undefined' && 'VideoEncoder' in window ? styles.badgeActive : ''}`}>
                                {typeof window !== 'undefined' && 'VideoEncoder' in window ? 'Supported' : 'Fallback (FFmpeg)'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Privacy & Build Information
                        </h3>
                        <div className={styles.row}>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowLabel}>Execution Environment</span>
                                <span className={styles.rowSub}>Pure client-side WebAssembly sandbox</span>
                            </div>
                            <span className={styles.badge}>v0.2.0-secure</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
