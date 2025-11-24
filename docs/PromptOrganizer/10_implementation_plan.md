# Prompt Organizer Implementation Plan

## Overview

This document tracks the implementation progress of the Prompt Organizer feature based on the design specifications.

**Target Release**: v0.7.0
**Last Updated**: 2025-11-23

---

## Implementation Status Summary

| Phase                      | Progress    | Status         |
| -------------------------- | ----------- | -------------- |
| **Phase 1: Foundation**    | 100% (5/5)  | ✅ Complete    |
| **Phase 2: Core Services** | 100% (8/8)  | ✅ Complete    |
| **Phase 3: UI Components** | 88% (7/8)   | 🚧 In Progress |
| **Phase 4: Integration**   | 67% (2/3)   | 🚧 In Progress |
| **Phase 5: Testing**       | 0% (0/3)    | ⏳ Pending     |
| **Overall**                | 81% (22/27) | 🚧 In Progress |

---

## Phase 1: Foundation ✅ Complete

### 1.1 Type Definitions ✅

**File**: `src/types/promptOrganizer.ts`

- [x] Category interface
- [x] AIGeneratedMetadata interface
- [x] ExtractedVariable interface
- [x] GeneratedTemplate interface
- [x] TemplateCandidate interface
- [x] PromptOrganizerSettings interface
- [x] PromptForOrganization interface
- [x] OrganizePromptsResponse interface
- [x] PromptOrganizerResult interface
- [x] TokenUsage interface
- [x] All comments translated to English

**Completion Date**: 2025-11-22

---

### 1.2 Storage Definitions ✅

**File**: `src/services/storage/definitions.ts`

- [x] DEFAULT_ORGANIZER_SETTINGS constant
- [x] categoriesStorage definition with fallback
- [x] promptOrganizerSettingsStorage definition
- [x] DEFAULT_ORGANIZATION_PROMPT imported from defaultPrompts.ts

**Completion Date**: 2025-11-22

---

### 1.3 Default Categories ✅

**File**: `src/services/promptOrganizer/defaultCategories.ts`

- [x] DEFAULT_CATEGORIES as Record<string, Category>
- [x] Aligned with design spec (03_data_model.md)
- [x] Category IDs: external-communication, internal-communication, document-creation, development, other
- [x] Using i18n keys for category names

**Completion Date**: 2025-11-22

---

### 1.4 Default Prompts ✅

**File**: `src/services/genai/defaultPrompts.ts`

- [x] DEFAULT_ORGANIZATION_PROMPT constant
- [x] Step 1: Cluster similar prompts
- [x] Step 2: Generate reusable template for each cluster

**Completion Date**: 2025-11-22

---

### 1.5 Internationalization ✅

**Files**: `src/locales/en.yml`, `src/locales/ja.yml`

- [x] promptOrganizer.title
- [x] promptOrganizer.description
- [x] promptOrganizer.settings keys
- [x] promptOrganizer.buttons keys
- [x] promptOrganizer.status keys
- [x] promptOrganizer.result keys
- [x] organizer.category keys (all 5 categories)

**Completion Date**: 2025-11-22

---

## Phase 2: Core Services ✅ Complete

### 2.1 CategoryService ✅

**File**: `src/services/promptOrganizer/CategoryService.ts`

- [x] getAll(): Get all categories
- [x] getById(id): Get category by ID
- [x] create(name, description?): Create new category
- [x] update(id, updates): Update category
- [x] delete(id): Delete category
- [x] Singleton instance exported

**Completion Date**: 2025-11-22

---

### 2.2 PromptFilterService ✅

**File**: `src/services/promptOrganizer/PromptFilterService.ts`

- [x] filterPrompts(prompts, settings): Filter prompts based on criteria
- [x] Period-based filtering (filterPeriodDays)
- [x] Execution count filtering (filterMinExecutionCount)
- [x] Max prompts limiting (filterMaxPrompts)
- [x] Conversion to PromptForOrganization format

**Completion Date**: 2025-11-22

---

### 2.3 TemplateGeneratorService ✅

**File**: `src/services/promptOrganizer/TemplateGeneratorService.ts`

- [x] generateTemplates(prompts, settings): Generate templates via Gemini API
- [x] API key initialization (loadApiKey)
- [x] Development mode detection (import.meta.env.MODE)
- [x] Prompt building with organizationPrompt
- [x] JSON schema definition for structured output
- [x] Token usage tracking (mock for MVP)

**Completion Date**: 2025-11-22

---

