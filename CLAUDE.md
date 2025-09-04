# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension built with WXT (Web Extension Toolkit) and React. The project follows WXT's convention-based structure for browser extension development. The extension provides prompt history management for AI services, starting with ChatGPT support.

## Development Commands

- `pnpm dev` - Start development server for Chrome
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build extension for Chrome
- `pnpm build:firefox` - Build extension for Firefox
- `pnpm zip` - Create distributable ZIP for Chrome
- `pnpm zip:firefox` - Create distributable ZIP for Firefox
- `pnpm compile` - Type check without emitting files
- `pnpm test` - Run unit tests with vitest
- `pnpm lint` - Run ESLint static analysis

## Architecture

**WXT Framework**: Uses WXT's file-based routing and convention over configuration approach. Key directories:

- `entrypoints/` - Extension entry points (background, content scripts)
  - `background.ts` - Service worker/background script
  - `content.ts` - Content script that runs on AI service domains
- `src/` - Source code directory
  - `components/` - React UI components
  - `services/` - Core business logic services
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions
- `public/` - Static assets and icons
- `assets/` - Build-time assets referenced in code
- `docs/` - Design and technical documentation

**Extension Structure**:

- Background script handles extension lifecycle
- Content script injects UI widgets into AI service pages
- No popup interface - all UI is embedded in web pages

**Technology Stack**:

- **Internationalization**: @wxt-dev/i18n for multi-language support
- **Data Persistence**: WXT Storage API for cross-browser data storage
- **Analytics**: @wxt-dev/analytics for user behavior analysis
- **Testing**: Vitest with React Testing Library for unit testing
- **Code Quality**: ESLint with TypeScript and React rules
- **UI Framework**: Shadcn/ui components with Tailwind CSS styling
- **Build System**: TypeScript with React JSX support, WXT handles manifest generation

## Key Files

- `wxt.config.ts` - WXT configuration with React module
- `src/types/prompt.ts` - Core type definitions
- `vitest.config.ts` - Test configuration
- `eslint.config.mjs` - Linting configuration
