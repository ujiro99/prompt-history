# Code Style and Conventions

## Code Formatting (Prettier)

- No semicolons (`"semi": false`)
- Double quotes for strings (`"singleQuote": false`)
- 2 spaces for indentation (`"tabWidth": 2`)
- Trailing commas in multi-line structures (`"trailingComma": "all"`)

## TypeScript/React Conventions

- Use TypeScript strict mode
- React 17+ JSX transform (no need to import React in JSX files)
- Prefer `const` over `let` or `var`
- Use arrow functions for components
- Interface/type definitions in dedicated files under `types/`
- Components follow PascalCase naming

## ESLint Rules

- TypeScript recommended rules enabled
- React recommended rules enabled
- React hooks rules enforced
- No unused variables (with \_ prefix exceptions)
- `@typescript-eslint/no-explicit-any` as warning
- Console statements allowed in development
- Debugger statements forbidden in production

## File Organization

- Components in `components/` directory
- Services in `services/` directory
- Types in `types/` directory
- UI components in `components/ui/`
- Utility functions in `lib/` directory

## WXT-Specific Conventions

- Entry points in `entrypoints/` directory
- Background scripts: `background.ts`
- Content scripts: `content.tsx` or `content.ts`
- Use WXT's built-in globals and utilities
- Follow WXT's file-based routing conventions