### 2.4 PromptOrganizerService ✅

**File**: `src/services/promptOrganizer/PromptOrganizerService.ts`

- [x] executeOrganization(prompts, settings): Main orchestration method
- [x] Integration with PromptFilterService
- [x] Integration with TemplateGeneratorService
- [x] Integration with CategoryService
- [x] Conversion from GeneratedTemplate to TemplateCandidate
- [x] Cost calculation (JPY)
- [x] Result compilation with metadata

**Completion Date**: 2025-11-22

---

### 2.5 CostEstimatorService ✅

**File**: `src/services/promptOrganizer/CostEstimatorService.ts`

- [x] calculateCost
- [x] estimateExecution

**Completion Date**: 2025-11-22

---

### 2.6 TemplateSaveService ✅

**File**: `src/services/promptOrganizer/TemplateSaveService.ts`

- [x] saveTemplates

**Completion Date**: 2025-11-22

---

### 2.7 GeminiClient ✅

**File**: `src/services/genai/GeminiClient.ts`

- [x] generateStructuredContent
- [x] estimateTokens

**Completion Date**: 2025-11-22

---

### 2.8 TemplateConverter ✅

**File**: `src/services/promptOrganizer/TemplateConverter.ts`

- [x] convertToCandidate
- [x] convertToVariableConfig
- [x] inferVariableType
- [x] shouldShowInPinned
- [x] convertToPrompt

**Completion Date**: 2025-11-22

---

## Phase 3: UI Components 🚧 In Progress

### 3.1 OrganizerSettingsDialog ✅

**File**: `src/components/promptOrganizer/OrganizerSettingsDialog.tsx`

- [x] Dialog component structure
- [x] DialogHeader
- [x] Settings input form
  - [x] PeriodSelector (1週/1ヶ月/1年)
  - [x] ExecutionCountInput
  - [x] MaxPromptsInput
  - [x] OrganizationPromptEditor (Textarea wrapper)
- [x] Estimation display
  - [x] TokenCountDisplay
  - [x] ContextUsageBar
  - [x] CostEstimate
- [x] DialogFooter
  - [x] CancelButton
  - [x] ExecuteButton with loading state
- [x] Error handling UI
- [x] Integration with usePromptOrganizer hook
- [x] API key validation check

**Completion Date**: 2025-11-22

---

### 3.2 OrganizerSummaryDialog ✅

**File**: `src/components/promptOrganizer/OrganizerSummaryDialog.tsx`

- [x] Dialog component structure
- [x] DialogHeader
- [x] Summary statistics display
  - [x] TemplateCountBadge
  - [x] SourceInfoCard (source count, period info)
  - [x] HighlightCard (representative template preview)
- [x] Token usage and cost display
- [x] Execution timestamp
- [x] DialogFooter
  - [x] PreviewButton
  - [x] SaveAllButton

**Completion Date**: 2025-11-22

---

### 3.3 OrganizerPreviewDialog ✅

**File**: `src/components/promptOrganizer/OrganizerPreviewDialog.tsx`

- [x] Dialog component structure
- [x] DialogHeader
- [x] TwoColumnLayout
  - [x] LeftPane: TemplateCandidateList
    - [x] TemplateCandidateCard[] (clickable selection)
  - [x] RightPane: TemplateCandidateDetail
    - [x] TitleInput (editable)
    - [x] UseCaseInput (editable)
    - [x] CategorySelector (editable)
    - [x] ContentPreview (with variable highlighting)
    - [x] VariablesList
    - [x] SourcePromptsCollapse
- [x] DialogFooter
  - [x] DiscardButton
  - [x] SaveButton
  - [x] SaveAndPinButton

**Completion Date**: 2025-11-22

---

### 3.4 TemplateCandidateCard ✅

**File**: `src/components/promptOrganizer/TemplateCandidateCard.tsx`

- [x] Card component for template preview in list
- [x] Title and use case display
- [x] Category badge
- [x] Content preview (truncated, with variable highlighting)
- [x] Source prompt count
- [x] Status indicator (pending/saved)
- [x] Click handler for selection

**Completion Date**: 2025-11-22 (pre-existing)

---

### 3.5 CategorySelector ✅

**File**: `src/components/promptOrganizer/CategorySelector.tsx`

- [x] Category selection dropdown
- [x] Display default categories (with i18n)
- [x] Display custom categories
- [x] Category badge display
- [x] Integration with CategoryService

**Completion Date**: 2025-11-22 (pre-existing)

---

