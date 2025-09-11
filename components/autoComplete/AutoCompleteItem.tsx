import React from "react"
import { ChevronRight } from "lucide-react"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import { cn } from "@/lib/utils"

interface AutoCompleteItemProps {
  match: AutoCompleteMatch
  isSelected: boolean
  onClick: (match: AutoCompleteMatch) => void
  onMouseEnter: () => void
}

export const AutoCompleteItem: React.FC<AutoCompleteItemProps> = ({
  match,
  isSelected,
  onClick,
  onMouseEnter,
}) => {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 transition",
        "flex items-center space-x-1",
        isSelected
          ? "bg-gray-50 text-gray-800 px-2"
          : "bg-white text-gray-800 hover:bg-gray-50",
      )}
      onClick={() => onClick(match)}
      onMouseEnter={onMouseEnter}
    >
      {isSelected && <ChevronRight size={18} className="text-gray-500" />}
      <div className="w-full overflow-hidden">
        <div className="font-medium truncate">{match.name}</div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {match.content}
        </div>
      </div>
    </div>
  )
}
