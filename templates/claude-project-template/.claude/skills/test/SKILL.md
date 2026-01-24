---
name: test
description: Run test suite. Use when user wants to run tests, verify functionality, or check for regressions.
---

# Run Tests

Execute the test suite:

## Unit Tests
```bash
{{UNIT_TEST_COMMAND}}
```

## Integration Tests (if applicable)
```bash
{{INTEGRATION_TEST_COMMAND}}
```

## E2E Tests (if applicable)
```bash
{{E2E_TEST_COMMAND}}
```

## Output Format
- Show passed/failed/skipped counts
- For failures, show test name, assertion, and file location
- Suggest fixes for common failure patterns
