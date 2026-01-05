import { create } from 'zustand'

export interface Clip {
    id: string
    file: File
    name: string
    duration: number
    thumbnailUrl: string | null
    trimStart: number
    trimEnd: number
    splitPoints: number[]  // Timestamps where to split (sorted)
}

interface EditorState {
    clips: Clip[]
    selectedClipId: string | null
    isLoading: boolean
    splitMode: boolean  // When true, clicking timeline adds split markers

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
    reset: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
    clips: [],
    selectedClipId: null,
    isLoading: false,
    splitMode: false,

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

    reset: () =>
        set({ clips: [], selectedClipId: null, isLoading: false, splitMode: false })
}))

