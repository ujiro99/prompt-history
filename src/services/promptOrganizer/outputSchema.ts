// Define JSON schema for structured output
export const schema = {
  type: "object",
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          useCase: { type: "string" },
          categoryId: { type: "string" },
          sourcePromptIds: {
            type: "array",
            items: { type: "string" },
          },
          variables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
        required: [
          "title",
          "content",
          "useCase",
          "categoryId",
          "sourcePromptIds",
          "variables",
        ],
      },
    },
  },
  required: ["prompts"],
}
