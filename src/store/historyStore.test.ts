import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from './historyStore'
import { DEFAULT_TRANSFORM, type Clip } from './types'

function createMockClip(overrides: Partial<Clip> = {}): Clip {
    return {
        id: `clip-${Math.random()}`,
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

describe('historyStore (Zundo temporal integration)', () => {
    beforeEach(() => {
        useHistoryStore.getState().reset()
        useHistoryStore.temporal.getState().clear()
    })

    it('tracks state additions in pastStates and supports undo/redo', () => {
        const temporal = useHistoryStore.temporal.getState()
        expect(temporal.pastStates).toHaveLength(0)
        expect(temporal.futureStates).toHaveLength(0)

        const clip1 = createMockClip({ id: 'c1', name: 'clip1.mp4' })
        useHistoryStore.getState().addClip(clip1)

        expect(useHistoryStore.getState().clips).toHaveLength(1)
        expect(useHistoryStore.temporal.getState().pastStates.length).toBeGreaterThan(0)

        // Add second clip
        const clip2 = createMockClip({ id: 'c2', name: 'clip2.mp4' })
        useHistoryStore.getState().addClip(clip2)
        expect(useHistoryStore.getState().clips).toHaveLength(2)

        // Undo
        useHistoryStore.temporal.getState().undo()
        expect(useHistoryStore.getState().clips).toHaveLength(1)
        expect(useHistoryStore.getState().clips[0].id).toBe('c1')

        // Redo
        useHistoryStore.temporal.getState().redo()
        expect(useHistoryStore.getState().clips).toHaveLength(2)
        expect(useHistoryStore.getState().clips[1].id).toBe('c2')
    })

    it('undoes trim updates accurately', () => {
        const clip = createMockClip({ id: 'c1', trimStart: 0, trimEnd: 60 })
        useHistoryStore.getState().addClip(clip)

        useHistoryStore.getState().updateClipTrim('c1', 10, 50)
        expect(useHistoryStore.getState().clips[0].trimStart).toBe(10)
        expect(useHistoryStore.getState().clips[0].trimEnd).toBe(50)

        useHistoryStore.temporal.getState().undo()
        expect(useHistoryStore.getState().clips[0].trimStart).toBe(0)
        expect(useHistoryStore.getState().clips[0].trimEnd).toBe(60)
    })

    it('clears temporal history on reset', () => {
        const clip = createMockClip({ id: 'c1' })
        useHistoryStore.getState().addClip(clip)
        expect(useHistoryStore.temporal.getState().pastStates.length).toBeGreaterThan(0)

        useHistoryStore.getState().reset()
        useHistoryStore.temporal.getState().clear()

        expect(useHistoryStore.getState().clips).toHaveLength(0)
        expect(useHistoryStore.temporal.getState().pastStates).toHaveLength(0)
        expect(useHistoryStore.temporal.getState().futureStates).toHaveLength(0)
    })
})
