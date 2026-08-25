import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isWebGPUSupported, WebGPURenderer } from './renderer'

describe('WebGPU Renderer', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('detects WebGPU availability in current environment', async () => {
        const supported = await isWebGPUSupported()
        expect(typeof supported).toBe('boolean')
    })

    it('instantiates and destroys WebGPURenderer safely', () => {
        const renderer = new WebGPURenderer()
        expect(renderer).toBeDefined()
        expect(() => renderer.destroy()).not.toThrow()
    })
})
