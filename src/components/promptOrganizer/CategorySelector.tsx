/**
 * Category Selector Component
 * Dropdown for selecting prompt categories
 */

import { useEffect, useState } from "react"
import { i18n } from "#imports"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Category } from "@/types/promptOrganizer"
import { categoryService } from "@/services/promptOrganizer/CategoryService"

interface CategorySelectorProps {
  value: string
  onValueChange: (categoryId: string) => void
  className?: string
}

export const CategorySelector = ({
  value,
  onValueChange,
  className,
}: CategorySelectorProps) => {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    // Load categories
    categoryService.getAll().then(setCategories)
  }, [])

  // Get category name (with i18n for default categories)
  const getCategoryName = (category: Category): string => {
    if (category.isDefault) {
      const i18nKey = `organizer.category.${category.id}`
      return i18n.t(i18nKey)
    }
    return category.name
  }

  // Separate default and custom categories
  const defaultCategories = categories.filter((c) => c.isDefault)
  const customCategories = categories.filter((c) => !c.isDefault)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue
          placeholder={i18n.t("organizer.category.selectCategory")}
        />
      </SelectTrigger>
      <SelectContent>
        {/* Default categories */}
        {defaultCategories.length > 0 && (
          <>
            {defaultCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {getCategoryName(category)}
              </SelectItem>
            ))}
          </>
        )}

        {/* Custom categories */}
        {customCategories.length > 0 && (
          <>
            {defaultCategories.length > 0 && (
              <div className="my-1 h-px bg-border" />
            )}
            {customCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}
