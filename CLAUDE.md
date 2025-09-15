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
    - `aiService/` - AI service integrations
      - `base/` - Abstract base class and common utilities
        - `BaseAIService.ts` - Abstract base class for AI service implementations
        - `domManager.ts` - DOM manipulation and event handling
        - `types.ts` - Common type definitions for AI services
        - `selectorDebugger.ts` - Debug utilities for DOM selectors
        - `__tests__/` - Unit tests for base functionality
      - `chatgpt/` - ChatGPT specific implementation
        - `chatGptService.ts` - ChatGPT service implementation
        - `chatGptConfig.ts` - ChatGPT-specific configuration
        - `chatGptDefinitions.ts` - ChatGPT DOM selectors and settings
      - `gemini/` - Google Gemini specific implementation
        - `geminiService.ts` - Gemini service implementation
        - `geminiConfig.ts` - Gemini-specific configuration
        - `geminiDefinitions.ts` - Gemini DOM selectors and settings
      - `index.ts` - Exports all available AI services
    - `autoComplete/` - Auto-completion functionality
    - `dom/` - DOM utility functions
    - `promptHistory/` - Prompt history management
    - `storage/` - Data persistence services
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions
- `public/` - Static assets and icons
- `assets/` - Build-time assets referenced in code
- `docs/` - Design and technical documentation

**Extension Structure**:

- Background script handles extension lifecycle
- Content script injects UI widgets into AI service pages

**AI Service Architecture**:

The extension uses a modular architecture for supporting different AI services:

- **Base Layer**: `BaseAIService` abstract class provides common functionality
  - DOM element detection and management via `DomManager`
  - Event handling for send actions and content changes
  - Configuration-driven approach for service-specific behaviors
- **Service Implementations**: Each AI service extends the base class
  - ChatGPT: Supports chat.openai.com
  - Gemini: Supports gemini.google.com
- **Extensibility**: New AI services can be easily added by:
  1. Creating service-specific configuration and definitions
  2. Extending `BaseAIService` with service-specific logic
  3. Adding the service to the exports in `services/aiService/index.ts`

**Technology Stack**:

- **Internationalization**: @wxt-dev/i18n for multi-language support
- **Data Persistence**: WXT Storage API for cross-browser data storage
- **Analytics**: @wxt-dev/analytics for user behavior analysis
- **Testing**: Vitest with React Testing Library for unit testing
  - Test files should be placed in `__tests__` directories alongside the source code
  - Example: `services/dom/elementUtils.ts` → `services/dom/__tests__/elementUtils.test.ts`
- **Code Quality**: ESLint with TypeScript and React rules
- **UI Framework**: Shadcn/ui components with Tailwind CSS styling

**Build System**:

- TypeScript with React JSX support
- WXT handles manifest generation and browser-specific builds
- Extends base tsconfig from `.wxt/tsconfig.json`

## Key Files

- `wxt.config.ts` - WXT configuration with React module
- `src/types/prompt.ts` - Core type definitions
- `vitest.config.ts` - Test configuration
- `eslint.config.mjs` - Linting configuration
