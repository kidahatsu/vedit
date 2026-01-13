/**
 * @fileoverview History store with undo/redo functionality using zundo temporal middleware.
 * Provides temporal state tracking for the editor store.
 */

import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Clip, TransformState } from './types'
import { DEFAULT_TRANSFORM } from './types'
import { generateId } from '../lib/utils'

// Re-export types
export type { Clip, TransformState }
export { DEFAULT_TRANSFORM }

/**
 * The undoable portion of editor state.
 * Excludes transient state like isLoading, splitMode, cropMode, seekPreviewTime.
 */
export interface UndoableState {
    clips: Clip[]
    selectedClipId: string | null
}

/**
 * Actions for modifying undoable state.
 */
export interface UndoableActions {
    // Clip management
    addClip: (clip: Clip) => void
    removeClip: (id: string) => void
    selectClip: (id: string | null) => void

    // Trim operations
    updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void

    // Split operations
    addSplitPoint: (id: string, time: number) => void
    removeSplitPoint: (id: string, time: number) => void
    updateSplitPoint: (id: string, oldTime: number, newTime: number) => void
    clearSplitPoints: (id: string) => void

    // Clip ordering
    reorderClips: (fromIndex: number, toIndex: number) => void

    // Transform operations
    updateTransform: (id: string, transform: Partial<TransformState>) => void
    resetTransform: (id: string) => void

    // Clip quick actions
    revertClip: (id: string) => void
    duplicateClip: (id: string) => void
    revertAllClips: () => void

    // Reset
    reset: () => void
}

export type UndoableStore = UndoableState & UndoableActions

/**
 * Initial undoable state.
 */
const initialState: UndoableState = {
    clips: [],
    selectedClipId: null,
}

// Serialize clip for comparison (excluding File objects)
const serializeClip = (c: Clip) => ({
    id: c.id,
    name: c.name,
    duration: c.duration,
    trimStart: c.trimStart,
    trimEnd: c.trimEnd,
    splitPoints: c.splitPoints,
    transform: c.transform,
})

/**
 * History store with undo/redo capabilities.
 * Uses zundo for temporal state management.
 */
export const useHistoryStore = create<UndoableStore>()(
    temporal(
        (set) => ({
            ...initialState,

            addClip: (clip) =>
                set((state) => ({
                    clips: [...(state?.clips ?? []), clip],
                    selectedClipId: clip.id,
                })),

            removeClip: (id) =>
                set((state) => ({
                    clips: (state?.clips ?? []).filter((c) => c.id !== id),
                    selectedClipId: state?.selectedClipId === id ? null : state?.selectedClipId ?? null,
                })),

            selectClip: (id) => set({ selectedClipId: id }),

            updateClipTrim: (id, trimStart, trimEnd) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id ? { ...c, trimStart, trimEnd } : c
                    ),
                })),

            addSplitPoint: (id, time) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) => {
                        if (c.id !== id) return c
                        if (time <= c.trimStart || time >= c.trimEnd) return c
                        if (c.splitPoints.includes(time)) return c
                        return {
                            ...c,
                            splitPoints: [...c.splitPoints, time].sort((a, b) => a - b),
                        }
                    }),
                })),

            removeSplitPoint: (id, time) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id
                            ? { ...c, splitPoints: c.splitPoints.filter((t) => t !== time) }
                            : c
                    ),
                })),

            updateSplitPoint: (id, oldTime, newTime) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) => {
                        if (c.id !== id) return c
                        const filtered = c.splitPoints.filter((t) => t !== oldTime)
                        if (newTime <= c.trimStart || newTime >= c.trimEnd)
                            return { ...c, splitPoints: filtered }
                        if (filtered.includes(newTime)) return { ...c, splitPoints: filtered }
                        return {
                            ...c,
                            splitPoints: [...filtered, newTime].sort((a, b) => a - b),
                        }
                    }),
                })),

            clearSplitPoints: (id) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id ? { ...c, splitPoints: [] } : c
                    ),
                })),

            reorderClips: (fromIndex, toIndex) =>
                set((state) => {
                    const clips = [...(state?.clips ?? [])]
                    const [removed] = clips.splice(fromIndex, 1)
                    clips.splice(toIndex, 0, removed)
                    return { clips }
                }),

            updateTransform: (id, transform) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id
                            ? { ...c, transform: { ...c.transform, ...transform } }
                            : c
                    ),
                })),

            resetTransform: (id) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id ? { ...c, transform: { ...DEFAULT_TRANSFORM } } : c
                    ),
                })),

            revertClip: (id) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id
                            ? {
                                ...c,
                                trimStart: 0,
                                trimEnd: c.duration,
                                splitPoints: [],
                                transform: { ...DEFAULT_TRANSFORM },
                            }
                            : c
                    ),
                })),

            duplicateClip: (id) =>
                set((state) => {
                    const clips = state?.clips ?? []
                    const clipIndex = clips.findIndex((c) => c.id === id)
                    if (clipIndex === -1) return { clips }

                    const originalClip = clips[clipIndex]
                    const newClip: Clip = {
                        ...originalClip,
                        id: generateId(),
                        name: originalClip.name.replace(/\.([^.]+)$/, ' (copy).$1'),
                    }

                    const newClips = [...clips]
                    newClips.splice(clipIndex + 1, 0, newClip)

                    return {
                        clips: newClips,
                        selectedClipId: newClip.id,
                    }
                }),

            revertAllClips: () =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) => ({
                        ...c,
                        trimStart: 0,
                        trimEnd: c.duration,
                        splitPoints: [],
                        transform: { ...DEFAULT_TRANSFORM },
                    })),
                })),

            reset: () => set(initialState),
        }),
        {
            // Limit history to 50 states to prevent memory issues
            limit: 50,

            // Equality function to detect meaningful changes
            equality: (pastState, currentState) => {
                const pastClips = pastState.clips.map(serializeClip)
                const currentClips = currentState.clips.map(serializeClip)

                return (
                    JSON.stringify(pastClips) === JSON.stringify(currentClips) &&
                    pastState.selectedClipId === currentState.selectedClipId
                )
            },
        }
    )
)

/**
 * Get the temporal API for undo/redo operations.
 * zundo attaches a .temporal property to the store.
 */
export function useHistoryActions() {
    const temporalStore = useHistoryStore.temporal.getState()

    return {
        undo: temporalStore.undo,
        redo: temporalStore.redo,
        get canUndo() { return useHistoryStore.temporal.getState().pastStates.length > 0 },
        get canRedo() { return useHistoryStore.temporal.getState().futureStates.length > 0 },
        clear: temporalStore.clear,
    }
}

/**
 * Hook to get reactive undo/redo state.
 */
export function useCanUndo(): boolean {
    // Access temporal state reactively via store subscription
    const pastStates = useHistoryStore.temporal.getState().pastStates
    return pastStates.length > 0
}

export function useCanRedo(): boolean {
    const futureStates = useHistoryStore.temporal.getState().futureStates
    return futureStates.length > 0
}
