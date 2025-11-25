import { describe, it, expect, beforeEach, vi } from "vitest"
import { CategoryService } from "../CategoryService"
import type { Category } from "@/types/promptOrganizer"

// Mock storage with vi.hoisted
const { mockCategoriesMap, mockStorage } = vi.hoisted(() => {
  const mockCategoriesMap: Record<string, Category> = {}
  const mockStorage = {
    getValue: vi.fn(async () => ({ ...mockCategoriesMap })),
    setValue: vi.fn(async (value: Record<string, Category>) => {
      Object.keys(mockCategoriesMap).forEach(
        (key) => delete mockCategoriesMap[key],
      )
      Object.assign(mockCategoriesMap, value)
    }),
  }
  return { mockCategoriesMap, mockStorage }
})

vi.mock("@/services/storage/definitions", () => ({
  categoriesStorage: mockStorage,
}))

describe("CategoryService", () => {
  let service: CategoryService

  beforeEach(() => {
    // Reset mock storage
    Object.keys(mockCategoriesMap).forEach(
      (key) => delete mockCategoriesMap[key],
    )

    // Add default categories
    mockCategoriesMap["externalCommunication"] = {
      id: "externalCommunication",
      name: "External Communication",
      description: "Communication with clients and customers",
      isDefault: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    }
    mockCategoriesMap["internalCommunication"] = {
      id: "internalCommunication",
      name: "Internal Communication",
      description: "Team communication and internal reports",
      isDefault: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    }

    service = new CategoryService()
    vi.clearAllMocks()
  })

  describe("getAll", () => {
    it("should return all categories", async () => {
      const categories = await service.getAll()

      expect(categories).toHaveLength(2)
      expect(categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "externalCommunication",
            name: "External Communication",
          }),
          expect.objectContaining({
            id: "internalCommunication",
            name: "Internal Communication",
          }),
        ]),
      )
    })

    it("should return empty array when no categories exist", async () => {
      Object.keys(mockCategoriesMap).forEach(
        (key) => delete mockCategoriesMap[key],
      )

      const categories = await service.getAll()

      expect(categories).toEqual([])
    })
  })

  describe("create", () => {
    it("should create a new category with name only", async () => {
      const category = await service.create("Test Category")

      expect(category).toMatchObject({
        name: "Test Category",
        isDefault: false,
      })
      expect(category.id).toBeDefined()
      expect(category.createdAt).toBeInstanceOf(Date)
      expect(category.updatedAt).toBeInstanceOf(Date)
      expect(mockStorage.setValue).toHaveBeenCalledWith(
        expect.objectContaining({
          [category.id]: category,
        }),
      )
    })

    it("should create a new category with name and description", async () => {
      const category = await service.create("Test Category", "Test Description")

      expect(category).toMatchObject({
        name: "Test Category",
        description: "Test Description",
        isDefault: false,
      })
    })

    it("should generate unique IDs for multiple categories", async () => {
      const category1 = await service.create("Category 1")
      const category2 = await service.create("Category 2")

      expect(category1.id).not.toBe(category2.id)
    })
  })

  describe("update", () => {
    it("should update category name", async () => {
      const updated = await service.update("externalCommunication", {
        name: "Updated Name",
      })

      expect(updated).toMatchObject({
        id: "externalCommunication",
        name: "Updated Name",
        description: "Communication with clients and customers",
      })
      expect(updated.updatedAt).toBeInstanceOf(Date)
      expect(mockStorage.setValue).toHaveBeenCalled()
    })

    it("should update category description", async () => {
      const updated = await service.update("externalCommunication", {
        description: "Updated Description",
      })

      expect(updated).toMatchObject({
        id: "externalCommunication",
        name: "External Communication",
        description: "Updated Description",
      })
    })

    it("should update both name and description", async () => {
      const updated = await service.update("externalCommunication", {
        name: "New Name",
        description: "New Description",
      })

      expect(updated).toMatchObject({
        id: "externalCommunication",
        name: "New Name",
        description: "New Description",
      })
    })

    it("should throw error for non-existent category", async () => {
      await expect(
        service.update("non-existent", { name: "New Name" }),
      ).rejects.toThrow("Category not found: non-existent")
    })
  })

  describe("delete", () => {
    it("should delete an existing category", async () => {
      await service.delete("externalCommunication")

      expect(mockStorage.setValue).toHaveBeenCalledWith(
        expect.not.objectContaining({
          externalCommunication: expect.anything(),
        }),
      )
    })

    it("should throw error for non-existent category", async () => {
      await expect(service.delete("non-existent")).rejects.toThrow(
        "Category not found: non-existent",
      )
    })

    it("should not call setValue when category does not exist", async () => {
      try {
        await service.delete("non-existent")
      } catch {
        // Expected error
      }

      expect(mockStorage.setValue).not.toHaveBeenCalled()
    })
  })
})
