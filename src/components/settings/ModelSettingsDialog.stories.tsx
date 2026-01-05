import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ModelSettingsDialog } from "./ModelSettingsDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import { AiModelContext } from "@/contexts/AiModelContext"

const meta = {
  title: "Settings/ModelSettingsDialog",
  component: ModelSettingsDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      // Create a container element for the dialog
      const container = document.createElement("div")
      document.body.appendChild(container)

      return (
        <ContainerProvider container={container}>
          <Story />
        </ContainerProvider>
      )
    },
  ],
} satisfies Meta<typeof ModelSettingsDialog>

export default meta
type Story = StoryObj<typeof meta>

// Default story - Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
  },
  decorators: [
    (Story) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

// Dialog open with no API key
export const OpenNoApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
  },
  decorators: [
    (Story) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

const API_KEY = import.meta.env.WXT_GENAI_API_KEY

// Dialog open with existing API key
export const OpenWithApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
  },
  decorators: [
    (Story) => (
      <AiModelContext.Provider value={{ genaiApiKey: API_KEY }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}