### 3.6 PinnedMenu Extension ✅

**File**: `src/components/inputMenu/PromptList.tsx` (extend existing)

- [x] Section A: User pinned prompts
  - [x] Filter by `!isAIGenerated`
- [x] Section B: AI recommended templates
  - [x] Filter by `isAIGenerated && showInPinned`
- [x] New/unconfirmed template decoration
  - [x] Gradient background with shimmer animation
  - [x] Check `aiMetadata.confirmed === false`
- [x] Confirmation on first click/execution
  - [x] Update `aiMetadata.confirmed = true`
  - [x] Remove animation

**File**: `src/components/inputMenu/MenuItem.tsx` (extend existing)

- [x] Add isAIGenerated, isUnconfirmed, onConfirm props
- [x] Apply shimmer animation styling for unconfirmed templates

**File**: `tailwind.config.ts`

- [x] Add shimmer animation keyframes

**Completion Date**: 2025-11-22

---

### 3.7 usePromptOrganizer Hook ✅

**File**: `src/hooks/usePromptOrganizer.tsx`

- [x] State management
  - [x] settings state
  - [x] estimate state
  - [x] result state
  - [x] isExecuting state
  - [x] error state
- [x] Load settings from storage
- [x] Auto-calculate estimate on settings change
- [x] executeOrganization method
- [x] saveTemplates method
- [x] Error handling

**Completion Date**: 2025-11-22 (pre-existing)

---

### 3.8 OrganizerExecuteDialog ⏳

**File**: `src/components/promptOrganizer/OrganizerExecuteDialog.tsx`

- [ ] Dialog component structure
- [ ] DialogHeader
- [ ] Execution estimate display (read-only)
  - [ ] TargetPromptsCount
  - [ ] TokenCountDisplay
  - [ ] ContextUsageBar
  - [ ] CostEstimate
- [ ] Settings change notice (link to settings menu)
- [ ] DialogFooter
  - [ ] CancelButton
  - [ ] ExecuteButton with loading state
- [ ] Error handling UI
- [ ] Integration with usePromptOrganizer hook
- [ ] API key validation check

**Purpose**: Execution-only dialog accessible from Improve Menu → "Organize Prompts"

**Dependencies**: Phase 2 (Core Services), Phase 3.7 (usePromptOrganizer Hook)

**Completion Date**: TBD

---

## Phase 4: Integration 🚧 In Progress

### 4.1 Settings Menu Integration ✅

**File**: `src/components/inputMenu/SettingsMenu.tsx`

- [x] Add "Organize Prompts" menu item
- [x] OrganizerSettingsDialog integration
- [x] OrganizerSummaryDialog integration
- [x] OrganizerPreviewDialog integration
- [x] Handle dialog state management
- [x] Dialog flow orchestration (Settings → Summary → Preview)
- [x] Template save handlers

**Note**: OrganizerSettingsDialog has been modified to focus on settings only. The execution flow is planned to be initiated from a separate screen.

**Completion Date**: 2025-11-22

---

### 4.2 Prompt List Integration ✅

**File**: `src/components/inputMenu/PromptList.tsx` (extended existing component)

- [x] Display AI-generated badge on templates (via shimmer animation)
- [x] Filter/sort by AI-generated status (Section A/B split)
- [x] Show template metadata (use case, category)
- [x] Handle template confirmation flow
- [x] Update confirmed status on first use

**File**: `src/components/inputMenu/InputPopup.tsx`

- [x] Add handleConfirmTemplate callback
- [x] Pass onConfirmTemplate to PromptList components
- [x] Update aiMetadata.confirmed on template execution

**Completion Date**: 2025-11-22

---

### 4.3 Improve Menu Submenu Integration ⏳

**File**: `src/components/inputMenu/InputPopup.tsx`

- [ ] Transform Improve Menu from single button to dropdown menu
- [ ] Add MenubarContent with side="top"
- [ ] Add two MenubarItem components:
  - [ ] "Prompt Improver" → openImproveDialog (existing functionality)
  - [ ] "Organize Prompts" → openOrganizerExecuteDialog (new functionality)
- [ ] Update menu trigger to use onMouseEnter instead of onClick
- [ ] Add state management for OrganizerExecuteDialog
- [ ] Integrate OrganizerExecuteDialog component
- [ ] Handle dialog flow: Execute → Summary → Preview

**Purpose**: Provide quick access to prompt organization from Improve Menu

**Dependencies**: Phase 3.8 (OrganizerExecuteDialog)

