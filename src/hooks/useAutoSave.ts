/**
 * @fileoverview Auto-save hook for project persistence.
 * Debounces saves to avoid excessive writes during rapid edits.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore, useHistoryStore } from '../store/editorStore'
import { saveProject, loadProject, isStorageAvailable } from '../lib/storage'

/** Time to wait before auto-saving after changes (ms) */
const SAVE_DEBOUNCE_MS = 2000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveReturn {
    /** Current save status */
    status: SaveStatus
    /** Last error message if status is 'error' */
    error: string | null
    /** Manually trigger a save */
    saveNow: () => Promise<void>
    /** Whether storage is available */
    isAvailable: boolean
}

/**
 * Hook that auto-saves project state to IndexedDB with debounce.
 */
export function useAutoSave(): UseAutoSaveReturn {
    const [status, setStatus] = useState<SaveStatus>('idle')
    const [error, setError] = useState<string | null>(null)
    const timeoutRef = useRef<number | null>(null)
    const isAvailable = isStorageAvailable()

    // Subscribe to state changes
    const clips = useEditorStore((state) => state.clips)
    const selectedClipId = useEditorStore((state) => state.selectedClipId)

    // Track if initial load is done
    const hasLoadedRef = useRef(false)
    const isInitialMountRef = useRef(true)

    // Serialize state for comparison
    const stateRef = useRef({ clips, selectedClipId })
    stateRef.current = { clips, selectedClipId }

    // Save function
    const doSave = useCallback(async () => {
        if (!isAvailable) return

        try {
            setStatus('saving')
            setError(null)
            await saveProject(stateRef.current.clips, stateRef.current.selectedClipId)
            setStatus('saved')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
            setStatus('error')
        }
    }, [isAvailable])

    // Debounced save trigger
    const scheduleSave = useCallback(() => {
        if (!isAvailable) return

        // Clear existing timeout
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current)
        }

        // Schedule new save
        timeoutRef.current = window.setTimeout(() => {
            doSave()
        }, SAVE_DEBOUNCE_MS)
    }, [isAvailable, doSave])

    // Load on mount
    useEffect(() => {
        if (!isAvailable || hasLoadedRef.current) return

        let mounted = true

        const load = async () => {
            try {
                const saved = await loadProject()

                // If unmounted or already loaded by another effect call, abort
                if (!mounted || hasLoadedRef.current) return

                if (saved && saved.clips.length > 0) {
                    const historyStore = useHistoryStore.getState()

                    // If store already has clips, skip restoration to avoid collision
                    if (historyStore.clips.length > 0) {
                        hasLoadedRef.current = true
                        return
                    }

                    // Restore state directly without recording fake undo steps
                    useHistoryStore.setState({
                        clips: saved.clips,
                        selectedClipId: saved.selectedClipId,
                    })
                    useHistoryStore.temporal.getState().clear()
                }
                hasLoadedRef.current = true
            } catch (err) {
                console.error('[AutoSave] Failed to load project:', err)
            }
        }

        load()

        return () => {
            mounted = false
        }
    }, [isAvailable])

    // Auto-save on state changes (skip initial mount)
    useEffect(() => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false
            return
        }

        if (!hasLoadedRef.current) return

        scheduleSave()

        // Cleanup timeout on unmount
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current)
            }
        }
    }, [clips, selectedClipId, scheduleSave])

    // Save immediately on beforeunload
    useEffect(() => {
        if (!isAvailable) return

        const handleBeforeUnload = () => {
            // Synchronous save attempt (best-effort)
            saveProject(stateRef.current.clips, stateRef.current.selectedClipId).catch(() => {
                // Ignore errors on unload
            })
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAvailable])

    return {
        status,
        error,
        saveNow: doSave,
        isAvailable,
    }
}
