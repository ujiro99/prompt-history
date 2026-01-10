import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn, userEvent, expect, screen } from "storybook/test"
import { ImportDialog } from "./ImportDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import { TestIds } from "@/components/const"

import { PromptServiceFacade } from "@/services/promptServiceFacade"
const serviceFacade = PromptServiceFacade.getInstance()

// test data
import validCsv from "/e2e/fixtures/prompts-export-2025-09-30T04-11-48.csv?raw"
import invalidCsv from "/e2e/fixtures/malformed-prompts.csv?raw"

const meta = {
  title: "InputMenu/ImportDialog",
  component: ImportDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      serviceFacade.initialize()

      return (
        <ContainerProvider container={container}>
          <Story />
        </ContainerProvider>
      )
    },
  ],
} satisfies Meta<typeof ImportDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    onImportComplete: fn(),
  },
}

export const Idle: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onImportComplete: fn(),
  },
}

export const ValidFileSelected: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onImportComplete: fn(),
  },
  play: async () => {
    const fileInput = await screen.findByTestId(TestIds.import.fileInput)

    const file = new File([validCsv], "sample.csv", {
      type: "text/csv",
    })

    await userEvent.upload(fileInput, file)

    // Assert
    const msg = await screen.findByTestId(TestIds.import.ui.willImport)
    expect(msg).toBeInTheDocument()
  },
}

export const InvalidFileSelected: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onImportComplete: fn(),
  },
  play: async () => {
    const fileInput = await screen.findByTestId(TestIds.import.fileInput)

    const file = new File([invalidCsv], "sample.csv", {
      type: "text/csv",
    })

    await userEvent.upload(fileInput, file)

    // Assert
    const msg = await screen.findByTestId(TestIds.import.ui.errors)
    expect(msg).toBeInTheDocument()
  },
}

export const Imported: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onImportComplete: fn(),
  },
  play: async ({ args }) => {
    const fileInput = await screen.findByTestId(TestIds.import.fileInput)

    const testCsv = `"name","content","executionCount","lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt"
"prompt_name${Date.now()}","prompt_content","1","2025-09-23T07:12:15.055Z","false","https://gemini.google.com/app","2025-09-23T07:12:15.055Z","2025-09-23T07:12:15.055Z"`

    const file = new File([testCsv], "sample.csv", {
      type: "text/csv",
    })

    await userEvent.upload(fileInput, file)
    const button = await screen.findByTestId(TestIds.import.executeButton)
    await userEvent.click(button)

    // Assert
    const msg = await screen.findByTestId(TestIds.import.ui.imported)
    expect(msg).toBeInTheDocument()
    expect(args.onImportComplete).toHaveBeenCalled()
  },
}
