import { describe, it, expect } from 'vitest'
import { Input, BlobSource, Mp4OutputFormat, Output, BufferTarget, ALL_FORMATS } from 'mediabunny'

describe('Mediabunny Next-Gen Media Engine', () => {
    it('initializes Mediabunny classes correctly', () => {
        expect(Input).toBeDefined()
        expect(BlobSource).toBeDefined()
        expect(Output).toBeDefined()
        expect(BufferTarget).toBeDefined()
        expect(Mp4OutputFormat).toBeDefined()
    })

    it('creates Input and Output instances from BlobSource and BufferTarget', () => {
        const mockBlob = new Blob(['mock video binary'], { type: 'video/mp4' })
        const input = new Input({ source: new BlobSource(mockBlob), formats: ALL_FORMATS })
        const target = new BufferTarget()
        const output = new Output({
            target,
            format: new Mp4OutputFormat(),
        })

        expect(input).toBeDefined()
        expect(output).toBeDefined()
    })
})
