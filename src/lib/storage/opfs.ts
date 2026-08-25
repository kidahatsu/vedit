/**
 * @fileoverview Origin Private File System (OPFS) storage driver.
 * Enables zero-copy high-throughput disk reads/writes for multi-gigabyte video files.
 */

import { debug, warn } from '../logger'

const OPFS_DIR_NAME = 'vedit_clips'

/**
 * Checks if the Origin Private File System (OPFS) is supported in current environment
 */
export async function isOPFSSupported(): Promise<boolean> {
    try {
        return (
            typeof navigator !== 'undefined' &&
            'storage' in navigator &&
            typeof navigator.storage?.getDirectory === 'function'
        )
    } catch {
        return false
    }
}

/**
 * Get or create the dedicated VEdit clips directory in OPFS
 */
async function getClipsDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
        if (!(await isOPFSSupported())) return null
        const root = await navigator.storage.getDirectory()
        return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true })
    } catch (err) {
        warn('OPFS', 'Failed to access clips directory:', err)
        return null
    }
}

/**
 * Save a clip's video file to OPFS
 */
export async function saveClipToOPFS(clipId: string, file: File | Blob): Promise<boolean> {
    if (!file || file.size === 0) return false
    const dir = await getClipsDirectory()
    if (!dir) return false

    try {
        // Check if clip already exists with identical non-zero size to avoid unnecessary file locking
        try {
            const existingHandle = await dir.getFileHandle(`clip_${clipId}.bin`, { create: false })
            const existingFile = await existingHandle.getFile()
            if (existingFile && existingFile.size === file.size && existingFile.size > 0) {
                return true
            }
        } catch {
            // File does not exist yet, proceed to write
        }

        const fileHandle = await dir.getFileHandle(`clip_${clipId}.bin`, { create: true })
        const writable = await fileHandle.createWritable()
        try {
            await writable.write(file)
        } finally {
            await writable.close()
        }
        debug('OPFS', `Saved clip ${clipId} to OPFS (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
        return true
    } catch (err) {
        warn('OPFS', `Failed to write clip ${clipId} to OPFS:`, err)
        return false
    }
}

/**
 * Read a clip's video file from OPFS
 */
export async function readClipFromOPFS(
    clipId: string,
    name: string,
    type: string
): Promise<File | null> {
    const dir = await getClipsDirectory()
    if (!dir) return null

    try {
        const fileHandle = await dir.getFileHandle(`clip_${clipId}.bin`)
        const blob = await fileHandle.getFile()
        if (!blob || blob.size === 0) {
            warn('OPFS', `Clip ${clipId} in OPFS was empty`)
            return null
        }
        return new File([blob.slice(0, blob.size, blob.type)], name, { type: type || blob.type || 'video/mp4' })
    } catch (err) {
        warn('OPFS', `Clip ${clipId} not found in OPFS:`, err)
        return null
    }
}

/**
 * Delete a specific clip file from OPFS
 */
export async function deleteClipFromOPFS(clipId: string): Promise<void> {
    const dir = await getClipsDirectory()
    if (!dir) return

    try {
        await dir.removeEntry(`clip_${clipId}.bin`)
        debug('OPFS', `Deleted clip ${clipId} from OPFS`)
    } catch {
        // Ignore if file doesn't exist
    }
}

/**
 * Clear all stored clip files in OPFS
 */
export async function clearAllOPFS(): Promise<void> {
    try {
        if (!(await isOPFSSupported())) return
        const root = await navigator.storage.getDirectory()
        await root.removeEntry(OPFS_DIR_NAME, { recursive: true }).catch(() => {})
        debug('OPFS', 'All OPFS clip files cleared')
    } catch (err) {
        warn('OPFS', 'Error clearing OPFS:', err)
    }
}

export const clearOPFS = clearAllOPFS
