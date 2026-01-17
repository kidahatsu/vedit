import { create } from 'zustand'

type ExportStatus = 'idle' | 'loading-ffmpeg' | 'processing' | 'complete' | 'error'

interface ExportState {
    status: ExportStatus
    progress: number
    message: string
    outputUrl: string | null
    error: string | null

    // Actions
    startExport: () => void
    setLoadingFFmpeg: () => void
    setProcessing: (progress: number, message: string) => void
    setComplete: (outputUrl: string) => void
    setError: (error: string) => void
    reset: () => void
}

export const useExportStore = create<ExportState>((set, get) => ({
    status: 'idle',
    progress: 0,
    message: '',
    outputUrl: null,
    error: null,

    startExport: () =>
        set({
            status: 'loading-ffmpeg',
            progress: 0,
            message: 'Loading video engine...',
            outputUrl: null,
            error: null
        }),

    setLoadingFFmpeg: () =>
        set({
            status: 'loading-ffmpeg',
            progress: 10,
            message: 'Initializing FFmpeg...'
        }),

    setProcessing: (progress, message) =>
        set({
            status: 'processing',
            progress,
            message
        }),

    setComplete: (outputUrl) =>
        set({
            status: 'complete',
            progress: 100,
            message: 'Export complete!',
            outputUrl
        }),

    setError: (error) =>
        set({
            status: 'error',
            progress: 0,
            message: '',
            error
        }),

    reset: () => {
        // Revoke any existing blob URL to prevent memory leaks
        const { outputUrl } = get()
        if (outputUrl) {
            URL.revokeObjectURL(outputUrl)
        }
        set({
            status: 'idle',
            progress: 0,
            message: '',
            outputUrl: null,
            error: null
        })
    }
}))
