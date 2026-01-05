/**
 * Tests for VariablePresetEditor (AI Generation features)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { VariablePreset } from "@/types/prompt"
import type { AIGenerationResponse } from "@/types/variableGeneration"

// Mock imports FIRST
vi.mock("#imports", () => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
  analytics: {
    track: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock hooks
vi.mock("@/hooks/useContainer", () => ({
  useContainer: () => ({ container: document.body }),
}))

vi.mock("@/hooks/useAiModel", () => ({
  useAiModel: vi.fn(() => ({
    genaiApiKey: "test-api-key",
  })),
}))

vi.mock("@/hooks/useLazyStorage", () => ({
  useLazyStorage: vi.fn(() => ({
    value: {
      useDefault: true,
      customPrompt: "",
      promptHistoryCount: 100,
    },
    setValue: vi.fn(),
    isSaving: false,
  })),
}))

vi.mock("@/hooks/usePresetValidation", () => ({
  usePresetValidation: () => ({
    errors: {},
    setErrors: vi.fn(),
    createFieldHandler: vi.fn(() => ({
      onChange: vi.fn(),
      onBlur: vi.fn(),
    })),
  }),
}))

// Mock shared components
vi.mock("@/components/shared/ScrollAreaWithGradient", () => ({
  ScrollAreaWithGradient: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("@/components/inputMenu/controller/RemoveDialog", () => ({
  RemoveDialog: () => <div>Remove Dialog</div>,
}))

vi.mock("@/components/settings/variablePresets/AIGenerationDialog", () => ({
  AIGenerationDialog: ({
    open,
    onApply,
    variableName,
    variablePurpose,
    variableType,
  }: any) => {
    if (!open) return null

    // Generate appropriate response based on variable type
    const generateResponse = () => {
      switch (variableType) {
        case "select":
          return {
            selectOptions: ["Option 1", "Option 2", "Option 3"],
            explanation: "AI explanation",
          }
        case "dictionary":
          return {
            dictionaryItems: [
              { id: "dict-1", name: "Item 1", content: "Content 1" },
              { id: "dict-2", name: "Item 2", content: "Content 2" },
            ],
            explanation: "AI explanation",
          }
        default: // text
          return {
            textContent: "Generated text",
            explanation: "AI explanation",
          }
      }
    }

    return (
      <div data-testid="ai-generation-dialog">
        <div>AI Generation Dialog</div>
        <div>Variable: {variableName}</div>
        <div>Purpose: {variablePurpose}</div>
        <div>Type: {variableType}</div>
        <button onClick={() => onApply(generateResponse())}>Apply</button>
      </div>
    )
  },
}))

// Mock variableGeneration services using vi.hoisted
const { mockApplyResponseToPreset } = vi.hoisted(() => ({
  mockApplyResponseToPreset: vi.fn(
    (preset: VariablePreset, response: AIGenerationResponse) => ({
      ...preset,
      textContent: response.textContent,
      selectOptions: response.selectOptions,
      dictionaryItems: response.dictionaryItems,
      aiExplanation: response.explanation,
      isAiGenerated: true,
      updatedAt: new Date(),
    }),
  ),
}))

vi.mock("@/services/variableGeneration", () => ({
  applyResponseToPreset: mockApplyResponseToPreset,
  estimatorService: {
    estimateGeneration: vi.fn(),
    watch: vi.fn(() => () => {}),
  },
  variableGeneratorService: {
    generateVariable: vi.fn(),
    cancel: vi.fn(),
  },
  mergeResponse: vi.fn((response) => response),
}))

vi.mock("@/schemas/variablePreset", () => ({
  validateField: vi.fn(),
}))

vi.mock("@/utils/idGenerator", () => ({
  generateDictItemId: vi.fn(() => "mock-id"),
}))

import { VariablePresetEditor } from "../VariablePresetEditor"
import { useAiModel } from "@/hooks/useAiModel"

describe("VariablePresetEditor - AI Generation", () => {
  const mockOnChange = vi.fn()
  const mockOnChangeBackground = vi.fn()
  const mockOnDuplicate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnValidationChange = vi.fn()

  const basePreset: VariablePreset = {
    id: "preset-1",
    name: "Test Preset",
    description: "Test description",
    type: "text",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const defaultProps = {
    preset: basePreset,
    allPresets: [basePreset],
    onChange: mockOnChange,
    onChangeBackground: mockOnChangeBackground,
    onDuplicate: mockOnDuplicate,
    onDelete: mockOnDelete,
    onValidationChange: mockOnValidationChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("AI Generation Button", () => {
    it('should render "AI に考えてもらう" button', () => {
      render(<VariablePresetEditor {...defaultProps} />)
      expect(
        screen.getByText("variablePresets.aiGeneration.button"),
      ).toBeInTheDocument()
    })

    it("should enable button when name, description, and API key are set", () => {
      render(<VariablePresetEditor {...defaultProps} />)
      const button = screen.getByText("variablePresets.aiGeneration.button")
      expect(button).not.toBeDisabled()
    })

    it("should disable button when name is empty", () => {
      const preset = {
        ...basePreset,
        name: "",
      }
      render(<VariablePresetEditor {...defaultProps} preset={preset} />)
      const button = screen.getByText("variablePresets.aiGeneration.button")
      expect(button).toBeDisabled()
    })

    it("should disable button when description is empty", () => {
      const preset = {
        ...basePreset,
        description: "",
      }
      render(<VariablePresetEditor {...defaultProps} preset={preset} />)
      const button = screen.getByText("variablePresets.aiGeneration.button")
      expect(button).toBeDisabled()
    })

    it("should disable button when API key is not set", () => {
      vi.mocked(useAiModel).mockReturnValue({
        genaiApiKey: "",
      })

      render(<VariablePresetEditor {...defaultProps} />)
      const button = screen.getByText("variablePresets.aiGeneration.button")
      expect(button).toBeDisabled()
    })

    it("should open AI generation dialog when button is clicked", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId("ai-generation-dialog")).toBeInTheDocument()
      })
    })
  })

  describe("AI Generation Dialog Integration", () => {
    it("should pass correct props to AI generation dialog", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Variable: Test Preset")).toBeInTheDocument()
        expect(
          screen.getByText("Purpose: Test description"),
        ).toBeInTheDocument()
        expect(screen.getByText("Type: text")).toBeInTheDocument()
      })
    })

    it("should apply AI-generated content to editor for text type", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId("ai-generation-dialog")).toBeInTheDocument()
      })

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            textContent: "Generated text",
            aiExplanation: "AI explanation",
            isAiGenerated: true,
          }),
        )
      })
    })

    it("should apply AI-generated content for select type", async () => {
      const user = userEvent.setup()
      const selectPreset: VariablePreset = {
        ...basePreset,
        type: "select",
      }

      // Note: The mock defined at the top level will be used

      render(<VariablePresetEditor {...defaultProps} preset={selectPreset} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId("ai-generation-dialog")).toBeInTheDocument()
      })

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            selectOptions: ["Option 1", "Option 2", "Option 3"],
            aiExplanation: "AI explanation",
            isAiGenerated: true,
          }),
        )
      })
    })

    it("should set isAiGenerated flag when AI content is applied", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId("ai-generation-dialog")).toBeInTheDocument()
      })

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isAiGenerated: true,
          }),
        )
      })
    })

    it("should set aiExplanation when AI content is applied", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const button = screen.getByText("variablePresets.aiGeneration.button")
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId("ai-generation-dialog")).toBeInTheDocument()
      })

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            aiExplanation: "AI explanation",
          }),
        )
      })
    })
  })

  describe("Field Validation", () => {
    it("should update fields and trigger validation", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      const nameInput = screen.getByDisplayValue("Test Preset")
      await user.clear(nameInput)
      await user.type(nameInput, "Updated Name")

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Updated Name",
          }),
        )
      })
    })

    it("should clear type-specific errors when type changes", async () => {
      const user = userEvent.setup()
      render(<VariablePresetEditor {...defaultProps} />)

      // Find the type select trigger
      const typeSelect = screen.getByRole("combobox")
      await user.click(typeSelect)

      // Select "select" option
      const selectOption = screen.getByText("variableTypes.select")
      await user.click(selectOption)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "select",
          }),
        )
      })
    })
  })
})
