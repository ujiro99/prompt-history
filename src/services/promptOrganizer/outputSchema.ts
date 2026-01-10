// Define JSON schema for structured output
export const schema = {
  type: "object",
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            maxLength: 40,
            description: "A short, descriptive title for the prompt template.",
          },
          content: {
            type: "string",
            description: "The reusable prompt template.",
          },
          useCase: {
            type: "string",
            maxLength: 80,
            description:
              "A concise statement describing the situation and purpose of this prompt.",
          },
          categoryId: {
            type: "string",
            description: "The ID of this prompt's category",
          },
          sourcePromptIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          clusterExplanation: {
            type: "string",
            maxLength: 200,
            description:
              "Brief explanation of why these prompts were grouped and what the common pattern is.",
          },
          variables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: {
                  type: "string",
                  enum: ["text", "select", "preset"],
                },
                defaultValue: { type: "string" },
                description: {
                  type: "string",
                  maxLength: 200,
                  description:
                    "short explanation of what value the user should input for this variable.",
                },
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
                presetOptions: {
                  type: "object",
                  properties: {
                    presetId: {
                      type: "string",
                      description: "ID of the variable preset to use",
                    },
                  },
                  required: ["presetId"],
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
          "clusterExplanation",
        ],
      },
    },
  },
  required: ["prompts"],
} as const
