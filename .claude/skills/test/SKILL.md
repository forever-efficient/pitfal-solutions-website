---
name: test
description: Run tests for the Pitfal Solutions project. Supports unit tests, E2E tests, and coverage reporting.
allowed-tools: Bash, Read
---

# Run Tests

Execute the test suite for the Pitfal Solutions website.

## Arguments
- `$ARGUMENTS` - Optional mode: `unit`, `e2e`, `coverage`, `watch`, `changed`, or empty for all tests

## Test Modes

### Run All Tests (Default)
```bash
pnpm test
```

### Unit/Component Tests Only
```bash
pnpm test
```

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

### E2E Tests with UI
```bash
pnpm test:e2e:ui
```

### Watch Mode (Development)
```bash
pnpm test:watch
```

### Changed Files Only (For Pre-Commit)
```bash
pnpm test:changed
```

### Coverage Report
```bash
pnpm test:coverage
```

## Coverage Thresholds

Configured in `vitest.config.ts` (global `coverage.thresholds`). The `test:coverage` command fails if any metric falls below its threshold:

| Metric | Threshold |
|--------|-----------|
| Lines | 90% |
| Statements | 90% |
| Functions | 88% |
| Branches | 87% |

Coverage is collected for `src/components/**`, `src/lib/**`, and `lambda/**` (see `coverage.include` / `coverage.exclude` in `vitest.config.ts`).

## Test Categories

Vitest picks up `**/*.test.{ts,tsx}` (see `vitest.config.ts`); most live under `tests/`.

| Category | Typical location | Framework |
|----------|------------------|-----------|
| Unit / lib | `tests/lib/**/*.test.ts` | Vitest |
| Component | `tests/components/**/*.test.{ts,tsx}` | Vitest + Testing Library |
| Lambda | `tests/lambda/**/*.test.ts` | Vitest |
| E2E | `tests/e2e/*.spec.ts` | Playwright |

## Pre-Commit Workflow

Before committing code:
```bash
pnpm test:changed   # Tests for changed files only
pnpm lint           # Lint check
pnpm type-check     # TypeScript check
```

## CI Workflow

Full test suite for CI/CD:
```bash
pnpm test           # Full test suite
pnpm test:coverage  # Coverage report
pnpm test:e2e       # E2E tests
```

## Output

Report:
- Test results (pass/fail counts)
- Failed test details with stack traces
- Coverage summary (when using `coverage` mode)
- Recommendations for next steps
