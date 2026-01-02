import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { AIGenerationDialog } from "./AIGenerationDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import {
  AiModelContextProvider,
  AiModelContext,
} from "@/contexts/AiModelContext"

const meta = {
  title: "Settings/VariablePresets/AIGenerationDialog",
  component: AIGenerationDialog,
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
} satisfies Meta<typeof AIGenerationDialog>

export default meta
type Story = StoryObj<typeof meta>

const API_KEY = import.meta.env.WXT_GENAI_API_KEY

// Helper function to set API key
const setApiKey = () => {
  const windowWithMock = window as Window & {
    __STORYBOOK_GENAI_API_KEY__?: string | null
  }
  windowWithMock.__STORYBOOK_GENAI_API_KEY__ = API_KEY
}

// Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context",
    variableType: "text",
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with text type variable
export const OpenTextType: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context for the current task",
    variableType: "text",
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with select type variable
export const OpenSelectType: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "programmingLanguage",
    variablePurpose: "Select the programming language for code generation",
    variableType: "select",
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with dictionary type variable
export const OpenDictionaryType: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "codeSnippets",
    variablePurpose: "Commonly used code snippets for the project",
    variableType: "dictionary",
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with existing text content
export const OpenWithExistingTextContent: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context",
    variableType: "text",
    existingContent: {
      textContent:
        "This is a web extension project built with WXT framework and React.",
    },
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with existing select options
export const OpenWithExistingSelectOptions: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "programmingLanguage",
    variablePurpose: "Select the programming language",
    variableType: "select",
    existingContent: {
      selectOptions: ["JavaScript", "TypeScript", "Python"],
    },
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with existing dictionary items
export const OpenWithExistingDictionaryItems: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "codeSnippets",
    variablePurpose: "Commonly used code snippets",
    variableType: "dictionary",
    existingContent: {
      dictionaryItems: [
        {
          id: "1",
          name: "React Component",
          content:
            "import React from 'react'\n\nconst Component = () => {\n  return <div>Hello</div>\n}\n\nexport default Component",
        },
        {
          id: "2",
          name: "Async Function",
          content:
            "const fetchData = async () => {\n  try {\n    const response = await fetch(url)\n    return await response.json()\n  } catch (error) {\n    console.error(error)\n  }\n}",
        },
      ],
    },
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with no API key
export const OpenNoApiKey: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context",
    variableType: "text",
    onApply: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <AiModelContext.Provider value={{ genaiApiKey: null }}>
        <Story />
      </AiModelContext.Provider>
    ),
  ],
}

// Dialog open with text type variable
export const Generating: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context for the current task",
    variableType: "text",
    onApply: fn(),
    debugState: "generating",
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with text type variable
export const Success: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context for the current task",
    variableType: "text",
    onApply: fn(),
    debugState: "success",
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with text type variable
export const Error: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    variableName: "projectContext",
    variablePurpose: "Provide relevant project context for the current task",
    variableType: "text",
    onApply: fn(),
    debugState: "error",
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey()
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}
