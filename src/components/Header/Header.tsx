import { HelpCircle, Settings, Undo2, Redo2 } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import styles from './Header.module.css'

export function Header() {
    const undo = useEditorStore((state) => state.undo)
    const redo = useEditorStore((state) => state.redo)
    const canUndo = useEditorStore((state) => state.canUndo)
    const canRedo = useEditorStore((state) => state.canRedo)

    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <svg
                    className={styles.logoIcon}
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d4ff" />
                            <stop offset="100%" stopColor="#ff00aa" />
                        </linearGradient>
                    </defs>
                    <rect width="100" height="100" rx="20" fill="#0d0d14" />
                    <polygon points="35,25 35,75 75,50" fill="url(#logoGrad)" />
                </svg>
                <span className="gradient-text">VEdit</span>
            </div>

            <div className={styles.actions}>
                <button
                    className="btn btn-icon"
                    title="Undo (Ctrl+Z)"
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Undo"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    className="btn btn-icon"
                    title="Redo (Ctrl+Shift+Z)"
                    onClick={redo}
                    disabled={!canRedo}
                    aria-label="Redo"
                >
                    <Redo2 size={18} />
                </button>
                <div className={styles.divider} />
                <button className="btn btn-icon" title="Help" aria-label="Help">
                    <HelpCircle size={18} />
                </button>
                <button className="btn btn-icon" title="Settings" aria-label="Settings">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    )
}

