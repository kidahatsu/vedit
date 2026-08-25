/**
 * @fileoverview History-tracked state management using Zustand + Zundo.
 *
 * All state in this store is tracked by Zundo for automatic undo/redo history.
 * Any action dispatched here creates a history checkpoint that can be undone.
 */

import { create, useStore } from 'zustand'
import { temporal } from 'zundo'
import type { Clip, TransformState } from './types'
import { DEFAULT_TRANSFORM } from './types'

export interface HistoryTrackedState {
    clips: Clip[]
    selectedClipId: string | null
}

export interface HistoryActions {
    // Clip management
    addClip: (clip: Clip) => void
    removeClip: (id: string) => void
    selectClip: (id: string | null) => void
    updateClipFile: (id: string, file: File) => void
    duplicateClip: (id: string) => void
    revertClip: (id: string) => void
    revertAllClips: () => void

    // Trim operations
    updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void

    // Split operations
    addSplitPoint: (id: string, time: number) => void
    removeSplitPoint: (id: string, time: number) => void
    updateSplitPoint: (id: string, oldTime: number, newTime: number) => void
    clearSplitPoints: (id: string) => void

    // Transform operations
    updateTransform: (id: string, transform: Partial<TransformState>) => void
    resetTransform: (id: string) => void

    // Multi-clip operations
    reorderClips: (fromIndex: number, toIndex: number) => void

    // Project-level reset
    reset: () => void
    loadState: (state: HistoryTrackedState) => void
}

export type HistoryStore = HistoryTrackedState & HistoryActions

const initialState: HistoryTrackedState = {
    clips: [],
    selectedClipId: null,
}

function serializeClip(c: Clip) {
    return {
        id: c.id,
        name: c.name,
        duration: c.duration,
        trimStart: c.trimStart,
        trimEnd: c.trimEnd,
        splitPoints: c.splitPoints,
        transform: c.transform,
        fileSig: `${c.file?.name}-${c.file?.size}-${c.file?.lastModified ?? 0}`,
    }
}

export const useHistoryStore = create<HistoryStore>()(
    temporal(
        (set) => ({
            ...initialState,

            addClip: (clip) =>
                set((state) => ({
                    clips: [...(state?.clips ?? []), clip],
                    selectedClipId: clip.id,
                })),

            removeClip: (id) =>
                set((state) => {
                    const currentClips = state?.clips ?? []
                    const removedIdx = currentClips.findIndex((c) => c.id === id)
                    const nextClips = currentClips.filter((c) => c.id !== id)
                    let nextSelectedId = state?.selectedClipId
                    if (state?.selectedClipId === id) {
                        if (nextClips.length === 0) {
                            nextSelectedId = null
                        } else {
                            const newIdx = Math.min(Math.max(0, removedIdx), nextClips.length - 1)
                            nextSelectedId = nextClips[newIdx].id
                        }
                    }
                    return {
                        clips: nextClips,
                        selectedClipId: nextSelectedId,
                    }
                }),

            selectClip: (id) => set({ selectedClipId: id }),

            updateClipFile: (id, file) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) => (c.id === id ? { ...c, file } : c)),
                })),

            duplicateClip: (id) =>
                set((state) => {
                    const currentClips = state?.clips ?? []
                    const clipIdx = currentClips.findIndex((c) => c.id === id)
                    if (clipIdx === -1) return state
                    const original = currentClips[clipIdx]
                    const nameParts = original.name.split('.')
                    const ext = nameParts.length > 1 ? nameParts.pop() : ''
                    const baseName = nameParts.join('.')
                    const duplicatedName = ext ? `${baseName} (copy).${ext}` : `${baseName} (copy)`
                    const duplicateId = `${original.id}-copy-${Date.now()}`
                    const duplicatedClip: Clip = {
                        ...original,
                        id: duplicateId,
                        name: duplicatedName,
                        splitPoints: [...original.splitPoints],
                        transform: { ...original.transform },
                    }
                    const nextClips = [...currentClips]
                    nextClips.splice(clipIdx + 1, 0, duplicatedClip)
                    return {
                        clips: nextClips,
                        selectedClipId: duplicateId,
                    }
                }),

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

            updateClipTrim: (id, trimStart, trimEnd) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) => {
                        if (c.id !== id) return c
                        const validTrimStart = Math.max(0, Math.min(trimStart, c.duration - 0.05))
                        const validTrimEnd = Math.min(c.duration, Math.max(trimEnd, validTrimStart + 0.05))
                        return {
                            ...c,
                            trimStart: validTrimStart,
                            trimEnd: validTrimEnd,
                            splitPoints: c.splitPoints.filter((t) => t > validTrimStart && t < validTrimEnd),
                        }
                    }),
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
                        const updated = c.splitPoints.map((t) => (t === oldTime ? newTime : t))
                        return {
                            ...c,
                            splitPoints: updated.sort((a, b) => a - b),
                        }
                    }),
                })),

            clearSplitPoints: (id) =>
                set((state) => ({
                    clips: (state?.clips ?? []).map((c) =>
                        c.id === id ? { ...c, splitPoints: [] } : c
                    ),
                })),

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

            reorderClips: (fromIndex, toIndex) =>
                set((state) => {
                    const currentClips = state?.clips ?? []
                    if (
                        fromIndex < 0 ||
                        fromIndex >= currentClips.length ||
                        toIndex < 0 ||
                        toIndex >= currentClips.length
                    ) {
                        return state
                    }
                    const newClips = [...currentClips]
                    const [movedClip] = newClips.splice(fromIndex, 1)
                    newClips.splice(toIndex, 0, movedClip)
                    return { clips: newClips }
                }),

            reset: () => set(initialState),

            loadState: (loaded) =>
                set({
                    clips: loaded.clips,
                    selectedClipId: loaded.selectedClipId,
                }),
        }),
        {
            limit: 50,
            partialize: (state) => ({
                clips: state.clips,
                selectedClipId: state.selectedClipId,
            }),
            equality: (pastState, currentState) => {
                if (pastState.clips.length !== currentState.clips.length) return false

                for (let i = 0; i < pastState.clips.length; i++) {
                    const p = serializeClip(pastState.clips[i])
                    const c = serializeClip(currentState.clips[i])
                    if (JSON.stringify(p) !== JSON.stringify(c)) return false
                }

                return pastState.selectedClipId === currentState.selectedClipId
            },
        }
    )
)

/**
 * Get the temporal API for undo/redo operations.
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
    return useStore(useHistoryStore.temporal, (state) => state.pastStates.length > 0)
}

export function useCanRedo(): boolean {
    return useStore(useHistoryStore.temporal, (state) => state.futureStates.length > 0)
}
