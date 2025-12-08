/**
 * Default categories for Prompt Organizer
 * Based on design specification in docs/PromptOrganizer/03_data_model.md
 */

import type { Category } from "@/types/promptOrganizer"

/**
 * Default category definitions
 * Categories are defined as a Record for direct storage usage
 */
export const DEFAULT_CATEGORIES: Record<string, Category> = {
  externalCommunication: {
    id: "externalCommunication",
    name: "organizer.category.externalCommunication",
    isDefault: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  internalCommunication: {
    id: "internalCommunication",
    name: "organizer.category.internalCommunication",
    isDefault: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  documentCreation: {
    id: "documentCreation",
    name: "organizer.category.documentCreation",
    isDefault: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  development: {
    id: "development",
    name: "organizer.category.development",
    isDefault: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  other: {
    id: "other",
    name: "organizer.category.other",
    isDefault: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
}
