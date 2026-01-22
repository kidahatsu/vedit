---
description: Steps to prepare the project for a new release.
---

# Workflow: Release Prep

Perform this checklist before merging to main or tagging a release.

1.  **Lint & Typecheck**:
    - Run `npm run lint` (ensure no eslint errors).
    - Run `npm run typecheck` (ensure `tsc` passes).
    - // turbo
    - Run `npm run format:check` (optional).
2.  **Test**:
    - Run `npm run test` (Vitest unit tests).
    - Ensure all tests pass.
3.  **Build**:
    - Run `npm run build`.
    - Verify `dist/` is generated and contains `index.html` and assets.
4.  **Version Bump**:
    - Update `version` in `package.json`.
    - Update `CHANGELOG.md` with new features/fixes.
5.  **Commit**:
    - Commit with message `chore: release vX.Y.Z`.
