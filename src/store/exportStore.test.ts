import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useExportStore } from './exportStore'

// Mock URL.revokeObjectURL
const revokeObjectURLMock = vi.fn()
vi.stubGlobal('URL', {
    ...URL,
    revokeObjectURL: revokeObjectURLMock,
    createObjectURL: vi.fn(() => 'blob:test-url'),
})

describe('exportStore', () => {
    beforeEach(() => {
        useExportStore.getState().reset()
        revokeObjectURLMock.mockClear()
    })

    it('starts in idle state', () => {
        const state = useExportStore.getState()
        expect(state.status).toBe('idle')
        expect(state.progress).toBe(0)
        expect(state.outputUrl).toBeNull()
    })

    it('startExport sets loading state', () => {
        useExportStore.getState().startExport()
        const state = useExportStore.getState()
        expect(state.status).toBe('loading-ffmpeg')
        expect(state.progress).toBe(0)
        expect(state.message).toBe('Loading video engine...')
    })

    it('setProcessing updates progress', () => {
        useExportStore.getState().setProcessing(50, 'Processing...')
        const state = useExportStore.getState()
        expect(state.status).toBe('processing')
        expect(state.progress).toBe(50)
        expect(state.message).toBe('Processing...')
    })

    it('setComplete stores output URL', () => {
        useExportStore.getState().setComplete('blob:test-output')
        const state = useExportStore.getState()
        expect(state.status).toBe('complete')
        expect(state.progress).toBe(100)
        expect(state.outputUrl).toBe('blob:test-output')
    })

    it('setError stores error message', () => {
        useExportStore.getState().setError('Something went wrong')
        const state = useExportStore.getState()
        expect(state.status).toBe('error')
        expect(state.error).toBe('Something went wrong')
    })

    it('reset clears state and revokes blob URL', () => {
        // Set up complete state with a URL
        useExportStore.getState().setComplete('blob:test-output')
        expect(useExportStore.getState().outputUrl).toBe('blob:test-output')

        // Reset
        useExportStore.getState().reset()

        // Should revoke the URL
        expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-output')

        // Should reset state
        const state = useExportStore.getState()
        expect(state.status).toBe('idle')
        expect(state.outputUrl).toBeNull()
    })

    it('reset does not call revokeObjectURL when no URL exists', () => {
        useExportStore.getState().reset()
        expect(revokeObjectURLMock).not.toHaveBeenCalled()
    })
})
