import { HelpCircle, Settings } from 'lucide-react'
import styles from './Header.module.css'

export function Header() {
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
                <button className="btn btn-icon" title="Help">
                    <HelpCircle size={18} />
                </button>
                <button className="btn btn-icon" title="Settings">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    )
}
