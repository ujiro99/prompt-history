# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension built with WXT (Web Extension Toolkit) and React. The project follows WXT's convention-based structure for browser extension development.

## Development Commands

- `pnpm dev` - Start development server for Chrome
- `pnpm dev:firefox` - Start development server for Firefox  
- `pnpm build` - Build extension for Chrome
- `pnpm build:firefox` - Build extension for Firefox
- `pnpm zip` - Create distributable ZIP for Chrome
- `pnpm zip:firefox` - Create distributable ZIP for Firefox
- `pnpm compile` - Type check without emitting files

## Architecture

**WXT Framework**: Uses WXT's file-based routing and convention over configuration approach. Key directories:

- `entrypoints/` - Extension entry points (background, content scripts, popup)
  - `background.ts` - Service worker/background script
  - `content.ts` - Content script that runs on Google domains
  - `popup/` - Extension popup interface (React app)
- `public/` - Static assets and icons
- `assets/` - Build-time assets referenced in code

**Extension Structure**:
- Background script handles extension lifecycle
- Content script currently targets Google domains (`*://*.google.com/*`)
- Popup provides React-based UI with standard counter example

**Build System**:
- TypeScript with React JSX support
- WXT handles manifest generation and browser-specific builds
- Extends base tsconfig from `.wxt/tsconfig.json`

## Key Files

- `wxt.config.ts` - WXT configuration with React module
- `entrypoints/popup/App.tsx` - Main popup component
- `entrypoints/popup/main.tsx` - React root initialization