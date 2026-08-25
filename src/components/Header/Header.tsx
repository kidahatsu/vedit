import { useState, useEffect } from 'react'
import { HelpCircle, Settings, Undo2, Redo2, Cloud, CloudOff, Loader, Zap, Cpu, Download } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { HelpModal } from '../HelpModal'
import { SettingsModal } from '../SettingsModal'
import { isWebGPUSupported } from '../../lib/webgpu/renderer'
import type { SaveStatus } from '../../hooks/useAutoSave'
import styles from './Header.module.css'

interface HeaderProps {
    /** Current auto-save status */
    saveStatus?: SaveStatus
    /** Trigger export modal */
    onExportSelected?: () => void
}

export function Header({ saveStatus = 'idle', onExportSelected }: HeaderProps) {
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [gpuActive, setGpuActive] = useState<boolean | null>(null)

    const undo = useEditorStore((state) => state.undo)
    const redo = useEditorStore((state) => state.redo)
    const canUndo = useEditorStore((state) => state.canUndo)
    const canRedo = useEditorStore((state) => state.canRedo)
    const clips = useEditorStore((state) => state.clips)
    const selectedClip = useSelectedClip()

    useEffect(() => {
        isWebGPUSupported().then(setGpuActive).catch(() => setGpuActive(false))
    }, [])

    return (
        <>
            <header className={styles.header}>
                <div className={styles.leftGroup}>
                    {/* Brand Logo */}
                    <div className={styles.logo}>
                        <div className={styles.logoBadge}>
                            <svg
                                className={styles.logoIcon}
                                viewBox="0 0 100 100"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="appleVeditGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#0a84ff" />
                                        <stop offset="100%" stopColor="#bf5af2" />
                                    </linearGradient>
                                </defs>
                                <rect width="100" height="100" rx="24" fill="#14141c" />
                                <polygon points="36,26 36,74 76,50" fill="url(#appleVeditGrad)" />
                            </svg>
                        </div>
                        <div className={styles.brandMeta}>
                            <span className="gradient-text">VEdit</span>
                            <span className={styles.proPill}>STUDIO PRO</span>
                        </div>
                    </div>

                    <div className={styles.headerDivider} />

                    {/* Hardware Engine Badge */}
                    <div className={styles.engineBadge} title={gpuActive ? 'WebGPU Hardware Shader Acceleration Active' : 'FFmpeg WASM Engine Active'}>
                        {gpuActive ? (
                            <>
                                <span className={styles.engineDotGreen} />
                                <Zap size={12} className={styles.engineIconGpu} />
                                <span>WebGPU Engine</span>
                            </>
                        ) : (
                            <>
                                <span className={styles.engineDotAmber} />
                                <Cpu size={12} className={styles.engineIconCpu} />
                                <span>FFmpeg WASM</span>
                            </>
                        )}
                    </div>

                    {/* Save Status Badge */}
                    <div className={styles.saveStatus}>
                        {saveStatus === 'saving' && (
                            <div className={styles.statusPill}>
                                <Loader size={12} className={styles.savingIcon} />
                                <span>Syncing...</span>
                            </div>
                        )}
                        {saveStatus === 'saved' && (
                            <div className={styles.statusPill} title="All edits saved locally to OPFS storage">
                                <Cloud size={12} className={styles.savedIcon} />
                                <span>OPFS Synced</span>
                            </div>
                        )}
                        {saveStatus === 'error' && (
                            <div className={`${styles.statusPill} ${styles.statusError}`}>
                                <CloudOff size={12} className={styles.errorIcon} />
                                <span>Sync Error</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.centerGroup}>
                    {clips.length > 0 && (
                        <div className={styles.projectBreadcrumb}>
                            <span className={styles.projectLabel}>Project</span>
                            <span className={styles.projectCount}>· {clips.length} {clips.length === 1 ? 'Clip' : 'Clips'}</span>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <div className={styles.historyGroup}>
                        <button
                            className="btn btn-icon"
                            title="Undo (⌘Z / Ctrl+Z)"
                            onClick={undo}
                            disabled={!canUndo}
                            aria-label="Undo"
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            className="btn btn-icon"
                            title="Redo (⇧⌘Z / Ctrl+Shift+Z)"
                            onClick={redo}
                            disabled={!canRedo}
                            aria-label="Redo"
                        >
                            <Redo2 size={15} />
                        </button>
                    </div>

                    <div className={styles.headerDivider} />

                    <button
                        className="btn btn-icon"
                        title="Shortcuts & Documentation"
                        aria-label="Help"
                        onClick={() => setIsHelpOpen(true)}
                    >
                        <HelpCircle size={15} />
                    </button>
                    <button
                        className="btn btn-icon"
                        title="Application Settings"
                        aria-label="Settings"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <Settings size={15} />
                    </button>

                    {onExportSelected && (
                        <button
                            className="btn btn-primary"
                            onClick={onExportSelected}
                            disabled={!selectedClip}
                            style={{ height: 28, padding: '0 12px', fontSize: 12, marginLeft: 4 }}
                            title="Export Video (WebGPU Accelerated)"
                        >
                            <Download size={13} />
                            <span>Export</span>
                        </button>
                    )}
                </div>
            </header>

            <HelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    )
}
