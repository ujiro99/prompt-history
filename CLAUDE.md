# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension built with WXT (Web Extension Toolkit) and React. The project follows WXT's convention-based structure for browser extension development. The extension provides prompt history management for AI services, starting with ChatGPT support.

## Development Commands

- `pnpm dev` - Start development server for Chrome. Uses port 3005
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build extension for Chrome
- `pnpm build:firefox` - Build extension for Firefox
- `pnpm zip` - Create distributable ZIP for Chrome
- `pnpm zip:firefox` - Create distributable ZIP for Firefox
- `pnpm compile` - Type check without emitting files
- `pnpm test` - Run unit tests with vitest
- `pnpm lint` - Run ESLint static analysis
- `pnpm e2e` - Run end-to-end tests with Playwright
- `pnpm e2e:ui` - Run E2E tests with Playwright UI
- `pnpm e2e:headed` - Run E2E tests in headed mode
- `pnpm e2e:debug` - Debug E2E tests
- `pnpm pre-e2e` - Build extension and install Playwright dependencies

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
      - `chatgpt/` - ChatGPT service (chat.openai.com, chatgpt.com)
        - `ChatGptService.ts` - ChatGPT service implementation
      - `gemini/` - Google Gemini service (gemini.google.com)
        - `GeminiService.ts` - Gemini service implementation
      - `claude/` - Claude service (claude.ai)
        - `ClaudeService.ts` - Claude service implementation
      - `perplexity/` - Perplexity service
        - `PerplexityService.ts` - Perplexity service implementation
      - `skywork/` - Skywork service
        - `SkyworkService.ts` - Skywork service implementation
      - `testPage/` - Test page for development
        - `TestPageService.ts` - Test service implementation
      - `index.ts` - Exports all AI services and config fetching logic
    - `autoComplete/` - Auto-completion functionality
    - `dom/` - DOM utility functions
    - `promptHistory/` - Prompt history management
    - `storage/` - Data persistence services
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions
- `public/` - Static assets and icons
- `assets/` - Build-time assets referenced in code
- `docs/` - Design and technical documentation
- `e2e/` - End-to-end testing with Playwright
  - `tests/` - E2E test specs for each AI service
  - `page-objects/` - Page Object Models for test automation
  - `fixtures/` - Test fixtures and setup/teardown
  - `utils/` - Test utility functions
- `pages/` - Landing page website (Next.js)
  - `src/app/[lang]/` - Internationalized pages with dynamic language routing
  - `src/components/` - React components for the landing page
  - `src/features/locale/` - Internationalization (i18n) dictionaries
    - `en.ts` - English translations
    - `ja.ts` - Japanese translations
  - `public/` - Static assets for the landing page

**Extension Structure**:

- Background script handles extension lifecycle
- Content script injects UI widgets into AI service pages

**AI Service Architecture**:

The extension uses a simplified, configuration-driven architecture for supporting different AI services:

- **Base Layer**: `BaseAIService` abstract class provides common functionality
  - DOM element detection and management via `DomManager`
  - Event handling for send actions and content changes
  - Configuration-driven approach using remote JSON configs
- **Service Implementations**: Each AI service is a minimal class extending `BaseAIService`
  - ChatGPT: Supports chat.openai.com and chatgpt.com
  - Gemini: Supports gemini.google.com
  - Claude: Supports claude.ai
  - Perplexity: AI search service
  - Skywork: AI service
  - TestPage: Development testing service
- **Configuration System**:
  - Service configurations (DOM selectors, settings) are fetched from a remote endpoint
  - Endpoint URL is defined in `.env` as `WXT_CONFIG_ENDPOINT`
  - Configuration file is stored at `pages/public/data/promptHistory.json`
  - Configurations are cached daily with fallback support
  - Service classes only define service name and supported hosts
- **Extensibility**: New AI services can be easily added by:
  1. Creating a new service class extending `BaseAIService` (typically ~15 lines)
  2. Defining service name and supported hosts
  3. Adding the service to the exports in `services/aiService/index.ts`
  4. Adding configuration to the remote config endpoint

**Technology Stack**:

- **Internationalization**: @wxt-dev/i18n for multi-language support
- **Data Persistence**: WXT Storage API for cross-browser data storage
- **Analytics**: @wxt-dev/analytics for user behavior analysis
- **Testing**:
  - **Unit Testing**: Vitest with React Testing Library
    - Test files should be placed in `__tests__` directories alongside the source code
    - Example: `services/dom/elementUtils.ts` → `services/dom/__tests__/elementUtils.test.ts`
  - **E2E Testing**: Playwright for end-to-end testing
    - Tests verify AI service integrations using `promptHistory.json` configurations
    - Page Object Model pattern for maintainable test automation
    - Individual test specs for each AI service (ChatGPT, Gemini, Claude, Perplexity, Skywork)
    - Comprehensive testing of extension features: autocomplete, history management, import/export
- **Code Quality**: ESLint with TypeScript and React rules
- **UI Framework**: Shadcn/ui components with Tailwind CSS styling

**Build System**:

- TypeScript with React JSX support
- WXT handles manifest generation and browser-specific builds
- Extends base tsconfig from `.wxt/tsconfig.json`

**About Design Documents**

- Store design and technical documents in the `docs/` directory
- A design document should include:
  - Feature concepts and requirements
  - Feature architecture
  - External specifications
  - UI flows
  - Key type definitions
  - Test design
- A design document should not include:
  - Implementation details
  - Code snippets

## Landing Page (pages/)

The `pages/` directory contains a separate Next.js project for the Prompt History service landing page, deployed via GitHub Pages.

**Development Commands** (run from `pages/` directory):

- `pnpm dev` - Start Next.js development server with Turbopack. Uses port 3000 (to avoid conflicts with the extension dev server)
- `pnpm build` - Build static site export for production
- `pnpm start` - Start production server (development only)
- `pnpm lint` - Run Biome linter and formatter
- `pnpm format` - Format code with Biome

**Architecture**:

- **Framework**: Next.js 15 with App Router and Turbopack
- **Static Export**: Configured to export static HTML for GitHub Pages deployment
- **Internationalization**: Dynamic routing with `[lang]` parameter supporting multiple languages (en, ja)
- **UI Components**: Shadcn/ui components with Tailwind CSS v4
- **Code Quality**: Biome for linting and formatting
- **CORS Configuration**: Headers configured to allow cross-origin access to `/data/*` endpoints

**Key Features**:

- Multi-language support with locale-based routing (`/en`, `/ja`)
- Responsive landing page with hero section, feature cards, FAQ, and CTA
- Video demo integration
- SEO-optimized with proper meta tags and structure

**Directory Structure**:

- `src/app/[lang]/` - Dynamic language routes
- `src/components/` - Reusable React components (CTAButton, FAQItem, etc.)
- `src/features/locale/` - Translation dictionaries and i18n utilities
- `src/hooks/` - Custom React hooks
- `public/` - Static assets (icon, demo video)

## Key Files

**Extension**:

- `wxt.config.ts` - WXT configuration with React module
- `src/types/prompt.ts` - Core type definitions
- `vitest.config.ts` - Test configuration
- `eslint.config.mjs` - Linting configuration

**Landing Page**:

- `pages/next.config.mjs` - Next.js configuration for static export
- `pages/package.json` - Landing page dependencies
- `pages/src/features/locale/` - i18n translation files
