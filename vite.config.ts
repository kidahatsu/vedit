import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                id: '/',
                start_url: '/',
                scope: '/',
                name: 'VEdit - Video Editor',
                short_name: 'VEdit',
                description: 'Lightweight high-performance video editor with WebGPU and local AI',
                theme_color: '#0e0e14',
                background_color: '#0e0e14',
                display: 'standalone',
                orientation: 'any',
                categories: ['multimedia', 'video', 'utilities'],
                icons: [
                    {
                        src: '/favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                globIgnores: ['**/*.wasm'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: { cacheName: 'google-fonts-stylesheets' }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-webfonts',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ]
            }
        })
    ],
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('@huggingface/transformers') || id.includes('onnxruntime')) {
                            return 'vendor-ai'
                        }
                        if (id.includes('@ffmpeg/ffmpeg') || id.includes('@ffmpeg/util')) {
                            return 'vendor-ffmpeg'
                        }
                        if (id.includes('mediabunny') || id.includes('mp4box') || id.includes('mp4-muxer')) {
                            return 'vendor-media'
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons'
                        }
                        if (id.includes('react') || id.includes('react-dom') || id.includes('zustand') || id.includes('zundo')) {
                            return 'vendor-core'
                        }
                    }
                }
            }
        }
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    },
    preview: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    }
})
