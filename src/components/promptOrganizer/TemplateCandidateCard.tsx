/**
 * Template Candidate Card Component
 * Card component for displaying template candidates in list
 */

import { i18n } from "#imports"
import type { TemplateCandidate } from "@/types/promptOrganizer"
import { cn } from "@/lib/utils"

interface TemplateCandidateCardProps {
  candidate: TemplateCandidate
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export const TemplateCandidateCard = ({
  candidate,
  isSelected = false,
  onClick,
  className,
}: TemplateCandidateCardProps) => {
  // Get category name (with i18n for default categories)
  const getCategoryLabel = (categoryId: string): string => {
    // Try i18n key first for default categories
    const i18nKey = `organizer.category.${categoryId}`
    const translated = i18n.t(i18nKey)
    if (translated !== i18nKey) {
      return translated
    }
    // Fallback to category ID
    return categoryId
  }

  // Get status badge
  const getStatusBadge = () => {
    switch (candidate.userAction) {
      case "save":
      case "save_and_pin":
        return (
          <span className="ml-2 px-2 py-1 text-xs rounded bg-green-100 text-green-800">
            {i18n.t("promptOrganizer.status.saved")}
          </span>
        )
      case "discard":
        return (
          <span className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-800">
            {i18n.t("promptOrganizer.status.discarded")}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        "p-4 cursor-pointer transition-colors hover:bg-gray-50 border rounded-lg",
        isSelected ? "ring-2 ring-blue-500" : "",
        className,
      )}
      onClick={onClick}
    >
      <div className="space-y-1">
        {/* Header: Title and Status */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{candidate.title}</h3>
          {getStatusBadge()}
        </div>

        {/* Use case */}
        <p className="text-xs text-mute-foreground">{candidate.useCase}</p>

        {/* Category badge */}
        <div>
          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
            {getCategoryLabel(candidate.categoryId)}
          </span>
        </div>

        {/* Footer: Source count */}
        <div className="flex items-center text-xs text-gray-500 mt-2">
          <span>
            {i18n.t("promptOrganizer.result.sourceCount", [
              candidate.aiMetadata.sourceCount,
            ])}
          </span>
        </div>
      </div>
    </div>
  )
}
