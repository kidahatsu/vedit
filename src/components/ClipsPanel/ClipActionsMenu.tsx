/**
 * @fileoverview Context menu for clip-level quick actions.
 * Provides Reverse, Revert, Duplicate, and Delete options.
 */

import { useEffect, useRef } from 'react'
import { RotateCcw, Copy, Trash2, Rewind, Download } from 'lucide-react'
import styles from './ClipActionsMenu.module.css'

interface ClipActionsMenuProps {
    clipId: string
    clipName: string
    position: { x: number; y: number }
    hasModifications: boolean
    onRevert: () => void
    onReverse: () => void
    onDuplicate: () => void
    onDownload: () => void
    onDelete: () => void
    onClose: () => void
}

export function ClipActionsMenu({
    clipName,
    position,
    hasModifications,
    onRevert,
    onReverse,
    onDuplicate,
    onDownload,
    onDelete,
    onClose,
}: ClipActionsMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    // Adjust position to keep menu in viewport
    const adjustedPosition = {
        left: Math.min(position.x, window.innerWidth - 180),
        top: Math.min(position.y, window.innerHeight - 150),
    }

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={adjustedPosition}
            role="menu"
            aria-label={`Actions for ${clipName}`}
        >
            <button
                className={styles.menuItem}
                onClick={() => {
                    onDownload()
                    onClose()
                }}
                role="menuitem"
            >
                <Download size={14} />
                Download
            </button>

            <button
                className={styles.menuItem}
                onClick={() => {
                    onReverse()
                    onClose()
                }}
                role="menuitem"
            >
                <Rewind size={14} />
                Reverse Clip
            </button>

            <button
                className={styles.menuItem}
                onClick={() => {
                    onDuplicate()
                    onClose()
                }}
                role="menuitem"
            >
                <Copy size={14} />
                Duplicate
                <span className={styles.shortcut}>Ctrl+D</span>
            </button>

            <button
                className={`${styles.menuItem} ${!hasModifications ? styles.disabled : ''}`}
                onClick={() => {
                    if (hasModifications) {
                        onRevert()
                        onClose()
                    }
                }}
                disabled={!hasModifications}
                role="menuitem"
            >
                <RotateCcw size={14} />
                Revert
                <span className={styles.shortcut}>Ctrl+Shift+R</span>
            </button>

            <div className={styles.divider} />

            <button
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => {
                    onDelete()
                    onClose()
                }}
                role="menuitem"
            >
                <Trash2 size={14} />
                Delete
            </button>
        </div>
    )
}
