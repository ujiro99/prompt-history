import { cn } from "@/lib/utils"
import { i18n } from "#imports"

interface GroupHeaderProps {
  labelKey: string
  count: number
  className?: string
}

/**
 * Group header component for displaying group information
 */
export const GroupHeader = ({
  labelKey,
  count,
  className,
}: GroupHeaderProps) => {
  // Handle special case for year labels
  const getDisplayLabel = (key: string): string => {
    if (key.startsWith("groups.year:")) {
      const year = key.split(":")[1]
      return i18n.t("groups.year", [year])
    }
    return i18n.t(key)
  }

  const displayLabel = getDisplayLabel(labelKey)

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 bg-gray-100 text-[11px] font-medium text-gray-600",
        className,
      )}
      role="group"
      aria-label={i18n.t("accessibility.groupLabel", [displayLabel, count])}
    >
      <span className="truncate">{displayLabel}</span>
      <span className="text-gray-400 flex-shrink-0">{count}</span>
    </div>
  )
}
