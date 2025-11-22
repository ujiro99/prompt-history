/**
 * Category Service
 * Manages prompt categories
 */

import type { Category } from "@/types/promptOrganizer"
import { categoriesStorage } from "@/services/storage/definitions"

/**
 * Service for managing categories
 */
export class CategoryService {
  /**
   * Get all categories
   * @returns All categories
   */
  public async getAll(): Promise<Category[]> {
    const categoriesMap = await categoriesStorage.getValue()
    return Object.values(categoriesMap)
  }

  /**
   * Get category by ID
   * @param id - Category ID
   * @returns Category or undefined
   */
  public async getById(id: string): Promise<Category | undefined> {
    const categoriesMap = await categoriesStorage.getValue()
    return categoriesMap[id]
  }

  /**
   * Create a new category
   * @param name - Category name
   * @param description - Category description
   * @returns Created category
   */
  public async create(name: string, description?: string): Promise<Category> {
    const categoriesMap = await categoriesStorage.getValue()

    const now = new Date()
    const newCategory: Category = {
      id: crypto.randomUUID(),
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
    const categoriesMap = await categoriesStorage.getValue()
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
