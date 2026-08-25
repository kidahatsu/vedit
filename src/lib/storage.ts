/**
 * @fileoverview IndexedDB storage layer for project persistence.
 * Uses the 'idb' library for a Promise-based IndexedDB API with OPFS binary caching.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Clip, TransformState } from '../store/types'
import { DEFAULT_TRANSFORM } from '../store/types'
import { debug, warn } from './logger'
import { saveClipToOPFS, readClipFromOPFS, deleteClipFromOPFS, clearAllOPFS } from './storage/opfs'
export { isOPFSSupported, deleteClipFromOPFS } from './storage/opfs'

// Database configuration
const DB_NAME = 'vedit-projects'
const DB_VERSION = 1
const STORE_PROJECT = 'project'
const STORE_CLIPS = 'clips'

/**
 * Stored project metadata (auto-save uses a single default project).
 */
export interface StoredProject {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    selectedClipId: string | null
}

/**
 * Stored clip data with video file as Blob.
 */
export interface StoredClip {
    id: string
    projectId: string
    file: Blob
    name: string
    duration: number
    thumbnailUrl: string | null
    thumbnailBlob?: Blob
    trimStart: number
    trimEnd: number
    splitPoints: number[]
    transform: TransformState
    order: number
}

/**
 * IndexedDB schema definition.
 */
interface VEditDB extends DBSchema {
    [STORE_PROJECT]: {
        key: string
        value: StoredProject
    }
    [STORE_CLIPS]: {
        key: string
        value: StoredClip
        indexes: { 'by-project': string }
    }
}

// Default project ID for auto-save
const DEFAULT_PROJECT_ID = 'default-project'

let dbPromise: Promise<IDBPDatabase<VEditDB>> | null = null

/**
 * Get or initialize the IndexedDB database with resilient multi-tab lifecycle management.
 */
async function getDB(): Promise<IDBPDatabase<VEditDB>> {
    if (!dbPromise) {
        dbPromise = openDB<VEditDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains(STORE_PROJECT)) {
                        db.createObjectStore(STORE_PROJECT, { keyPath: 'id' })
                    }
                    if (!db.objectStoreNames.contains(STORE_CLIPS)) {
                        const clipStore = db.createObjectStore(STORE_CLIPS, { keyPath: 'id' })
                        clipStore.createIndex('by-project', 'projectId')
                    }
                }
            },
            blocked() {
                warn('Storage', 'Database upgrade blocked by another open tab.')
            },
            blocking() {
                warn('Storage', 'Database connection blocking another tab; closing.')
                if (dbPromise) {
                    dbPromise.then((db) => db.close()).catch(() => {})
                    dbPromise = null
                }
            },
            terminated() {
                dbPromise = null
            },
        })
    }
    return dbPromise
}

class AsyncLockQueue {
    private queue: Promise<void> = Promise.resolve()

    run<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue = this.queue
                .catch(() => {}) // Ensure previous failure does not block future queue executions
                .then(async () => {
                    try {
                        resolve(await task())
                    } catch (err) {
                        reject(err)
                    }
                })
        })
    }
}

export const storageQueue = new AsyncLockQueue()

/**
 * Convert a Clip to StoredClip (File → Blob).
 */
async function clipToStoredClip(clip: Clip, projectId: string, order: number): Promise<StoredClip> {
    let thumbnailBlob: Blob | undefined

    if (clip.thumbnailUrl) {
        try {
            const response = await fetch(clip.thumbnailUrl)
            thumbnailBlob = await response.blob()
        } catch (e) {
            warn('Storage', 'Failed to fetch thumbnail blob for persistence:', e)
        }
    }

    // Try saving clip binary to OPFS
    let savedToOpfs = false
    if (clip.file && clip.file.size > 0) {
        try {
            savedToOpfs = await saveClipToOPFS(clip.id, clip.file)
        } catch (e) {
            warn('Storage', 'Failed to cache clip in OPFS:', e)
        }
    }

    return {
        id: clip.id,
        projectId,
        // If saved to OPFS, use a lightweight placeholder in IndexedDB to avoid DataError: Failed to write blobs
        file: savedToOpfs ? new Blob([], { type: clip.file.type || 'video/mp4' }) : clip.file,
        name: clip.name,
        duration: clip.duration,
        thumbnailUrl: null,
        thumbnailBlob,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        splitPoints: [...clip.splitPoints],
        transform: { ...clip.transform },
        order,
    }
}

/**
 * Convert a StoredClip to Clip (Blob → File).
 */
