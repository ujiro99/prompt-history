// Define JSON schema for structured output
export const schema = {
  type: "object",
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 40 },
          content: { type: "string" },
          useCase: { type: "string", maxLength: 100 },
          categoryId: { type: "string" },
          sourcePromptIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          variables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: {
                  type: "string",
                  enum: ["text", "textarea", "select"],
                },
                defaultValue: { type: "string" },
                selectOptions: {
                  type: "object",
                  properties: {
                    options: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 1,
                    },
                  },
                },
              },
              required: ["name", "type"],
            },
            minItems: 0,
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
} as const
