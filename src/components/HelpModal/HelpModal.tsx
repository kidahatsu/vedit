import { useEffect } from 'react'
import { X, Keyboard, Sparkles, BookOpen } from 'lucide-react'
import styles from './HelpModal.module.css'

interface HelpModalProps {
    isOpen: boolean
    onClose: () => void
}

const SHORTCUTS = [
    { key: 'Space', desc: 'Play / Pause Video' },
    { key: 'Ctrl + Z / ⌘Z', desc: 'Undo Action' },
    { key: 'Ctrl + Shift + Z / ⌘⇧Z', desc: 'Redo Action' },
    { key: 'I', desc: 'Set Trim In Point (Start)' },
    { key: 'O', desc: 'Set Trim Out Point (End)' },
    { key: 'S', desc: 'Add Split Point at Playhead' },
    { key: 'M', desc: 'Mute / Unmute Audio' },
    { key: '< / >', desc: 'Step -1 / +1 Frame' },
    { key: '← / →', desc: 'Seek 1 Frame (Shift: 1s)' },
    { key: 'Del / Backspace', desc: 'Delete Selected Split' },
]

const FEATURES = [
    {
        title: '🤖 AI Silence Auto-Cut',
        desc: 'Detects natural pauses and speech gaps using client-side Voice Activity Detection (VAD) and places precision split markers.'
    },
    {
        title: '🎙️ Auto Subtitles (Whisper WebGPU)',
        desc: 'Transcribes audio in real-time on your GPU via OpenAI Whisper WebGPU and exports synchronized .srt subtitles.'
    },
    {
        title: '⚡ Instant WebGPU Visual Transforms',
        desc: 'Perform 90°/180° rotations, horizontal/vertical flips, and custom crops in zero rendering time with hardware shaders.'
    },
    {
        title: '🚀 OPFS & High-Speed WebCodecs',
        desc: 'Files stream directly to private Origin Private File System (OPFS) and encode via native WebCodecs hardware encoders.'
    }
]

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-modal-title"
            >
                <div className={styles.header}>
                    <h2 id="help-modal-title" className={styles.title}>
                        Help & User Guide
                    </h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close help modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Keyboard size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Keyboard Shortcuts
                        </h3>
                        <div className={styles.shortcutGrid}>
                            {SHORTCUTS.map((s) => (
                                <div key={s.key} className={styles.shortcutItem}>
                                    <span className={styles.shortcutDesc}>{s.desc}</span>
                                    <span className={styles.kbd}>{s.key}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Smart Editing Tools
                        </h3>
                        <div className={styles.featureList}>
                            {FEATURES.map((f) => (
                                <div key={f.title} className={styles.featureItem}>
                                    <div className={styles.featureName}>{f.title}</div>
                                    <p className={styles.featureDesc}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <BookOpen size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Privacy & Local Storage
                        </h3>
                        <p className={styles.featureDesc} style={{ margin: 0 }}>
                            VEdit is a 100% private, client-side video editor. None of your videos, audio, or metadata are ever uploaded to an external server. All AI models and video processing run locally on your device.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
