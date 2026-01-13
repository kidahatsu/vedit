import { useState } from 'react'
import { Header } from './components/Header'
import { ClipsPanel } from './components/ClipsPanel'
import { VideoPlayer } from './components/VideoPlayer'
import { Timeline } from './components/Timeline'
import { ActionBar } from './components/ActionBar'
import { ExportModal } from './components/ExportModal'
import { TransformPanel } from './components/TransformPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import styles from './App.module.css'

function App() {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // Register global keyboard shortcuts (undo/redo)
    useKeyboardShortcuts()

    return (
        <div className={styles.app}>
            <Header />

            <main className={styles.main}>
                <ClipsPanel />

                <div className={styles.content}>
                    <VideoPlayer />
                    <TransformPanel />
                    <Timeline />
                </div>
            </main>

            <ActionBar onOpenExportModal={() => setIsExportModalOpen(true)} />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
            />
        </div>
    )
}

export default App


