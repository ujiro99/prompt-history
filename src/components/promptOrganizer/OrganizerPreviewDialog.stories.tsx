import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OrganizerPreviewDialog } from "./OrganizerPreviewDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import type { TemplateCandidate } from "@/types/promptOrganizer"

const mockTemplates: TemplateCandidate[] = [
  {
    id: "1",
    title: "Code Review Template",
    content: "Review the following code:\n{{code}}",
    useCase: "For reviewing code snippets",
    clusterExplanation:
      "This template helps review code by providing structured feedback on code quality, best practices, and potential improvements.",
    categoryId: "dev",
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

const mockTemplatesReviewed: TemplateCandidate[] = [
  {
    ...mockTemplates[0],
    userAction: "save",
  },
  {
    ...mockTemplates[1],
    userAction: "discard",
  },
  {
    ...mockTemplates[2],
    userAction: "save_and_pin",
  },
]

const mockTemplatesMixed: TemplateCandidate[] = [
  {
    ...mockTemplates[0],
    userAction: "save",
  },
  {
    ...mockTemplates[1],
    userAction: "pending",
  },
  {
    ...mockTemplates[2],
    userAction: "pending",
  },
]

const meta = {
  title: "PromptOrganizer/3_OrganizerPreviewDialog",
  component: OrganizerPreviewDialog,
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
} satisfies Meta<typeof OrganizerPreviewDialog>

export default meta
type Story = StoryObj<typeof meta>

// Dialog closed
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: fn(),
    templates: mockTemplates,
    onSave: fn(),
  },
}

// Dialog open with pending templates
export const OpenWithTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: mockTemplates,
    onSave: fn(),
  },
}

// Dialog open with empty templates
export const OpenWithEmptyTemplates: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: [],
    onSave: fn(),
  },
}

// Dialog open with all templates reviewed
export const OpenWithAllReviewed: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: mockTemplatesReviewed,
    onSave: fn(),
  },
}

// Dialog open with mixed user actions (some reviewed, some pending)
export const OpenWithMixedActions: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: mockTemplatesMixed,
    onSave: fn(),
  },
}

// Dialog open with single template
export const OpenWithSingleTemplate: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: [mockTemplates[0]],
    onSave: fn(),
  },
}

// Dialog open with template containing many variables
export const OpenWithManyVariables: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: [
      {
        id: "variable-rich",
        title: "Complex Template with Many Variables",
        content:
          "{{var1}} {{var2}} {{var3}} {{var4}} {{var5}} {{var6}} {{var7}} {{var8}}",
        useCase: "Template with many variables for testing",
        clusterExplanation:
          "This template demonstrates handling of multiple variables in a single template.",
        categoryId: "dev",
        variables: [
          { name: "var1", type: "text", defaultValue: "value1" },
          { name: "var2", type: "text", defaultValue: "value2" },
          { name: "var3", type: "text", defaultValue: "value3" },
          { name: "var4", type: "text", defaultValue: "value4" },
          { name: "var5", type: "text", defaultValue: "" },
          { name: "var6", type: "text", defaultValue: "" },
          { name: "var7", type: "text", defaultValue: "" },
          { name: "var8", type: "text", defaultValue: "" },
        ],
        aiMetadata: {
          sourcePromptIds: ["prompt10"],
          sourceCount: 1,
          confirmed: false,
          showInPinned: false,
        },
        userAction: "pending",
      },
    ],
    onSave: fn(),
  },
}

// Dialog open with long content
export const OpenWithLongContent: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    templates: [
      {
        id: "long-content",
        title: "Template with Long Content",
        content: `# Long Content Template

This is a template with very long content to test scrolling behavior.

## Section 1
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 2
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Section 3
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Section 4
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## Section 5
{{placeholder1}}

## Section 6
{{placeholder2}}

## Section 7
{{placeholder3}}`,
        useCase: "Testing long content scrolling",
        clusterExplanation:
          "This template is designed to test the UI's handling of lengthy content and ensure proper scrolling functionality.",
        categoryId: "general",
        variables: [
          { name: "placeholder1", type: "text", defaultValue: "" },
          { name: "placeholder2", type: "text", defaultValue: "" },
          { name: "placeholder3", type: "text", defaultValue: "" },
        ],
        aiMetadata: {
          sourcePromptIds: Array.from({ length: 10 }, (_, i) => `prompt${i}`),
          sourceCount: 10,
          confirmed: false,
          showInPinned: false,
        },
        userAction: "pending",
      },
    ],
    onSave: fn(),
  },
}
