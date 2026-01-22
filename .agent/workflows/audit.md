---
description: Workflow to audit the codebase for quality, security, and standards.
---

# Workflow: Codebase Audit

Perform this audit periodically or before major releases to ensure the codebase remains professional-grade.

## 1. Automated Checks
- [ ] **Linting**: Run `npm run lint`. Ensure 0 errors and 0 warnings.
- [ ] **Types**: Run `npm run typecheck`. Ensure strict mode compliance.
- [ ] **Tests**: Run `npm run test`. Ensure all tests pass.
- [ ] **Formatting**: Run `npm run format:check`.

## 2. File Structure & Naming
- [ ] **Components**: Ensure all components are in `src/components/[Name]/[Name].tsx` or `src/components/[Name].tsx`.
- [ ] **Hooks**: Custom hooks should be in `src/hooks/` and start with `use`.
- [ ] **Stores**: Zustand stores in `src/store/`.
- [ ] **Assets**: Static assets in `public/` or `src/assets/` (if imported).

## 3. Code Quality Review
- [ ] **Hardcoded Values**: Check for hardcoded strings/magic numbers that should be constants.
- [ ] **Comments**: Ensure complex logic (especially in FFmpeg interaction) has "Why" comments.
- [ ] **Imports**: Check for unused imports or circular dependencies.
- [ ] **Console Logs**: Remove `console.log` debugging statements.

## 4. Security & Performance
- [ ] **Dependencies**: Run `npm audit` to check for vulnerabilities.
- [ ] **Memoization**: Check `useMemo`/`useCallback` usage in expensive components (e.g., Timeline or VideoPlayer).
- [ ] **Re-renders**: Verify state selectors are specific (avoid selecting whole state).

## 5. Documentation
- [ ] **README**: Is it up to date with the latest features?
- [ ] **Workflows**: Do the current Agent Workflows reflect validation reality?
