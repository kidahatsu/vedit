import { describe, it, expect } from 'vitest'
import { isGPUExportSupported } from './gpuExport'

describe('WebGPU Video Exporter', () => {
    it('checks GPU export support without throwing', async () => {
        const supported = await isGPUExportSupported()
        expect(typeof supported).toBe('boolean')
    })
})
