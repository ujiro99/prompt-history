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
        "flex items-center justify-between px-2 py-1.5 text-xs",
        className,
      )}
      role="group"
      aria-label={i18n.t("accessibility.groupLabel", [displayLabel, count])}
    >
      <span className="text-muted-foreground truncate">{displayLabel}</span>
      <span className="text-muted-foreground flex-shrink-0 bg-neutral-100 p-1 py-0.5 min-w-5 rounded text-center">
        {count}
      </span>
    </div>
  )
}
