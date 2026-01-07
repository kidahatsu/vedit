# Production-Quality Code Audit Prompt

Use this prompt to audit and refactor any portfolio project for professional quality.

---

## Prompt

```
Act as a Senior Staff Engineer and technical interviewer reviewing my portfolio project.

## Step 1: Critical Audit
Analyze the codebase for:
- **Style guide adherence** (TypeScript/Airbnb conventions, naming clarity)
- **Performance bottlenecks** (memory leaks, excessive re-renders, missing cleanup)
- **Security vulnerabilities** (input validation, sanitization, XSS/injection risks)
- **Error handling** (silent failures, generic messages, missing recovery)

## Step 2: Production Refactor
Propose specific changes following:
- **SOLID principles** (especially SRP for large components, DRY for repeated code)
- **Memoization** (selectors, expensive computations)
- **Type safety** (eliminate `any`, add generics, strict null checks)
- **Documentation** (JSDoc for public APIs)

For each issue, provide:
1. File + line reference
2. Why it's a problem
3. Concrete fix with code snippet

## Step 3: Implementation
Implement the refactors directly. Create new utility modules where appropriate.
Verify with `npm run build`.

## Step 4: Interview Prep
Provide a bulleted list of improvements I can discuss in technical interviews,
with quantifiable impacts where possible (e.g., "reduced re-renders by 6×").
```

---

## Tips for Best Results

- Run on a specific project directory with the dev server running
- Ask for clarification before implementation if any suggestion is unclear
- Request a walkthrough document after completion for future reference
