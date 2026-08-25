import { useEffect, useState } from 'react'
import { Zap, HardDrive, Cpu } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { isWebGPUSupported } from '../../lib/webgpu/renderer'
import { formatTime } from '../../lib/utils'
import styles from './StatusBar.module.css'

export function StatusBar() {
    const [gpuActive, setGpuActive] = useState<boolean | null>(null)
    const clips = useEditorStore((state) => state.clips)
    const selectedClip = useSelectedClip()

    useEffect(() => {
        isWebGPUSupported().then(setGpuActive).catch(() => setGpuActive(false))
    }, [])

    const totalSizeMB = (
        clips.reduce((acc, c) => acc + (c.file.size || 0), 0) / (1024 * 1024)
    ).toFixed(1)

    return (
        <footer className={styles.statusBar} role="status" aria-label="Application status">
            <div className={styles.leftGroup}>
                <div className={styles.statusItem}>
                    {gpuActive ? (
                        <>
                            <span className={styles.engineDot} />
                            <Zap size={11} style={{ color: '#0a84ff' }} />
                            <span className={styles.statusHighlight}>WebGPU Hardware Accelerated</span>
                        </>
                    ) : (
                        <>
                            <Cpu size={11} style={{ color: '#ffd60a' }} />
                            <span>FFmpeg WASM Engine</span>
                        </>
                    )}
                </div>

                <div className={styles.divider} />

                {selectedClip && (
                    <div className={styles.statusItem}>
                        <span>Aspect:</span>
                        <span className={styles.mono}>{selectedClip.transform.aspectRatio}</span>
                        <span>·</span>
                        <span>Speed:</span>
                        <span className={styles.mono}>{selectedClip.transform.speed}x</span>
                    </div>
                )}
            </div>

            <div className={styles.centerGroup}>
                {selectedClip ? (
                    <div className={styles.statusItem}>
                        <span>Active:</span>
                        <span className={styles.statusHighlight}>{selectedClip.name}</span>
                        <span>({formatTime(selectedClip.trimEnd - selectedClip.trimStart)})</span>
                    </div>
                ) : (
                    <span>No clip selected</span>
                )}
            </div>

            <div className={styles.rightGroup}>
                <div className={styles.statusItem}>
                    <HardDrive size={11} />
                    <span>OPFS Synced:</span>
                    <span className={styles.mono}>{clips.length} {clips.length === 1 ? 'clip' : 'clips'} ({totalSizeMB} MB)</span>
                </div>

                <div className={styles.divider} />

                <div className={styles.statusItem}>
                    <span>⌘Z Undo · Space Play · S Split</span>
                </div>
            </div>
        </footer>
    )
}
