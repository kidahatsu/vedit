---
name: Zustand State Management
description: Patterns for using Zustand stores in the VEdit application.
---

# Zustand State Management

VEdit uses `zustand` for global state management and `zundo` for undo/redo functionality.

## 1. Store Structure
- Stores are located in `src/store/`.
- `editorStore.ts`: Main store for the editor state (clips, timeline, current time).
- `exportStore.ts`: State related to export settings and progress.

## 2. Best Practices
- **Selectors**: Always use selectors when consuming state to minimize re-renders.
  ```tsx
  // Bad
  const { currentTime } = useEditorStore();
  
  // Good
  const currentTime = useEditorStore((state) => state.currentTime);
  ```
- **Shallow Comparison**: If selecting multiple values, use `useShallow` or multiple hooks.
- **Actions**: Define actions inside the store (or `set` calls) rather than in components.

## 3. Zundo (Undo/Redo)
- The store is wrapped with `temporal` from `zundo`.
- Access undo/redo via `useStore.temporal.getState().undo()`.
- **Exclude**: Transient state (like `isPlaying` or `playbackProgress`) should likely be excluded/ignored by `zundo` to prevent spamming the history stack. Check `partialize` or `handleSet` config if available.

## 4. Updates
- We use immutable update patterns (though Zustand + Immer is common, check if Immer middleware is used. If not, spread objects manually).
  ```typescript
  set((state) => ({ clips: [...state.clips, newClip] }))
  ```
