import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from './Timeline'
import { useEditorStore, DEFAULT_TRANSFORM } from '../../store/editorStore'

describe('Timeline Component', () => {
    beforeEach(() => {
        useEditorStore.getState().reset()
    })

    it('renders empty timeline message when no clips exist', () => {
        render(<Timeline />)
        expect(screen.getByText(/Import clips to start editing/i)).toBeInTheDocument()
    })

    it('renders clip track and handles when a clip is loaded', () => {
        const mockClip = {
            id: 'test-clip-1',
            file: new File([''], 'sample.mp4', { type: 'video/mp4' }),
            name: 'sample.mp4',
            duration: 10,
            thumbnailUrl: null,
            trimStart: 2,
            trimEnd: 8,
            splitPoints: [5],
            transform: { ...DEFAULT_TRANSFORM },
        }

        useEditorStore.getState().addClip(mockClip)
        useEditorStore.getState().selectClip('test-clip-1')

        render(<Timeline />)
        expect(screen.getByText('sample.mp4')).toBeInTheDocument()
    })
})
