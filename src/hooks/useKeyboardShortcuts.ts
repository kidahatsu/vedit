/**
 * @fileoverview Global keyboard shortcuts hook.
 * Provides undo/redo and other keyboard shortcuts.
 */

import { useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

/**
 * Hook that registers global keyboard shortcuts for the editor.
 * Should be called once at the app level.
 * 
 * Shortcuts:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 * - Ctrl/Cmd + Y: Redo (Windows-style)
 */
export function useKeyboardShortcuts() {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Get undo/redo from store
        const { undo, redo, canUndo, canRedo } = useEditorStore.getState()

        // Check for Ctrl (Windows/Linux) or Cmd (Mac)
        const ctrlOrCmd = event.ctrlKey || event.metaKey

        if (!ctrlOrCmd) return

        // Undo: Ctrl/Cmd + Z (without Shift)
        if (event.key === 'z' && !event.shiftKey) {
            event.preventDefault()
            if (canUndo) {
                undo()
            }
            return
        }

        // Redo: Ctrl/Cmd + Shift + Z
        if (event.key === 'z' && event.shiftKey) {
            event.preventDefault()
            if (canRedo) {
                redo()
            }
            return
        }

        // Redo: Ctrl/Cmd + Y (Windows-style)
        if (event.key === 'y') {
            event.preventDefault()
            if (canRedo) {
                redo()
            }
            return
        }
    }, [])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

export default useKeyboardShortcuts
