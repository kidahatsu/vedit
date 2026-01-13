import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveProject, loadProject } from './storage'
import { DEFAULT_TRANSFORM } from '../store/types'
import type { Clip } from '../store/types'

// Mock idb
const mockDb = {
    transaction: vi.fn(),
    get: vi.fn(),
    getAllFromIndex: vi.fn(),
}

const mockTx = {
    objectStore: vi.fn(),
    done: Promise.resolve(),
}

const mockStore = {
    put: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    getAllKeys: vi.fn(),
    index: vi.fn(),
}

const mockIndex = {
    getAllKeys: vi.fn(),
}

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDb)),
}))

describe('storage.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Setup default mocks
        mockDb.transaction.mockReturnValue(mockTx)
        mockTx.objectStore.mockReturnValue(mockStore)
        mockStore.index.mockReturnValue(mockIndex)
        mockStore.getAllKeys.mockResolvedValue([])
        mockIndex.getAllKeys.mockResolvedValue([])
    })

    const mockClip: Clip = {
        id: 'clip-1',
        name: 'test.mp4',
        file: new File([''], 'test.mp4', { type: 'video/mp4' }),
        duration: 10,
        thumbnailUrl: null,
        trimStart: 0,
        trimEnd: 10,
        splitPoints: [],
        transform: DEFAULT_TRANSFORM,
    }

    it('saveProject saves project and clips', async () => {
        await saveProject([mockClip], 'clip-1')

        expect(mockDb.transaction).toHaveBeenCalledWith(['project', 'clips'], 'readwrite')
        expect(mockStore.put).toHaveBeenCalledTimes(2) // 1 project, 1 clip

        // Check project save
        expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
            id: 'default-project',
            selectedClipId: 'clip-1'
        }))

        // Check clip save
        expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
            id: 'clip-1',
            projectId: 'default-project',
            name: 'test.mp4'
        }))
    })

    it('loadProject correctly reconstructs clips', async () => {
        // Mock DB return values
        mockDb.get.mockResolvedValue({
            id: 'default-project',
            selectedClipId: 'clip-1'
        })

        const storedClip = {
            id: 'clip-1',
            projectId: 'default-project',
            file: new Blob([''], { type: 'video/mp4' }),
            name: 'test.mp4',
            duration: 10,
            transform: DEFAULT_TRANSFORM,
            splitPoints: [],
            order: 0
        }
        mockDb.getAllFromIndex.mockResolvedValue([storedClip])

        const result = await loadProject()

        expect(result).not.toBeNull()
        expect(result?.selectedClipId).toBe('clip-1')
        expect(result?.clips).toHaveLength(1)
        expect(result?.clips[0].file).toBeInstanceOf(File)
        expect(result?.clips[0].name).toBe('test.mp4')
    })

    it('loadProject returns null if project missing', async () => {
        mockDb.get.mockResolvedValue(undefined)
        const result = await loadProject()
        expect(result).toBeNull()
    })
})
