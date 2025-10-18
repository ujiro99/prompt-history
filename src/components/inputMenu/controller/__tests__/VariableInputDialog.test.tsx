import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { VariableInputDialog } from "../VariableInputDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import { TestIds } from "@/components/const"
import type { VariableConfig, VariableValues } from "@/types/prompt"

describe("VariableInputDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSubmit = vi.fn()

  // Helper function to render with ContainerProvider
  const renderWithContainer = (ui: React.ReactElement) => {
    return render(
      <ContainerProvider container={document.body}>{ui}</ContainerProvider>,
    )
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render text input for text type variable", () => {
      const variables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "John",
        },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.getByText("name:")).toBeInTheDocument()
      const input = screen.getByDisplayValue("John")
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe("INPUT")
    })

    it("should render textarea for textarea type variable", () => {
      const variables: VariableConfig[] = [
        {
          name: "description",
          type: "textarea",
          defaultValue: "Default description",
        },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.getByText("description:")).toBeInTheDocument()
      const textarea = screen.getByDisplayValue("Default description")
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe("TEXTAREA")
    })

    it("should render select for select type variable", () => {
      const variables: VariableConfig[] = [
        {
          name: "weather",
          type: "select",
          defaultValue: "sunny",
          selectOptions: {
            options: ["sunny", "cloudy", "rainy"],
          },
        },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.getByText("weather:")).toBeInTheDocument()
      const select = screen.getByRole("combobox")
      expect(select).toBeInTheDocument()
      // For Radix UI Select, the selected value is displayed in the trigger
      expect(screen.getByText("sunny")).toBeInTheDocument()
    })

    it("should not render exclude type variable", () => {
      const variables: VariableConfig[] = [
        {
          name: "excluded",
          type: "exclude",
        },
        {
          name: "name",
          type: "text",
        },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.queryByText("excluded:")).not.toBeInTheDocument()
      expect(screen.getByText("name:")).toBeInTheDocument()
    })

    it("should render multiple variables", () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text" },
        { name: "age", type: "text" },
        { name: "bio", type: "textarea" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.getByText("name:")).toBeInTheDocument()
      expect(screen.getByText("age:")).toBeInTheDocument()
      expect(screen.getByText("bio:")).toBeInTheDocument()
    })

    it("should apply default values", () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text", defaultValue: "Alice" },
        { name: "age", type: "text", defaultValue: "25" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      expect(screen.getByDisplayValue("Alice")).toBeInTheDocument()
      expect(screen.getByDisplayValue("25")).toBeInTheDocument()
    })
  })

  describe("User Interaction", () => {
    it("should update value when user types in text input", () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text", defaultValue: "" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "Bob" } })

      expect(input).toHaveValue("Bob")
    })

    it("should update value when user types in textarea", () => {
      const variables: VariableConfig[] = [
        { name: "bio", type: "textarea", defaultValue: "" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const textarea = screen.getByRole("textbox")
      fireEvent.change(textarea, { target: { value: "Multi-line\ntext" } })

      expect(textarea).toHaveValue("Multi-line\ntext")
    })

    it("should call onSubmit with values when submit button is clicked", async () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text", defaultValue: "John" },
        { name: "age", type: "text", defaultValue: "30" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const submitButton = screen.getByTestId(
        TestIds.variableInputDialog.submit,
      )
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
        const values: VariableValues = mockOnSubmit.mock.calls[0][0]
        expect(values).toEqual({
          name: "John",
          age: "30",
        })
      })
    })

    it("should call onOpenChange(false) when cancel button is clicked", () => {
      const variables: VariableConfig[] = [{ name: "name", type: "text" }]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const cancelButton = screen.getByRole("button", {
        name: "Close",
      })
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("should submit with updated values after user input", async () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text", defaultValue: "John" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "Alice" } })

      const submitButton = screen.getByTestId(
        TestIds.variableInputDialog.submit,
      )
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Alice",
        })
      })
    })

    it("should handle empty values", async () => {
      const variables: VariableConfig[] = [
        { name: "name", type: "text", defaultValue: "John" },
        { name: "optional", type: "text", defaultValue: "" },
      ]

      renderWithContainer(
        <VariableInputDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          variables={variables}
          onSubmit={mockOnSubmit}
        />,
      )

      const inputs = screen.getAllByRole("textbox")
      fireEvent.change(inputs[0], { target: { value: "" } })

      const submitButton = screen.getByTestId(
        TestIds.variableInputDialog.submit,
      )
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "",
          optional: "",
        })
      })
    })
  })
})
