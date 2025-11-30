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
            {i18n.t("promptOrganizer.status.save")}
          </span>
        )
      case "discard":
        return (
          <span className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-800">
            {i18n.t("promptOrganizer.status.discard")}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        "px-4 pt-2 pb-3 cursor-pointer transition-colors hover:bg-gray-50 border rounded-lg",
        isSelected ? "ring-2 ring-blue-500" : "",
        className,
      )}
      onClick={onClick}
    >
      <div className="space-y-1">
        {/* Category badge */}
        <div>
          <span className="px-2 py-1 text-[10px] rounded bg-gray-100 text-neutral-800">
            {getCategoryLabel(candidate.categoryId)}
          </span>
        </div>

        {/* Header: Title and Status */}
        <div className="relative flex items-center">
          <h3 className="font-semibold text-sm">{candidate.title}</h3>
          <p className="absolute top-0 right-0">{getStatusBadge()}</p>
        </div>

        {/* Use case */}
        <p className="text-xs text-mute-foreground">{candidate.useCase}</p>

        {/* Footer: Source count */}
        <div className="flex items-center text-xs text-neutral-500 pt-1">
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
