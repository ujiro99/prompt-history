import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OrganizerResultDialog } from "./OrganizerResultDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import type {
  PromptOrganizerResult,
  TemplateCandidate,
} from "@/types/promptOrganizer"

const mockTemplates: TemplateCandidate[] = [
  {
    id: "1",
    title: "Code Review Template",
    content: "Review the following code:\n{{code}}",
    useCase: "For reviewing code snippets",
    clusterExplanation:
      "This template helps review code by providing structured feedback on code quality, best practices, and potential improvements.",
    categoryId: "documentCreation",
    variables: [
      {
        name: "code",
        type: "text",
        defaultValue: "",
      },
    ],
    aiMetadata: {
      sourcePromptIds: ["prompt1", "prompt2", "prompt3"],
      sourceCount: 3,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "pending",
  },
  {
    id: "2",
    title: "Bug Report Template",
    content:
      "Report a bug:\n**Description:** {{description}}\n**Steps to reproduce:** {{steps}}\n**Expected result:** {{expected}}\n**Actual result:** {{actual}}",
    useCase: "For reporting bugs in detail",
    clusterExplanation:
      "A comprehensive bug report template that ensures all necessary information is captured for effective debugging.",
    categoryId: "dev",
    variables: [
      {
        name: "description",
        type: "text",
        defaultValue: "",
      },
      {
        name: "steps",
        type: "text",
        defaultValue: "",
      },
      {
        name: "expected",
        type: "text",
        defaultValue: "",
      },
      {
        name: "actual",
        type: "text",
        defaultValue: "",
      },
    ],
    aiMetadata: {
      sourcePromptIds: ["prompt4", "prompt5"],
      sourceCount: 2,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "pending",
  },
  {
    id: "3",
    title: "Meeting Summary",
    content:
      "Summarize the following meeting:\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n**Topics:** {{topics}}\n**Action Items:** {{actions}}",
    useCase: "For creating meeting summaries",
    clusterExplanation:
      "Captures key points from meetings including attendees, topics discussed, and action items for follow-up.",
    categoryId: "general",
    variables: [
      {
        name: "date",
        type: "text",
        defaultValue: "",
      },
      {
        name: "attendees",
        type: "text",
        defaultValue: "",
      },
      {
        name: "topics",
        type: "text",
        defaultValue: "",
      },
      {
        name: "actions",
        type: "text",
        defaultValue: "",
      },
    ],
    aiMetadata: {
      sourcePromptIds: ["prompt6", "prompt7", "prompt8", "prompt9"],
      sourceCount: 4,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "pending",
  },
]

const mockResult: PromptOrganizerResult = {
  templates: mockTemplates,
  sourceCount: 25,
  sourcePromptIds: [
    "prompt1",
    "prompt2",
    "prompt3",
    "prompt4",
    "prompt5",
    "prompt6",
    "prompt7",
    "prompt8",
    "prompt9",
  ],
  periodDays: 30,
  executedAt: new Date("2025-01-10T12:00:00Z"),
  inputTokens: 5000,
  outputTokens: 2000,
  successMessage:
    "Great! I've analyzed your prompts and found some useful patterns. These templates will help you save time on repetitive tasks.",
  successMessageGenerated: true,
}

const mockResultNoSuccessMessage: PromptOrganizerResult = {
  ...mockResult,
  successMessage: undefined,
  successMessageGenerated: false,
}

const mockResultNoTemplates: PromptOrganizerResult = {
  templates: [],
  sourceCount: 5,
  sourcePromptIds: ["prompt1", "prompt2"],
  periodDays: 30,
  executedAt: new Date("2025-01-10T12:00:00Z"),
  inputTokens: 1000,
  outputTokens: 500,
  successMessage: undefined,
  successMessageGenerated: false,
}

const mockResultSingleTemplate: PromptOrganizerResult = {
  templates: [mockTemplates[0]],
  sourceCount: 10,
  sourcePromptIds: ["prompt1", "prompt2", "prompt3"],
  periodDays: 30,
  executedAt: new Date("2025-01-10T12:00:00Z"),
  inputTokens: 3000,
  outputTokens: 1000,
  successMessage: "I've created one useful template from your prompt history.",
  successMessageGenerated: true,
}

const mockResultManyTemplates: PromptOrganizerResult = {
  templates: [...mockTemplates, ...mockTemplates, ...mockTemplates],
  sourceCount: 100,
  sourcePromptIds: Array.from({ length: 50 }, (_, i) => `prompt${i}`),
  periodDays: 90,
  executedAt: new Date("2025-01-10T12:00:00Z"),
  inputTokens: 15000,
  outputTokens: 6000,
  successMessage:
    "Excellent! I've discovered many useful patterns in your prompts. These 9 templates cover a wide range of your common tasks.",
  successMessageGenerated: true,
}

const meta = {
  title: "PromptOrganizer/OrganizerResultDialog",
  component: OrganizerResultDialog,
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
} satisfies Meta<typeof OrganizerResultDialog>

export default meta
type Story = StoryObj<typeof meta>

// Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    result: mockResult,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with no templates generated
export const NoTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: mockResultNoTemplates,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with templates (normal case)
export const WithTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: mockResult,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with templates but no success message
export const WithTemplatesNoSuccessMessage: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: mockResultNoSuccessMessage,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with single template
export const WithSingleTemplate: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: mockResultSingleTemplate,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with many templates
export const WithManyTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: mockResultManyTemplates,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}

// Dialog open with null result
export const WithNullResult: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    result: null,
    onPreview: fn(),
    onSaveAll: fn(),
  },
}
