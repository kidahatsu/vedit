import { describe, it, expect, vi } from 'vitest'
import { debug, warn } from './logger'

describe('logger', () => {
    describe('in development mode', () => {
        it('debug() logs messages', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
            debug('Test', 'message', { data: 1 })
            expect(consoleSpy).toHaveBeenCalledWith('[Test]', 'message', { data: 1 })
            consoleSpy.mockRestore()
        })

        it('warn() logs warnings', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            warn('Test', 'warning message')
            expect(consoleSpy).toHaveBeenCalledWith('[Test]', 'warning message')
            consoleSpy.mockRestore()
        })
    })
})
