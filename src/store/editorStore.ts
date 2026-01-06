import { create } from 'zustand'

// Aspect ratio presets with their target dimensions
export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | 'original'

export const ASPECT_RATIO_DIMENSIONS: Record<Exclude<AspectRatioPreset, 'original'>, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
}

// Transform state for each clip
export interface TransformState {
    // Aspect ratio preset (original = no change)
    aspectRatio: AspectRatioPreset

    // Crop region (0-1 normalized values, relative to original video)
    cropX: number
    cropY: number
    cropWidth: number
    cropHeight: number

    // Rotation: 0, 90, 180, 270 degrees clockwise
    rotation: 0 | 90 | 180 | 270

    // Flip flags
    flipH: boolean
    flipV: boolean

    // Playback speed multiplier
    speed: 0.5 | 0.75 | 1 | 1.5 | 2
}

export const DEFAULT_TRANSFORM: TransformState = {
    aspectRatio: 'original',
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    speed: 1,
}

export interface Clip {
    id: string
    file: File
    name: string
    duration: number
    thumbnailUrl: string | null
    trimStart: number
    trimEnd: number
    splitPoints: number[]  // Timestamps where to split (sorted)
    transform: TransformState  // Transform settings
}

interface EditorState {
    clips: Clip[]
    selectedClipId: string | null
    isLoading: boolean
    splitMode: boolean  // When true, clicking timeline adds split markers
    cropMode: boolean   // When true, shows crop overlay on video

    // Actions
    addClip: (clip: Clip) => void
    removeClip: (id: string) => void
    selectClip: (id: string | null) => void
    updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void
    addSplitPoint: (id: string, time: number) => void
    removeSplitPoint: (id: string, time: number) => void
    clearSplitPoints: (id: string) => void
    reorderClips: (fromIndex: number, toIndex: number) => void
    setLoading: (loading: boolean) => void
    toggleSplitMode: () => void
    toggleCropMode: () => void
    updateTransform: (id: string, transform: Partial<TransformState>) => void
    resetTransform: (id: string) => void
    reset: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
    clips: [],
    selectedClipId: null,
    isLoading: false,
    splitMode: false,
    cropMode: false,

    addClip: (clip) =>
        set((state) => ({
            clips: [...state.clips, clip],
            selectedClipId: clip.id
        })),

    removeClip: (id) =>
        set((state) => ({
            clips: state.clips.filter((c) => c.id !== id),
            selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
        })),

    selectClip: (id) =>
        set({ selectedClipId: id }),

    updateClipTrim: (id, trimStart, trimEnd) =>
        set((state) => ({
            clips: state.clips.map((c) =>
                c.id === id ? { ...c, trimStart, trimEnd } : c
            )
        })),

    addSplitPoint: (id, time) =>
        set((state) => ({
            clips: state.clips.map((c) => {
                if (c.id !== id) return c
                // Only add if within trim range and not duplicate
                if (time <= c.trimStart || time >= c.trimEnd) return c
                if (c.splitPoints.includes(time)) return c
                return {
                    ...c,
                    splitPoints: [...c.splitPoints, time].sort((a, b) => a - b)
                }
            })
        })),

    removeSplitPoint: (id, time) =>
        set((state) => ({
            clips: state.clips.map((c) =>
                c.id === id
                    ? { ...c, splitPoints: c.splitPoints.filter((t) => t !== time) }
                    : c
            )
        })),

    clearSplitPoints: (id) =>
        set((state) => ({
            clips: state.clips.map((c) =>
                c.id === id ? { ...c, splitPoints: [] } : c
            )
        })),

    reorderClips: (fromIndex, toIndex) =>
        set((state) => {
            const clips = [...state.clips]
            const [removed] = clips.splice(fromIndex, 1)
            clips.splice(toIndex, 0, removed)
            return { clips }
        }),

    setLoading: (isLoading) =>
        set({ isLoading }),

    toggleSplitMode: () =>
        set((state) => ({ splitMode: !state.splitMode })),

    toggleCropMode: () =>
        set((state) => ({ cropMode: !state.cropMode })),

    updateTransform: (id, transform) =>
        set((state) => ({
            clips: state.clips.map((c) =>
                c.id === id
                    ? { ...c, transform: { ...c.transform, ...transform } }
                    : c
            )
        })),

    resetTransform: (id) =>
        set((state) => ({
            clips: state.clips.map((c) =>
                c.id === id ? { ...c, transform: { ...DEFAULT_TRANSFORM } } : c
            )
        })),

    reset: () =>
        set({ clips: [], selectedClipId: null, isLoading: false, splitMode: false, cropMode: false })
}))

