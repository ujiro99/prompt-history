import React from "react"
import { Star, ChevronRight, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { TestIds } from "@/components/const"
import { Key } from "@/components/Key"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"

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
  const handleClick = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick(match)
  }

  // Highlight the matched part of the name
  const start = match.name
    .toLowerCase()
    .lastIndexOf(match.searchTerm.toLowerCase())
  const end = start + match.searchTerm.length
  const name1 = match.name.slice(0, start)
  const name2 = match.name.slice(start, end)
  const name3 = match.name.slice(end)

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-1.5 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 transition",
        "flex items-center space-x-1",
        isSelected
          ? "bg-gray-50 text-gray-800 px-2 active"
          : "bg-white text-gray-800 hover:bg-gray-50",
      )}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      data-testid={TestIds.autocomplete.item}
    >
      {isSelected && <ChevronRight size={18} className="text-gray-500" />}
      <div className="w-full overflow-hidden">
        <p className="truncate font-light">
          {match.isPinned && (
            <Star
              size={14}
              className="inline mr-1 mb-0.5 fill-yellow-300 stroke-yellow-400"
            />
          )}
          {name1}
          <span className="font-medium bg-amber-100 px-0.5 rounded">
            {name2}
          </span>
          {name3}
        </p>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {match.content}
        </div>
      </div>
      {isSelected && (
        <div className="text-xs text-gray-500 flex items-center space-x-0.5">
          <Key>Tab</Key>
          <CornerDownLeft className="text-gray-400" size={14} />
        </div>
      )}
    </button>
  )
}
