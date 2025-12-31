import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PromptImproverSettingsDialog } from "./PromptImproverSettingsDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import { AiModelContext } from "@/contexts/AiModelContext"

const meta = {
  title: "Settings/PromptImproverSettingsDialog",
  component: PromptImproverSettingsDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story: React.ComponentType) => {
      const container = document.createElement("div")
      document.body.appendChild(container)

      return (
        <ContainerProvider container={container}>
          <Story />
        </ContainerProvider>
      )
    },
  ],
} satisfies Meta<typeof PromptImproverSettingsDialog>

export default meta
type Story = StoryObj<typeof meta>

// Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    onClickModelSettings: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

// Dialog open with URL mode (no API key)
export const OpenUrlModeNoApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onClickModelSettings: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

// Dialog open with URL mode (with API key)
export const OpenUrlModeWithApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onClickModelSettings: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider
        value={{ genaiApiKey: "AIzaSyD1234567890abcdefghijklmnopqrstuv" }}
      >
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

// Dialog open with text mode (no API key)
export const OpenTextModeNoApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onClickModelSettings: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
  parameters: {
    // Mock the storage to return text mode settings
    mockData: {
      mode: "text",
    },
  },
}

// Dialog open with text mode (with API key)
export const OpenTextModeWithApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onClickModelSettings: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider
        value={{ genaiApiKey: "AIzaSyD1234567890abcdefghijklmnopqrstuv" }}
      >
        <Story />
      </AiModelContext.Provider>
    ),
  ],
  parameters: {
    // Mock the storage to return text mode settings
    mockData: {
      mode: "text",
    },
  },
}
