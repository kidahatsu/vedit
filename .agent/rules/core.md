# User Rules for VEdit

These rules are applied to all agent operations in this workspace.

## 1. Browser-Only Constraint
- This is a **PWA (Progressive Web App)** running entirely in the browser.
- **FORBIDDEN**: Do not suggest or implement Node.js runtime code (e.g., `fs.readFile`, `child_process`, `Buffer`, `process.cwd()`) in any file within `src/`.
- **ALLOWED**: `navigator`, `window`, `fetch`, `File`, `Blob`, `SharedArrayBuffer`.

## 2. Tech Stack Consistency
- **Languages**: TypeScript (`.ts`, `.tsx`), CSS Modules (`.module.css`).
- **Frameworks**: React 19, Vite, Vitest.
- **State**: Zustand.
- **Icons**: Lucide React.
- **Video**: FFmpeg WASM.

## 3. Styling
- Use **CSS Modules** for component-specific styles.
- Use global variables in `src/index.css` (or `App.css`) for colors/vars if available.
- Avoid inline styles for complex styling.

## 4. Code Quality
- Function components only.
- Proper typing (avoid `any` where possible).
- If changing state logic, double-check `zundo` compatibility (is this action undoable?).
