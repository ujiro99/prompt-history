import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ImportDialog } from "./ImportDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"

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
