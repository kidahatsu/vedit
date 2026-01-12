import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore, DEFAULT_TRANSFORM, type Clip } from './editorStore'

// Helper to create mock clips
function createMockClip(overrides: Partial<Clip> = {}): Clip {
    return {
        id: `clip-${Date.now()}-${Math.random()}`,
        file: new File([''], 'test.mp4', { type: 'video/mp4' }),
        name: 'test.mp4',
        duration: 60,
        thumbnailUrl: null,
        trimStart: 0,
        trimEnd: 60,
        splitPoints: [],
        transform: { ...DEFAULT_TRANSFORM },
        ...overrides,
    }
}

describe('editorStore', () => {
    beforeEach(() => {
        useEditorStore.getState().reset()
    })

    describe('addClip', () => {
        it('adds a clip and selects it', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)

            const state = useEditorStore.getState()
            expect(state.clips).toHaveLength(1)
            expect(state.clips[0].id).toBe('test-1')
            expect(state.selectedClipId).toBe('test-1')
        })
    })

    describe('removeClip', () => {
        it('removes a clip', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().removeClip('test-1')

            expect(useEditorStore.getState().clips).toHaveLength(0)
        })

        it('clears selection if removed clip was selected', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().removeClip('test-1')

            expect(useEditorStore.getState().selectedClipId).toBeNull()
        })
    })

    describe('selectClip', () => {
        it('updates selected clip ID', () => {
            const clip1 = createMockClip({ id: 'clip-1' })
            const clip2 = createMockClip({ id: 'clip-2' })
            useEditorStore.getState().addClip(clip1)
            useEditorStore.getState().addClip(clip2)

            useEditorStore.getState().selectClip('clip-1')
            expect(useEditorStore.getState().selectedClipId).toBe('clip-1')
        })
    })

    describe('updateClipTrim', () => {
        it('updates trim start and end', () => {
            const clip = createMockClip({ id: 'test-1', trimStart: 0, trimEnd: 60 })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().updateClipTrim('test-1', 10, 50)

            const updated = useEditorStore.getState().clips[0]
            expect(updated.trimStart).toBe(10)
            expect(updated.trimEnd).toBe(50)
        })
    })

    describe('split points', () => {
        it('adds split point within trim range', () => {
            const clip = createMockClip({ id: 'test-1', trimStart: 0, trimEnd: 60 })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().addSplitPoint('test-1', 30)

            expect(useEditorStore.getState().clips[0].splitPoints).toEqual([30])
        })

        it('ignores split points outside trim range', () => {
            const clip = createMockClip({ id: 'test-1', trimStart: 10, trimEnd: 50 })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().addSplitPoint('test-1', 5)
            useEditorStore.getState().addSplitPoint('test-1', 55)

            expect(useEditorStore.getState().clips[0].splitPoints).toEqual([])
        })

        it('removes split point', () => {
            const clip = createMockClip({ id: 'test-1', splitPoints: [20, 30, 40] })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().removeSplitPoint('test-1', 30)

            expect(useEditorStore.getState().clips[0].splitPoints).toEqual([20, 40])
        })

        it('clears all split points', () => {
            const clip = createMockClip({ id: 'test-1', splitPoints: [20, 30, 40] })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().clearSplitPoints('test-1')

            expect(useEditorStore.getState().clips[0].splitPoints).toEqual([])
        })
    })

    describe('transform', () => {
        it('updates transform properties', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().updateTransform('test-1', { rotation: 90, flipH: true })

            const transform = useEditorStore.getState().clips[0].transform
            expect(transform.rotation).toBe(90)
            expect(transform.flipH).toBe(true)
        })

        it('resets transform to defaults', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().updateTransform('test-1', { rotation: 180, speed: 2 })
            useEditorStore.getState().resetTransform('test-1')

            const transform = useEditorStore.getState().clips[0].transform
            expect(transform.rotation).toBe(0)
            expect(transform.speed).toBe(1)
        })
    })

    describe('toggleSplitMode', () => {
        it('toggles split mode', () => {
            expect(useEditorStore.getState().splitMode).toBe(false)
            useEditorStore.getState().toggleSplitMode()
            expect(useEditorStore.getState().splitMode).toBe(true)
            useEditorStore.getState().toggleSplitMode()
            expect(useEditorStore.getState().splitMode).toBe(false)
        })
    })

    describe('reset', () => {
        it('resets all state', () => {
            const clip = createMockClip({ id: 'test-1' })
            useEditorStore.getState().addClip(clip)
            useEditorStore.getState().toggleSplitMode()
            useEditorStore.getState().reset()

            const state = useEditorStore.getState()
            expect(state.clips).toHaveLength(0)
            expect(state.selectedClipId).toBeNull()
            expect(state.splitMode).toBe(false)
        })
    })
})
