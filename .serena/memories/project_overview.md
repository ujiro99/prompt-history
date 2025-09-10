# Project Overview

## Purpose

This is a browser extension called "prompt-history" that enables saving and recalling prompt history passed to generative AI services. It's built to help users manage their AI conversation history across different AI platforms, starting with ChatGPT support.

## Tech Stack

- **Framework**: WXT (Web Extension Toolkit) - Modern framework for browser extensions
- **Frontend**: React 19.1.0 with TypeScript 5.8.3
- **UI Components**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS 4.1.12 with custom animations
- **Internationalization**: @wxt-dev/i18n for multi-language support
- **Testing**: Vitest 3.2.4 with React Testing Library and jsdom
- **Code Quality**: ESLint 9.34.0 with TypeScript and React rules
- **Build Tool**: WXT with Vite bundling
- **Analytics**: @wxt-dev/analytics for user behavior tracking
- **Storage**: WXT Storage API for cross-browser data persistence

## Project Structure

```
entrypoints/          # Extension entry points
  ├── background.ts   # Service worker/background script
  └── content.tsx     # Content script for AI service pages
components/           # React UI components
services/             # Business logic services
types/                # TypeScript type definitions
lib/                  # Utility functions
public/               # Static assets and icons
assets/               # Build-time assets
locales/              # i18n translation files
docs/                 # Documentation
```

## Architecture

- Background script handles extension lifecycle and data management
- Content script injects UI widgets into AI service pages
- React components provide the user interface
- Services handle business logic for different AI platforms
- WXT manages manifest generation and browser compatibility
