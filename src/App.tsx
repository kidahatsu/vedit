import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { ClipsPanel } from './components/ClipsPanel'
import { VideoPlayer } from './components/VideoPlayer'
import { InspectorPanel } from './components/InspectorPanel'
import { Timeline } from './components/Timeline'
import { StatusBar } from './components/StatusBar'
import { ExportModal } from './components/ExportModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoSave } from './hooks/useAutoSave'
import { useSelectedClip } from './store/selectors'
import { useExportStore } from './store/exportStore'
import { isGPUExportSupported, exportVideoWithWebGPU } from './lib/webgpu/gpuExport'
import { transformVideo, trimVideo } from './lib/ffmpeg'
import { hasTransformsApplied } from './utils/videoTransforms'
import { EXPORT_PRESETS, type ExportPreset } from './store/exportPresets'
import { ErrorBoundary } from './components/ErrorBoundary'
import styles from './App.module.css'

export type ExportMode = 'trim' | 'merge' | 'split'

function App() {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportCallback, setExportCallback] = useState<((preset: ExportPreset) => void) | null>(null)

    const selectedClip = useSelectedClip()
    const { startExport, setProcessing, setComplete, setError } = useExportStore()

    // Register global keyboard shortcuts (undo/redo)
    useKeyboardShortcuts()

    // Auto-save project to IndexedDB / OPFS
    const { status: saveStatus } = useAutoSave()

    const [exportMode, setExportMode] = useState<ExportMode>('trim')

    // Get video duration for the modal
    const videoDuration = selectedClip
        ? selectedClip.trimEnd - selectedClip.trimStart
        : 0

    const handleOpenExportModal = useCallback((
        mode: ExportMode,
        onExport: (preset: ExportPreset) => void
    ) => {
        setExportMode(mode)
        setExportCallback(() => onExport)
        setIsExportModalOpen(true)
        if (mode === 'split' || mode === 'merge') {
            const defaultPreset = EXPORT_PRESETS.find((p) => p.id === 'custom') || EXPORT_PRESETS[0]
            onExport(defaultPreset)
        }
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

    // Primary Header Export Action Handler
    const handleHeaderExport = useCallback(() => {
        if (!selectedClip) return
        handleOpenExportModal('trim', async (preset: ExportPreset) => {
            try {
                startExport()
                let blob: Blob
                const needsTransform = hasTransformsApplied(selectedClip.transform) ||
                    (preset.aspectRatio !== 'original' && preset.resolution.width > 0)
                const gpuSupported = await isGPUExportSupported().catch(() => false)

                if (needsTransform) {
                    const { transform } = selectedClip
                    const aspectRatio = preset.aspectRatio !== 'original' ? preset.aspectRatio : transform.aspectRatio
                    if (gpuSupported && transform.speed === 1 && aspectRatio === 'original') {
                        blob = await exportVideoWithWebGPU({
                            file: selectedClip.file,
                            startTime: selectedClip.trimStart,
                            endTime: selectedClip.trimEnd,
                            transform: {
                                rotation: transform.rotation,
                                flipH: transform.flipH,
                                flipV: transform.flipV,
                                cropX: transform.cropX,
                                cropY: transform.cropY,
                                cropWidth: transform.cropWidth,
                                cropHeight: transform.cropHeight,
                                brightness: transform.brightness,
                                contrast: transform.contrast,
                                saturation: transform.saturation,
                            },
                            width: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                            height: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            onProgress: (progress, message) => setProcessing(progress, message),
                        }).catch(async () => {
                            return transformVideo(
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
                                    brightness: transform.brightness,
                                    contrast: transform.contrast,
                                    saturation: transform.saturation,
                                    targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                    targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                                },
                                (progress, message) => setProcessing(progress, message)
                            )
                        })
                    } else {
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
                                brightness: transform.brightness,
                                contrast: transform.contrast,
                                saturation: transform.saturation,
                                targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            },
                            (progress, message) => setProcessing(progress, message)
                        )
                    }
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
                console.error('[App] Export failed:', err)
                setError('Failed to export video.')
            }
        })
    }, [selectedClip, handleOpenExportModal, startExport, setProcessing, setComplete, setError])

    return (
        <ErrorBoundary>
            <div className={styles.app}>
                <Header saveStatus={saveStatus} onExportSelected={handleHeaderExport} />

                {/* 3-Pane Top Studio Workspace */}
                <main className={styles.studioWorkspace}>
                    <ClipsPanel />

                    <div className={styles.centerCanvas}>
                        <VideoPlayer />
                    </div>

                    <InspectorPanel />
                </main>

                {/* Dedicated Magnetic Timeline */}
                <Timeline onOpenExportModal={handleOpenExportModal} />

                {/* Studio Bottom Status & Meta Bar */}
                <StatusBar />

                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={handleCloseExportModal}
                    videoDuration={videoDuration}
                    onStartExport={handleStartExport}
                    skipPresetSelection={exportMode === 'split' || exportMode === 'merge'}
                    exportMode={exportMode}
                />
            </div>
        </ErrorBoundary>
    )
}

export default App
