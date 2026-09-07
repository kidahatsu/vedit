/**
 * @fileoverview Conditional logger that only outputs in development mode.
 * Prevents debug statements from appearing in production builds.
 */

const isDev = import.meta.env.DEV

/**
 * Log a debug message (development only)
 */
export function debug(tag: string, ...args: unknown[]): void {
    if (isDev) {
        console.log(`[${tag}]`, ...args)
    }
}

/**
 * Log a warning message (development only)
 */
export function warn(tag: string, ...args: unknown[]): void {
    if (isDev) {
        console.warn(`[${tag}]`, ...args)
    }
}
