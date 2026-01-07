/**
 * @fileoverview Memoized selectors for the editor store.
 * Eliminates redundant clips.find() calls across components.
 */

import { useCallback } from 'react'
import { useEditorStore, type Clip } from './editorStore'

/**
 * Selector hook for the currently selected clip.
 * Memoized to prevent unnecessary re-renders.
 *
 * @returns The selected clip or undefined if no clip is selected
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *     const selectedClip = useSelectedClip()
 *     if (!selectedClip) return <div>No clip selected</div>
 *     return <div>{selectedClip.name}</div>
 * }
 * ```
 */
export function useSelectedClip(): Clip | undefined {
    return useEditorStore(
        useCallback(
            (state) => state.clips.find((c) => c.id === state.selectedClipId),
            []
        )
    )
}

/**
 * Selector hook for whether any clips are loaded.
 *
 * @returns True if at least one clip exists
 */
export function useHasClips(): boolean {
    return useEditorStore((state) => state.clips.length > 0)
}

/**
 * Selector hook for whether multiple clips exist (merge is possible).
 *
 * @returns True if two or more clips exist
 */
export function useCanMerge(): boolean {
    return useEditorStore((state) => state.clips.length >= 2)
}

/**
 * Selector hook for whether splitting is possible on the selected clip.
 *
 * @returns True if the selected clip has split points defined
 */
export function useCanSplit(): boolean {
    return useEditorStore(
        useCallback(
            (state) => {
                const clip = state.clips.find((c) => c.id === state.selectedClipId)
                return clip !== undefined && clip.splitPoints.length > 0
            },
            []
        )
    )
}

/**
 * Selector hook for the selected clip's ID.
 * Lightweight alternative when you only need the ID.
 *
 * @returns The selected clip ID or null
 */
export function useSelectedClipId(): string | null {
    return useEditorStore((state) => state.selectedClipId)
}

/**
 * Selector hook for split mode state.
 *
 * @returns True if split mode is active
 */
export function useSplitMode(): boolean {
    return useEditorStore((state) => state.splitMode)
}

/**
 * Selector hook for crop mode state.
 *
 * @returns True if crop mode is active
 */
export function useCropMode(): boolean {
    return useEditorStore((state) => state.cropMode)
}
