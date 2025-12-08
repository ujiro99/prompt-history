import type { Category } from "@/types/promptOrganizer"
import { DEFAULT_CATEGORIES } from "@/services/promptOrganizer/defaultCategories"
import { i18n } from "#imports"

export const getDefaultCategories = (): Record<string, Category> => {
  const categories: Record<string, Category> = {}
  for (const categoryId in DEFAULT_CATEGORIES) {
    categories[categoryId] = {
      ...DEFAULT_CATEGORIES[categoryId],
      name: translateCategoryName(categoryId),
    }
  }
  return categories
}

const translateCategoryName = (categoryId: string): string => {
  const category = DEFAULT_CATEGORIES[categoryId]
  if (category) {
    return i18n.t(`organizer.category.${category.id}`)
  }
  return "Unknown Category"
}
