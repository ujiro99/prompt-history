/**
 * Category Service
 * Manages prompt categories
 */

import type { Category } from "@/types/promptOrganizer"
import { categoriesStorage } from "@/services/storage/definitions"
import { getDefaultCategories } from "@/services/storage/categoryHelper"
import { generateCategoryId } from "@/utils/idGenerator"

/**
 * Get the category map, initializing with default categories if empty
 * @returns Category map
 */
const getCategoryMap = async (): Promise<Record<string, Category>> => {
  let categoriesMap = await categoriesStorage.getValue()

  // If no categories exist, initialize with default categories
  if (Object.keys(categoriesMap).length === 0) {
    categoriesMap = getDefaultCategories()
    await categoriesStorage.setValue(categoriesMap)
  }

  return categoriesMap
}

/**
 * Service for managing categories
 */
export class CategoryService {
  /**
   * Get all categories
   * @returns All categories
   */
  public async getAll(): Promise<Category[]> {
    const categoriesMap = await getCategoryMap()
    return Object.values(categoriesMap)
  }

  /**
   * Create a new category
   * @param name - Category name
   * @param description - Category description
   * @returns Created category
   */
  public async create(name: string, description?: string): Promise<Category> {
    const categoriesMap = await getCategoryMap()

    const now = new Date()
    const newCategory: Category = {
      id: generateCategoryId(),
      name,
      description,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }

    categoriesMap[newCategory.id] = newCategory
    await categoriesStorage.setValue(categoriesMap)

    return newCategory
  }

  /**
   * Update a category
   * @param id - Category ID
   * @param updates - Fields to update
   * @returns Updated category
   */
  public async update(
    id: string,
    updates: { name?: string; description?: string },
  ): Promise<Category> {
    const categoriesMap = await getCategoryMap()
    const category = categoriesMap[id]

    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    const updated: Category = {
      ...category,
      ...updates,
      updatedAt: new Date(),
    }

    categoriesMap[id] = updated
    await categoriesStorage.setValue(categoriesMap)

    return updated
  }

  /**
   * Delete a category
   * @param id - Category ID
   */
  public async delete(id: string): Promise<void> {
    const categoriesMap = await categoriesStorage.getValue()

    if (!categoriesMap[id]) {
      throw new Error(`Category not found: ${id}`)
    }

    delete categoriesMap[id]
    await categoriesStorage.setValue(categoriesMap)
  }
}

export const categoryService = new CategoryService()
