/**
 * @fileoverview IndexedDB storage layer for project persistence.
 * Uses the 'idb' library for a Promise-based IndexedDB API.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Clip, TransformState } from '../store/types'

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
    thumbnailUrl: string | null // Kept for legacy/structure, but usually null or rebuild on load
    thumbnailBlob?: Blob // New field for persisting the thumbnail
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
 * Get or initialize the IndexedDB database.
 */
async function getDB(): Promise<IDBPDatabase<VEditDB>> {
    if (!dbPromise) {
        dbPromise = openDB<VEditDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Create project store
                if (!db.objectStoreNames.contains(STORE_PROJECT)) {
                    db.createObjectStore(STORE_PROJECT, { keyPath: 'id' })
                }

                // Create clips store with project index
                if (!db.objectStoreNames.contains(STORE_CLIPS)) {
                    const clipStore = db.createObjectStore(STORE_CLIPS, { keyPath: 'id' })
                    clipStore.createIndex('by-project', 'projectId')
                }
            },
        })
    }
    return dbPromise
}

/**
 * Convert a Clip to StoredClip (File → Blob).
 * Now async to fetch thumbnail blob from URL.
 */
async function clipToStoredClip(clip: Clip, projectId: string, order: number): Promise<StoredClip> {
    let thumbnailBlob: Blob | undefined

    if (clip.thumbnailUrl && clip.thumbnailUrl.startsWith('blob:')) {
        try {
            const response = await fetch(clip.thumbnailUrl)
            thumbnailBlob = await response.blob()
        } catch (e) {
            console.warn('[Storage] Failed to fetch thumbnail blob for persistence:', e)
        }
    }

    return {
        id: clip.id,
        projectId,
        file: clip.file, // File extends Blob, so this works
        name: clip.name,
        duration: clip.duration,
        thumbnailUrl: null, // Don't store the blob URL string, it's useless after reload
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
function storedClipToClip(stored: StoredClip): Clip {
    // Reconstruct File from Blob
    const file = new File([stored.file], stored.name, { type: stored.file.type })

    // Recreate thumbnail URL from blob if exists
    let thumbnailUrl = stored.thumbnailUrl

    // If we have a stored blob, create a new valid URL
    if (stored.thumbnailBlob) {
        thumbnailUrl = URL.createObjectURL(stored.thumbnailBlob)
    }
    // If no blob but we have a blob URL, it's dead (from legacy persistence), so kill it to avoid 404s
    else if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        console.warn('[Storage] Found dead blob URL without backing blob, invalidating:', thumbnailUrl)
        thumbnailUrl = null
    }

    return {
        id: stored.id,
        file,
        name: stored.name,
        duration: stored.duration,
        thumbnailUrl,
        trimStart: stored.trimStart,
        trimEnd: stored.trimEnd,
        splitPoints: [...stored.splitPoints],
        transform: { ...stored.transform },
    }
}

/**
 * Save the current project state to IndexedDB.
 */
export async function saveProject(
    clips: Clip[],
    selectedClipId: string | null
): Promise<void> {
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

        // Delete existing clips for this project
        const existingClips = await clipsStore.index('by-project').getAllKeys(DEFAULT_PROJECT_ID)
        for (const key of existingClips) {
            await clipsStore.delete(key)
        }

        // Save new clips
        for (let i = 0; i < clips.length; i++) {
            const storedClip = await clipToStoredClip(clips[i], DEFAULT_PROJECT_ID, i)
            await clipsStore.put(storedClip)
        }

        await tx.done
        console.log('[Storage] Project saved:', clips.length, 'clips')
    } catch (error) {
        console.error('[Storage] Failed to save project:', error)
        throw error
    }
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
            console.log('[Storage] No saved project found')
            return null
        }

        // Get clips for this project, ordered
        const storedClips = await db.getAllFromIndex(STORE_CLIPS, 'by-project', DEFAULT_PROJECT_ID)
        storedClips.sort((a, b) => a.order - b.order)

        const clips = storedClips.map(storedClipToClip)

        console.log('[Storage] Project loaded:', clips.length, 'clips')

        return {
            clips,
            selectedClipId: project.selectedClipId,
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
        const db = await getDB()
        const tx = db.transaction([STORE_PROJECT, STORE_CLIPS], 'readwrite')

        await tx.objectStore(STORE_PROJECT).delete(DEFAULT_PROJECT_ID)

        const clipsStore = tx.objectStore(STORE_CLIPS)
        const clipKeys = await clipsStore.index('by-project').getAllKeys(DEFAULT_PROJECT_ID)
        for (const key of clipKeys) {
            await clipsStore.delete(key)
        }

        await tx.done
        console.log('[Storage] Project cleared')
    } catch (error) {
        console.error('[Storage] Failed to clear project:', error)
    }
}

/**
 * Check if IndexedDB is available.
 */
export function isStorageAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
}
