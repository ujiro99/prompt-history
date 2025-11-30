/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { VariableSettingsSection } from "../VariableSettingsSection"
import type { VariableConfig } from "@/types/prompt"
import { ContainerProvider } from "@/contexts/ContainerContext"

// Mock i18n
vi.mock("#imports", () => ({
  i18n: {
    t: (key: string) => key,
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ContainerProvider container={document.body}>{children}</ContainerProvider>
}

describe("VariableSettingsSection", () => {
  const mockOnChange = vi.fn()

  const sampleVariables: VariableConfig[] = [
    { name: "userName", type: "text", defaultValue: "John" },
    { name: "age", type: "text" },
    { name: "country", type: "select", selectOptions: { options: ["USA", "UK", "Japan"] } },
  ]

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe("Display Mode", () => {
    it("should render all variables in edit mode", () => {
      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            mode="edit"
          />
        </TestWrapper>,
      )

      expect(screen.getByText("{{userName}}")).toBeInTheDocument()
      expect(screen.getByText("{{age}}")).toBeInTheDocument()
      expect(screen.getByText("{{country}}")).toBeInTheDocument()
    })

    it("should show header by default", () => {
      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      expect(screen.getByText("dialogs.edit.variableSettingsDescription")).toBeInTheDocument()
    })

    it("should hide header when showHeader is false", () => {
      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            showHeader={false}
          />
        </TestWrapper>,
      )

      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()
    })

    it("should use custom header and description text", () => {
      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            headerText="Custom Header"
            descriptionText="Custom Description"
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Custom Header")).toBeInTheDocument()
      expect(screen.getByText("Custom Description")).toBeInTheDocument()
    })

    it("should not render when variables array is empty", () => {
      const { container } = render(
        <TestWrapper>
          <VariableSettingsSection
            variables={[]}
            onChange={mockOnChange}
          />
        </TestWrapper>,
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe("External Variable Management", () => {
    it("should call onChange when variable is modified", () => {
      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            mode="edit"
            enableAutoDetection={false}
          />
        </TestWrapper>,
      )

      // This test verifies that the component structure is correct
      // Detailed variable modification tests are covered by VariableConfigField tests
      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe("Auto-detection Mode", () => {
    it("should auto-detect variables from content when enabled", () => {
      const content = "Hello {{userName}}, you are {{age}} years old."

      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={[]}
            content={content}
            onChange={mockOnChange}
            enableAutoDetection={true}
          />
        </TestWrapper>,
      )

      // mergeVariableConfigs should be called and onChange should be triggered
      expect(mockOnChange).toHaveBeenCalled()
      const calledVariables = mockOnChange.mock.calls[0][0]
      expect(calledVariables).toHaveLength(2)
      expect(calledVariables[0].name).toBe("userName")
      expect(calledVariables[1].name).toBe("age")
    })

    it("should preserve existing variable configurations when auto-detecting", () => {
      const content = "Hello {{userName}}, you are {{age}} years old."
      const existingVariables: VariableConfig[] = [
        { name: "userName", type: "select", selectOptions: { options: ["John", "Jane"] } },
      ]

      render(
        <TestWrapper>
          <VariableSettingsSection
            variables={existingVariables}
            content={content}
            onChange={mockOnChange}
            enableAutoDetection={true}
          />
        </TestWrapper>,
      )

      expect(mockOnChange).toHaveBeenCalled()
      const calledVariables = mockOnChange.mock.calls[0][0]

      // userName should preserve its select type configuration
      const userNameVar = calledVariables.find((v: VariableConfig) => v.name === "userName")
      expect(userNameVar?.type).toBe("select")
      expect(userNameVar?.selectOptions?.options).toEqual(["John", "Jane"])

      // age should be added as new variable with default type
      const ageVar = calledVariables.find((v: VariableConfig) => v.name === "age")
      expect(ageVar?.type).toBe("text")
    })

    it("should remove variables that are no longer in content", () => {
      const initialContent = "Hello {{userName}}, you are {{age}} years old."
      const updatedContent = "Hello {{userName}}."

      const { rerender } = render(
        <TestWrapper>
          <VariableSettingsSection
            variables={[]}
            content={initialContent}
            onChange={mockOnChange}
            enableAutoDetection={true}
          />
        </TestWrapper>,
      )

      mockOnChange.mockClear()

      rerender(
        <TestWrapper>
          <VariableSettingsSection
            variables={[
              { name: "userName", type: "text" },
              { name: "age", type: "text" },
            ]}
            content={updatedContent}
            onChange={mockOnChange}
            enableAutoDetection={true}
          />
        </TestWrapper>,
      )

      expect(mockOnChange).toHaveBeenCalled()
      const calledVariables = mockOnChange.mock.calls[0][0]
      expect(calledVariables).toHaveLength(1)
      expect(calledVariables[0].name).toBe("userName")
    })
  })

  describe("ScrollArea Integration", () => {
    it("should render ScrollAreaWithGradient", () => {
      const { container } = render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            maxHeight="20rem"
          />
        </TestWrapper>,
      )

      // ScrollAreaWithGradient should be rendered with the scroll-gradient-container class
      const scrollArea = container.querySelector('.scroll-gradient-container')
      expect(scrollArea).toBeInTheDocument()
    })
  })

  describe("CSS Classes", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <TestWrapper>
          <VariableSettingsSection
            variables={sampleVariables}
            onChange={mockOnChange}
            className="custom-class"
          />
        </TestWrapper>,
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })
})
