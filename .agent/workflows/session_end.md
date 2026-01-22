---
description: Update documentation, deploy, and generate commit message.
---

# Workflow: Session Wrap-up

Run this workflow at the end of a coding session to keep keeping documentation in sync and prepare for a clean push.

## Step 1: Analyze Changes
1. Run `git status` and `git diff --stat` to review what changed.
2. Identify:
   - **New Features** (Added)
   - **Bug Fixes** (Fixed)
   - **Refactor/Perf** (Changed/Improved)

## Step 2: Update Documentation
Update these files if they exist (create if missing in `docs/`):

1.  **[CHANGELOG.md](vedit/CHANGELOG.md)**:
    - Add/Update the `[Unreleased]` section or a new version header `## [x.y.z] - YYYY-MM-DD`.
    - Categorize changes (`### Added`, `### Fixed`, etc.).

2.  **[TODO.md](vedit/docs/TODO.md)** (if using):
    - Mark completed items.
    - Add new technical debt or TODOs discovered.

## Step 3: Run Verification
- // turbo
- `npm run typecheck`
- // turbo
- `npm run lint`
- // turbo
- `npm run test` (at least relevant unit tests)

## Step 4: Commit & Push
1.  **Stage**: `git add .` (or specific files).
2.  **Commit**: Generate a conventional commit message.
    - `feat: add video splitting`
    - `fix: correct timeline seek offset`
    - `chore: update dependencies`
3.  **Push**: `git push origin [branch-name]`.