import { create, useStore } from 'zustand'
import { useHistoryStore } from './historyStore'
import {
    DEFAULT_TRANSFORM,
    ASPECT_RATIO_DIMENSIONS,
    type TransformState,
    type AspectRatioPreset,
    type Clip
} from './types'

// Re-export types and constants from types.ts
export { DEFAULT_TRANSFORM, ASPECT_RATIO_DIMENSIONS }
export type { TransformState, AspectRatioPreset, Clip }

/**
 * Transient state that should NOT be tracked for undo/redo.
 * These are UI states that don't represent user edits.
 */
interface TransientState {
    isLoading: boolean
    splitMode: boolean  // When true, clicking timeline adds split markers
    cropMode: boolean   // When true, shows crop overlay on video
    seekPreviewTime: number | null  // Time to seek video preview to (set by Timeline)
}

interface TransientActions {
    setLoading: (loading: boolean) => void
    toggleSplitMode: () => void
    toggleCropMode: () => void
    setSeekPreviewTime: (time: number | null) => void
}

type TransientStore = TransientState & TransientActions

/**
 * Transient store for UI state that doesn't need undo/redo.
 */
const useTransientStore = create<TransientStore>((set) => ({
    isLoading: false,
    splitMode: false,
    cropMode: false,
    seekPreviewTime: null,

    setLoading: (isLoading) => set({ isLoading }),
    toggleSplitMode: () => set((state) => ({ splitMode: !state.splitMode })),
    toggleCropMode: () => set((state) => ({ cropMode: !state.cropMode })),
    setSeekPreviewTime: (time) => set({ seekPreviewTime: time }),
}))

/**
 * Combined editor state type for compatibility with existing code.
 */
interface EditorState extends TransientState {
    clips: Clip[]
    selectedClipId: string | null

    // All actions from both stores
    addClip: (clip: Clip) => void
    removeClip: (id: string) => void
    selectClip: (id: string | null) => void
    updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void
    addSplitPoint: (id: string, time: number) => void
    removeSplitPoint: (id: string, time: number) => void
    updateSplitPoint: (id: string, oldTime: number, newTime: number) => void
    clearSplitPoints: (id: string) => void
    reorderClips: (fromIndex: number, toIndex: number) => void
    setLoading: (loading: boolean) => void
    toggleSplitMode: () => void
    toggleCropMode: () => void
    setSeekPreviewTime: (time: number | null) => void
    updateTransform: (id: string, transform: Partial<TransformState>) => void
    resetTransform: (id: string) => void
    revertClip: (id: string) => void
    duplicateClip: (id: string) => void
    revertAllClips: () => void
    reset: () => void

    // Undo/Redo actions
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
}

/**
 * CRITICAL: Capture the initial action functions ONCE when the module loads.
 * These functions are stable and don't change after undo/redo because they
 * close over zustand's `set` function. Zundo's undo() only replaces the
 * state VALUES (clips, selectedClipId), NOT these action function references.
 * 
 * We MUST capture these before any undo operation happens.
 */
const initialHistoryState = useHistoryStore.getState()

// These action functions are stable - they close over zustand's `set` function
// and will work correctly even after undo/redo replaces the state values.
const stableActions = {
    addClip: initialHistoryState.addClip,
    removeClip: initialHistoryState.removeClip,
    selectClip: initialHistoryState.selectClip,
    updateClipTrim: initialHistoryState.updateClipTrim,
    addSplitPoint: initialHistoryState.addSplitPoint,
    removeSplitPoint: initialHistoryState.removeSplitPoint,
    updateSplitPoint: initialHistoryState.updateSplitPoint,
    clearSplitPoints: initialHistoryState.clearSplitPoints,
    reorderClips: initialHistoryState.reorderClips,
    updateTransform: initialHistoryState.updateTransform,
    resetTransform: initialHistoryState.resetTransform,
    revertClip: initialHistoryState.revertClip,
    duplicateClip: initialHistoryState.duplicateClip,
    revertAllClips: initialHistoryState.revertAllClips,
    reset: initialHistoryState.reset,
}

/**
 * Build the combined state from both stores.
 */
function buildCombinedState(): EditorState {
    // Get state VALUES from history store (these change after undo/redo)
    const historyState = useHistoryStore.getState()
    const transientState = useTransientStore.getState()
    const temporal = useHistoryStore.temporal.getState()

    // Safely get state values with defaults (in case state is transitioning)
    const clips = historyState?.clips ?? []
    const selectedClipId = historyState?.selectedClipId ?? null

    return {
        // Undoable state VALUES
        clips,
        selectedClipId,

        // Transient state
        isLoading: transientState.isLoading,
        splitMode: transientState.splitMode,
        cropMode: transientState.cropMode,
        seekPreviewTime: transientState.seekPreviewTime,

        // Use STABLE action references (captured at module load time)
        // These don't change after undo/redo
        addClip: stableActions.addClip,
        removeClip: stableActions.removeClip,
        selectClip: stableActions.selectClip,
        updateClipTrim: stableActions.updateClipTrim,
        addSplitPoint: stableActions.addSplitPoint,
        removeSplitPoint: stableActions.removeSplitPoint,
        updateSplitPoint: stableActions.updateSplitPoint,
        clearSplitPoints: stableActions.clearSplitPoints,
        reorderClips: stableActions.reorderClips,
        updateTransform: stableActions.updateTransform,
        resetTransform: stableActions.resetTransform,
        revertClip: stableActions.revertClip,
        duplicateClip: stableActions.duplicateClip,
        revertAllClips: stableActions.revertAllClips,

        // Combined reset that also resets transient state and clears history
        reset: () => {
            stableActions.reset()
            useTransientStore.setState({
                isLoading: false,
                splitMode: false,
                cropMode: false,
                seekPreviewTime: null,
            })
            // Clear undo history on reset
            temporal.clear()
        },

        // Transient actions (these are always stable)
        setLoading: transientState.setLoading,
        toggleSplitMode: transientState.toggleSplitMode,
        toggleCropMode: transientState.toggleCropMode,
        setSeekPreviewTime: transientState.setSeekPreviewTime,

        // Undo/Redo from temporal store
        // NOTE: Must wrap in functions (not bare references) for React re-renders to work properly
        undo: () => temporal.undo(),
        redo: () => temporal.redo(),
        canUndo: temporal.pastStates.length > 0,
        canRedo: temporal.futureStates.length > 0,
    }
}

/**
 * Unified editor store hook that combines history store (undoable) with transient store.
 * This provides backward compatibility with existing components.
 */
export function useEditorStore<T>(selector: (state: EditorState) => T): T {
    // Subscribe to both stores to get updates (values used for re-render triggers)
    useHistoryStore()
    useTransientStore()

    // CRITICAL: Subscribe to the temporal store using useStore hook.
    // This triggers re-renders when undo/redo changes the pastStates/futureStates.
    const _pastLength = useStore(useHistoryStore.temporal, (s) => s.pastStates.length)
    const _futureLength = useStore(useHistoryStore.temporal, (s) => s.futureStates.length)

    // Track these values to force React to recognize them as dependencies
    void _pastLength
    void _futureLength

    // Build combined state
    const combinedState = buildCombinedState()

    return selector(combinedState)
}

// Add getState for tests and direct access
useEditorStore.getState = buildCombinedState

// Export the history store for direct access if needed
export { useHistoryStore }

// Re-export useHistoryActions for keyboard shortcuts
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
