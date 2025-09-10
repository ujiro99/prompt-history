# Task Completion Checklist

## When a coding task is completed, run these commands:

### 1. Type Checking

```bash
pnpm compile
# or
pnpm type-check
```

### 2. Linting

```bash
pnpm lint
# Auto-fix if needed:
pnpm lint:fix
```

### 3. Testing (if applicable)

```bash
pnpm test:run
```

### 4. Build Verification (for major changes)

```bash
pnpm build
```

## Pre-commit Verification

- Ensure all TypeScript errors are resolved
- Ensure ESLint passes without errors
- Run tests to verify functionality
- Check that the extension builds successfully

## Code Review Considerations

- Follow established code conventions
- Maintain consistent naming patterns
- Ensure proper TypeScript typing
- Verify browser extension functionality works correctly
- Test in both Chrome and Firefox if cross-browser compatibility is important
