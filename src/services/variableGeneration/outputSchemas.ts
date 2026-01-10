/**
 * JSON Schema definitions for Gemini API structured output
 * These schemas define the expected response format for AI-generated variable content
 */

const MAX_EXPLANATION_LENGTH = 400

/**
 * Schema for text-type variable generation
 * Generates multi-line text content
 */
const TEXT_SCHEMA = {
  type: "object",
  properties: {
    textContent: {
      type: "string",
      description: "Generated text content",
    },
    explanation: {
      type: "string",
      description: `Explanation of the generated content (max ${MAX_EXPLANATION_LENGTH} characters)`,
      maxLength: MAX_EXPLANATION_LENGTH,
    },
  },
  required: ["textContent", "explanation"],
} as const

/**
 * Schema for select-type variable generation
 * Generates a list of selectable options
 */
const SELECT_SCHEMA = {
  type: "object",
  properties: {
    selectOptions: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Generated list of select options",
      minItems: 3,
      maxItems: 10,
    },
    explanation: {
      type: "string",
      description: `Explanation of the generated content (max ${MAX_EXPLANATION_LENGTH} characters)`,
      maxLength: MAX_EXPLANATION_LENGTH,
    },
  },
  required: ["selectOptions", "explanation"],
} as const

/**
 * Schema for dictionary-type variable generation
 * Generates a list of dictionary items (key-value pairs)
 */
const DICTIONARY_SCHEMA = {
  type: "object",
  properties: {
    dictionaryItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Item name",
            maxLength: 20,
          },
          content: {
            type: "string",
            description: "Item content (multi-line string)",
          },
        },
        required: ["name", "content"],
      },
      description: "Generated list of dictionary items",
      minItems: 3,
    },
    explanation: {
      type: "string",
      description: `Explanation of the generated content (max ${MAX_EXPLANATION_LENGTH} characters)`,
      maxLength: MAX_EXPLANATION_LENGTH,
    },
  },
  required: ["dictionaryItems", "explanation"],
} as const

/**
 * Get schema by variable type
 * @param variableType - Variable type (text / select / dictionary)
 * @returns Corresponding JSON schema
 */
export function getSchemaByType(
  variableType: "text" | "select" | "dictionary",
): Record<string, unknown> {
  switch (variableType) {
    case "text":
      return TEXT_SCHEMA
    case "select":
      return SELECT_SCHEMA
    case "dictionary":
      return DICTIONARY_SCHEMA
    default:
      throw new Error(`Unknown variable type: ${variableType}`)
  }
}
