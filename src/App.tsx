import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { ClipsPanel } from './components/ClipsPanel'
import { VideoPlayer } from './components/VideoPlayer'
import { Timeline } from './components/Timeline'
import { ActionBar } from './components/ActionBar'
import { ExportModal } from './components/ExportModal'
import { TransformPanel } from './components/TransformPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoSave } from './hooks/useAutoSave'
import { useSelectedClip } from './store/selectors'
import { type ExportPreset } from './store/exportPresets'
import styles from './App.module.css'

export type ExportMode = 'trim' | 'merge' | 'split'

function App() {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportCallback, setExportCallback] = useState<((preset: ExportPreset) => void) | null>(null)

    const selectedClip = useSelectedClip()

    // Register global keyboard shortcuts (undo/redo)
    useKeyboardShortcuts()

    // Auto-save project to IndexedDB
    const { status: saveStatus } = useAutoSave()

    // Get video duration for the modal
    const videoDuration = selectedClip
        ? selectedClip.trimEnd - selectedClip.trimStart
        : 0

    const handleOpenExportModal = useCallback((
        _mode: ExportMode,
        onExport: (preset: ExportPreset) => void
    ) => {
        setExportCallback(() => onExport)
        setIsExportModalOpen(true)
    }, [])

    const handleCloseExportModal = useCallback(() => {
        setIsExportModalOpen(false)
        setExportCallback(null)
    }, [])

    const handleStartExport = useCallback((preset: ExportPreset) => {
        if (exportCallback) {
            exportCallback(preset)
        }
    }, [exportCallback])

    return (
        <div className={styles.app}>
            <Header saveStatus={saveStatus} />

            <main className={styles.main}>
                <ClipsPanel />

                <div className={styles.content}>
                    <VideoPlayer />
                    <TransformPanel />
                    <Timeline />
                </div>
            </main>

            <ActionBar onOpenExportModal={handleOpenExportModal} />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={handleCloseExportModal}
                videoDuration={videoDuration}
                onStartExport={handleStartExport}
            />
        </div>
    )
}

export default App
