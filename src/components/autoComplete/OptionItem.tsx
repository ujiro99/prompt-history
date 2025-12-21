import React, { forwardRef } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Key } from "@/components/Key"
import type { PresetVariableType, DictionaryItem } from "@/types/prompt"

/**
 * Props for OptionItem component
 */
interface OptionItemProps {
  option: string | DictionaryItem
  presetType: PresetVariableType
  isSelected: boolean
  onClick: () => void
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void
}

/**
 * Individual option item component for preset options list
 */
export const OptionItem = forwardRef<HTMLButtonElement, OptionItemProps>(
  ({ option, presetType, isSelected, onClick, onMouseEnter }, ref) => {
    const name = typeof option === "string" ? option : option.name
    const content = typeof option === "string" ? "" : option.content

    return (
      <button
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "w-full text-left px-3 py-1.5 text-sm cursor-pointer border-b",
          isSelected ? "bg-neutral-50" : "bg-white hover:bg-neutral-50",
        )}
        onClick={onClick}
        onMouseEnter={(e) => onMouseEnter(e)}
      >
        <div className="flex items-center gap-1">
          {isSelected && (
            <div className={cn("shrink-0")}>
              <ChevronRight size={18} className="shrink-0 text-neutral-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium">{name}</p>
            {presetType === "dictionary" && (
              <p className="text-xs text-neutral-600 truncate mt-0.5 font-light">
                {content}
              </p>
            )}
          </div>
          {isSelected && <Key className="text-[10px]">Tab</Key>}
        </div>
      </button>
    )
  },
)

OptionItem.displayName = "OptionItem"
