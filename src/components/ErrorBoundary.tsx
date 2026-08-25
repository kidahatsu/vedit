import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] Uncaught component render error:', error, errorInfo)
    }

    private handleReload = (): void => {
        window.location.reload()
    }

    private handleReset = (): void => {
        try {
            localStorage.clear()
            sessionStorage.clear()
        } catch {
            // ignore
        }
        window.location.reload()
    }

    public render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    role="alert"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        backgroundColor: '#0d0d14',
                        color: '#ffffff',
                        fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center',
                    }}
                >
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff6b6b' }}>
                        Something went wrong
                    </h1>
                    <p style={{ maxWidth: '500px', color: '#8b8b9e', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        An unexpected interface error occurred. You can attempt to reload the workspace or reset cached session data.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '0.6rem 1.2rem',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            Reload Editor
                        </button>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '0.6rem 1.2rem',
                                background: '#27273a',
                                border: '1px solid #3f3f5a',
                                borderRadius: '6px',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            Reset Session
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