async function storedClipToClip(stored: StoredClip): Promise<Clip | null> {
    // Try reading from OPFS first
    let file = await readClipFromOPFS(stored.id, stored.name, stored.file?.type || 'video/mp4')

    // Fallback to IndexedDB stored blob if OPFS returned null and blob is non-empty
    if ((!file || file.size === 0) && stored.file && stored.file.size > 0) {
        file = new File([stored.file], stored.name, { type: stored.file?.type || 'video/mp4' })
    }

    // If file is still null or 0-byte, skip corrupt clip
    if (!file || file.size === 0) {
        warn('Storage', `Clip ${stored.id} (${stored.name}) has no valid file content, skipping.`)
        return null
    }

    // Recreate thumbnail URL from blob if exists
    let thumbnailUrl = stored.thumbnailUrl

    if (stored.thumbnailBlob) {
        thumbnailUrl = URL.createObjectURL(stored.thumbnailBlob)
    }

    return {
        id: stored.id,
        name: stored.name,
        file,
        duration: stored.duration,
        thumbnailUrl,
        trimStart: stored.trimStart,
        trimEnd: stored.trimEnd,
        splitPoints: [...stored.splitPoints],
        transform: {
            ...DEFAULT_TRANSFORM,
            ...(stored.transform || {}),
        },
    }
}

/**
 * Save the current project state to IndexedDB with serialized locking.
 */
export async function saveProject(
    clips: Clip[],
    selectedClipId: string | null
): Promise<void> {
    return storageQueue.run(async () => {
        // 1. Prepare and fetch all stored clips OUTSIDE the transaction to avoid TransactionInactiveError
        const storedClips: StoredClip[] = []
        for (let i = 0; i < clips.length; i++) {
            storedClips.push(await clipToStoredClip(clips[i], DEFAULT_PROJECT_ID, i))
        }

        const db = await getDB()
        const tx = db.transaction([STORE_PROJECT, STORE_CLIPS], 'readwrite')

        try {
            const projectStore = tx.objectStore(STORE_PROJECT)
            const clipsStore = tx.objectStore(STORE_CLIPS)

            // Get or create project
            const existingProject = await projectStore.get(DEFAULT_PROJECT_ID)
            const project: StoredProject = {
                id: DEFAULT_PROJECT_ID,
                name: existingProject?.name ?? 'Untitled Project',
                createdAt: existingProject?.createdAt ?? new Date(),
                updatedAt: new Date(),
                selectedClipId,
            }

            // Save project metadata
            await projectStore.put(project)

            // Delete removed clips from IndexedDB and OPFS
            const currentClipIds = new Set(clips.map((c) => c.id))
            const existingKeys = await clipsStore.index('by-project').getAllKeys(DEFAULT_PROJECT_ID)

            for (const key of existingKeys) {
                const clipId = key as string
                if (!currentClipIds.has(clipId)) {
                    await clipsStore.delete(clipId)
                    deleteClipFromOPFS(clipId).catch(() => {})
                }
            }

            // Save all clips with fallback for blob storage errors
            for (const storedClip of storedClips) {
                try {
                    await clipsStore.put(storedClip)
                } catch {
                    // Fallback to storing metadata with empty blob placeholder
                    await clipsStore.put({
                        ...storedClip,
                        file: new Blob([], { type: 'video/mp4' })
                    })
                }
            }

            await tx.done
            debug('Storage', 'Project saved:', clips.length, 'clips')
        } catch (error) {
            console.error('[Storage] Failed to save project:', error)
            throw error
        }
    })
}

/**
 * Load the saved project from IndexedDB.
 * Returns null if no saved project exists.
 */
export async function loadProject(): Promise<{
    clips: Clip[]
    selectedClipId: string | null
} | null> {
    try {
        const db = await getDB()

        // Get project
        const project = await db.get(STORE_PROJECT, DEFAULT_PROJECT_ID)
        if (!project) {
            debug('Storage', 'No saved project found')
            return null
        }

        // Get clips for this project, ordered
        const storedClips = await db.getAllFromIndex(STORE_CLIPS, 'by-project', DEFAULT_PROJECT_ID)
        storedClips.sort((a, b) => a.order - b.order)

        const loadedClips = await Promise.all(storedClips.map(storedClipToClip))
        const clips: Clip[] = loadedClips.filter((c): c is Clip => c !== null)

        debug('Storage', 'Project loaded:', clips.length, 'clips')

        return {
            clips,
            selectedClipId: clips.some((c) => c.id === project.selectedClipId)
                ? project.selectedClipId
                : clips[0]?.id ?? null,
        }
    } catch (error) {
        console.error('[Storage] Failed to load project:', error)
        return null
    }
}

/**
 * Clear all saved project data.
 */
export async function clearProject(): Promise<void> {
    try {
        await clearAllOPFS().catch(() => {})

        const db = await getDB()
        const tx = db.transaction([STORE_PROJECT, STORE_CLIPS], 'readwrite')

        await tx.objectStore(STORE_PROJECT).delete(DEFAULT_PROJECT_ID)

        const clipsStore = tx.objectStore(STORE_CLIPS)
        const clipKeys = await clipsStore.index('by-project').getAllKeys(DEFAULT_PROJECT_ID)
        for (const key of clipKeys) {
            await clipsStore.delete(key)
        }

        await tx.done
        debug('Storage', 'Project cleared')
    } catch (error) {
        console.error('[Storage] Failed to clear project:', error)
    }
}

export const clearStoredProject = clearProject

/**
 * Check if IndexedDB is available in the current environment.
 */
export function isStorageAvailable(): boolean {
    try {
        return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
    } catch {
        return false
    }
}
