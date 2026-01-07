/**
 * @fileoverview Custom error classes for video processing operations.
 * Provides structured error information for debugging and user-friendly messages.
 */

/** Types of video processing operations */
export type VideoOperation = 'trim' | 'merge' | 'split' | 'transform' | 'load'

/** User-friendly error messages by operation type */
const USER_MESSAGES: Record<VideoOperation, string> = {
    trim: 'Failed to trim the video. The file may be corrupted or in an unsupported format.',
    merge: 'Failed to merge videos. Ensure all clips have compatible formats and codecs.',
    split: 'Failed to split the video. Try reducing the number of split points.',
    transform: 'Failed to apply transformations. Try simplifying the edits.',
    load: 'Failed to load the video file. The file may be corrupted.',
}

/**
 * Custom error class for video processing failures.
 * Provides structured error information including operation context,
 * original cause, and user-friendly messages.
 *
 * @example
 * ```ts
 * try {
 *     await trimVideo(file, start, end)
 * } catch (err) {
 *     const error = new VideoProcessingError('trim', err, { filename: file.name })
 *     console.error(error.message)    // Technical details
 *     showToast(error.userMessage)    // User-friendly message
 * }
 * ```
 */
export class VideoProcessingError extends Error {
    /** The name of this error class */
    public readonly name = 'VideoProcessingError'

    /**
     * Creates a new VideoProcessingError.
     *
     * @param operation - The type of operation that failed
     * @param cause - The original error that caused the failure
     * @param context - Additional context about the failure (e.g., filename, timestamps)
     */
    constructor(
        public readonly operation: VideoOperation,
        public readonly cause: unknown,
        public readonly context?: Record<string, unknown>
    ) {
        const causeMessage = cause instanceof Error ? cause.message : String(cause)
        super(`${operation} failed: ${causeMessage}`)

        // Maintains proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, VideoProcessingError.prototype)
    }

    /**
     * User-friendly error message suitable for display in the UI.
     * Returns a helpful message without technical details.
     */
    get userMessage(): string {
        return USER_MESSAGES[this.operation] ?? 'An unexpected error occurred while processing the video.'
    }

    /**
     * Converts the error to a plain object for logging/serialization.
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            operation: this.operation,
            message: this.message,
            userMessage: this.userMessage,
            context: this.context,
            cause: this.cause instanceof Error ? this.cause.message : this.cause,
        }
    }
}

/**
 * Type guard to check if an unknown error is a VideoProcessingError.
 *
 * @param error - The error to check
 * @returns True if the error is a VideoProcessingError
 */
export function isVideoProcessingError(error: unknown): error is VideoProcessingError {
    return error instanceof VideoProcessingError
}

/**
 * Wraps an unknown error in a VideoProcessingError if it isn't one already.
 * Useful for consistent error handling in catch blocks.
 *
 * @param error - The error to wrap
 * @param operation - The operation type to use if wrapping
 * @param context - Additional context to include
 * @returns A VideoProcessingError instance
 *
 * @example
 * ```ts
 * catch (err) {
 *     const error = wrapError(err, 'trim', { filename })
 *     setError(error.userMessage)
 * }
 * ```
 */
export function wrapError(
    error: unknown,
    operation: VideoOperation,
    context?: Record<string, unknown>
): VideoProcessingError {
    if (isVideoProcessingError(error)) {
        return error
    }
    return new VideoProcessingError(operation, error, context)
}
