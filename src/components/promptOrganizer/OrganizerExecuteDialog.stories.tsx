import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OrganizerExecuteDialog } from "./OrganizerExecuteDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import { AiModelContextProvider } from "@/contexts/AiModelContext"
import type {
  GenerationProgress,
  OrganizerError,
  TemplateCandidate,
} from "@/types/promptOrganizer"

const mockPendingTemplates: TemplateCandidate[] = [
  {
    id: "1",
    title: "Code Review Template",
    content: "Review the following code:\n{{code}}",
    useCase: "For reviewing code snippets",
    clusterExplanation: "Code review related prompts",
    categoryId: "dev",
    variables: [],
    aiMetadata: {
      sourcePromptIds: ["prompt1", "prompt2"],
      sourceCount: 2,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "pending",
  },
  {
    id: "2",
    title: "Bug Report Template",
    content: "Report a bug:\n{{description}}",
    useCase: "For reporting bugs",
    clusterExplanation: "Bug reporting prompts",
    categoryId: "dev",
    variables: [],
    aiMetadata: {
      sourcePromptIds: ["prompt3", "prompt4"],
      sourceCount: 2,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "pending",
  },
]

const mockProgressSending: GenerationProgress = {
  chunk: null,
  accumulated: "",
  estimatedProgress: 10,
  status: "sending",
  thoughtsTokens: 0,
  outputTokens: 0,
}

const mockProgressThinking: GenerationProgress = {
  chunk: null,
  accumulated: "",
  estimatedProgress: 30,
  status: "thinking",
  thoughtsTokens: 150,
  outputTokens: 0,
}

const mockProgressGenerating: GenerationProgress = {
  chunk: '{"templates": [',
  accumulated:
    '{"templates": [{"id": "1", "title": "Code Review", "content": "Review...',
  estimatedProgress: 65,
  status: "generating",
  thoughtsTokens: 2500,
  outputTokens: 1200,
}

const mockProgressComplete: GenerationProgress = {
  chunk: null,
  accumulated:
    '{"templates": [{"id": "1", "title": "Code Review", "content": "Review the code"}]}',
  estimatedProgress: 100,
  status: "complete",
  thoughtsTokens: 300,
  outputTokens: 450,
}

const mockError: OrganizerError = {
  code: "API_ERROR",
  message: "Failed to generate templates: API rate limit exceeded",
}

const meta = {
  title: "PromptOrganizer/1_OrganizerExecuteDialog",
  component: OrganizerExecuteDialog,
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
} satisfies Meta<typeof OrganizerExecuteDialog>

export default meta
type Story = StoryObj<typeof meta>

const API_KEY = import.meta.env.WXT_GENAI_API_KEY

// Helper function to set API key
const setApiKey = (apiKey: string | null) => {
  const windowWithMock = window as Window & {
    __STORYBOOK_GENAI_API_KEY__?: string | null
  }
  windowWithMock.__STORYBOOK_GENAI_API_KEY__ = apiKey
}

// Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: false,
    isCanceling: false,
    progress: null,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open - initial state (ready to execute)
export const OpenInitial: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: false,
    isCanceling: false,
    progress: null,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Dialog open with pending templates
export const OpenWithPendingTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: false,
    isCanceling: false,
    progress: null,
    error: null,
    onCancel: fn(),
    pendingTemplates: mockPendingTemplates,
    onOpenPreview: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
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
    onExecute: fn(),
    isExecuting: false,
    isCanceling: false,
    progress: null,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(null)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Executing - sending phase
export const ExecutingSending: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: true,
    isCanceling: false,
    progress: mockProgressSending,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Executing - thinking phase
export const ExecutingThinking: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: true,
    isCanceling: false,
    progress: mockProgressThinking,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Executing - generating phase
export const ExecutingGenerating: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: true,
    isCanceling: false,
    progress: mockProgressGenerating,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Executing - complete
export const ExecutingComplete: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: true,
    isCanceling: false,
    progress: mockProgressComplete,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// Canceling
export const Canceling: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: true,
    isCanceling: true,
    progress: mockProgressGenerating,
    error: null,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}

// With error
export const WithError: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onExecute: fn(),
    isExecuting: false,
    isCanceling: false,
    progress: null,
    error: mockError,
    onCancel: fn(),
  },
  decorators: [
    (Story: React.ComponentType) => {
      setApiKey(API_KEY)
      return (
        <AiModelContextProvider>
          <Story />
        </AiModelContextProvider>
      )
    },
  ],
}
