---
name: FFmpeg WASM in Browser
description: Expert context for handling FFmpeg WASM in a browser-based React application.
---

# FFmpeg WASM in Browser

This project uses `@ffmpeg/ffmpeg` (WASM) to perform video editing tasks client-side. Key considerations:

## 1. SharedArrayBuffer & Headers
- **Requirement**: `SharedArrayBuffer` is required for FFmpeg WASM to function efficiently.
- **Headers**: The server serving the app must set the following headers (COOP/COEP):
  ```http
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- **Dev Server**: Vite is configured to serve these headers in `vite.config.ts`.
- **Production**: Ensure your hosting provider (Vercel, Netlify, Firebase) sends these headers.

## 2. Loading FFmpeg
- **Singleton**: The specific instance of FFmpeg is typically managed in a singleton or via a specific store (e.g., `editorStore` or a dedicated context).
- **Loading State**: Always check `ffmpeg.loaded` before running commands.
- **coreURL/wasmURL**: We usually do NOT need to manually specify these if using the default CDN, but for offline support (PWA), we might need to cache them.

## 3. File System (MEMFS)
- **Virtual FS**: FFmpeg WASM runs in a virtual file system. 
- **Write**: `await ffmpeg.writeFile('input.mp4', await fetchFile(file))`
- **Read**: `const data = await ffmpeg.readFile('output.mp4')`
- **Cleanup**: Always delete files after processing to free up memory: `await ffmpeg.deleteFile('input.mp4')`.

## 4. Performance
- **Transcoding**: Avoid full transcoding when possible. Use `-c copy` for simple trims if codecs are compatible.
- **Progress**: event listener `ffmpeg.on('progress', ...)` should be hooked into the UI to show a progress bar.

## 5. Typical Command Struct
```typescript
await ffmpeg.exec(['-i', 'input.mp4', '-ss', '00:00:10', '-to', '00:00:20', '-c', 'copy', 'output.mp4']);
```