**Completion Date**: TBD

---

## Phase 5: Testing ⏳ Pending

### 5.1 Unit Tests ⏳

**Files**: Various `__tests__/` directories

Service Tests:

- [ ] CategoryService.test.ts
- [ ] PromptFilterService.test.ts
- [ ] TemplateGeneratorService.test.ts
- [ ] PromptOrganizerService.test.ts
- [ ] CostEstimatorService.test.ts
- [ ] TemplateSaveService.test.ts
- [ ] TemplateConverter.test.ts

Component Tests:

- [ ] OrganizerSettingsDialog.test.tsx
- [ ] OrganizerSummaryDialog.test.tsx
- [ ] OrganizerPreviewDialog.test.tsx
- [ ] TemplateCandidateCard.test.tsx
- [ ] CategorySelector.test.tsx
- [ ] PromptList.test.tsx (PinnedMenu extension)

Hook Tests:

- [ ] usePromptOrganizer.test.tsx

**Target Coverage**: 80%+

**Dependencies**: Respective phases complete

---

### 5.2 Integration Tests ⏳

**File**: `src/services/promptOrganizer/__tests__/integration.test.ts`

- [ ] End-to-end flow from filtering to result
- [ ] Gemini API integration (with mock)
- [ ] Storage integration
- [ ] Category validation
- [ ] Error scenarios

**Dependencies**: Phase 2 complete

---

### 5.3 E2E Tests ⏳

**File**: `e2e/tests/prompt-organizer.spec.ts`

- [ ] Open settings menu
- [ ] Configure organizer settings
- [ ] Execute organization
- [ ] Review generated templates
- [ ] Save templates
- [ ] Verify templates in prompt list
- [ ] Confirm template on first use

**Dependencies**: Phase 4 complete

---

## Current Blockers

None at the moment. All dependencies for Phase 3 are satisfied.

---

## Next Steps

1. **Immediate (Phase 3 - UI Components)**:
   - Phase 3.1: Implement OrganizerSettingsDialog
   - Phase 3.2: Implement OrganizerSummaryDialog
   - Phase 3.3: Implement OrganizerPreviewDialog
   - Phase 3.4: Implement TemplateCandidateCard
   - Phase 3.5: Implement CategorySelector
   - Phase 3.6: Extend PinnedMenu with section split
   - Phase 3.7: Implement usePromptOrganizer hook

2. **Medium-term (Phase 4 - Integration)**:
   - Integrate OrganizerSettingsDialog with Settings Menu
   - Integrate AI-generated templates with Prompt List
   - Implement template confirmation flow

3. **Long-term (Phase 5 - Testing)**:
   - Write comprehensive unit tests (services, components, hooks)
   - Create integration test suite
   - Develop E2E test scenarios

---

## Development Guidelines

### Code Style

- All code comments must be in English (per CLAUDE.md)
- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Prefer functional components with hooks

### Testing Strategy

- Write tests alongside implementation
- Mock external dependencies (Gemini API, storage)
- Use React Testing Library for component tests
- Aim for 80%+ code coverage

### Performance Considerations

- Debounce input changes in settings form
- Memoize expensive computations
- Lazy load dialog components
- Optimize re-renders with React.memo

### Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management in dialogs
- Color contrast compliance (WCAG 2.1 AA)

---

## Known Issues & Technical Debt

1. **Token Usage Tracking**: Currently using mock values (0 tokens)
   - Need to implement actual token counting from Gemini API response
   - Priority: Medium (cosmetic issue)

2. **Cost Calculation**: Using fixed USD to JPY rate (150)
   - Consider adding configurable exchange rate
   - Priority: Low (acceptable for MVP)

3. **API Key Management**: Shared with Prompt Improver
   - Both features use the same genaiApiKeyStorage
   - Priority: Low (works as designed)

---

## Related Documents

- [00_review_todos.md](./00_review_todos.md) - Design review TODOs
- [01_requirements.md](./01_requirements.md) - Feature requirements
- [02_architecture.md](./02_architecture.md) - System architecture
- [03_data_model.md](./03_data_model.md) - Data model specifications
- [04_ui_flow.md](./04_ui_flow.md) - UI/UX flow
- [05_api_design.md](./05_api_design.md) - API design
- [06_test_design.md](./06_test_design.md) - Test design

---

**Last Updated**: 2025-11-22
**Phase 3 Completion Date**: 2025-11-22
**Phase 4 Completion Date**: 2025-11-22
**Next Review Date**: TBD
