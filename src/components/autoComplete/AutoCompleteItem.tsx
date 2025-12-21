import React from "react"
import { Star, ChevronRight, Variable } from "lucide-react"
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

  const isPreset =
    match.matchType === "preset" || match.matchType === "preset-item"

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-1.5 text-sm cursor-pointer border-b border-neutral-100 last:border-b-0 transition",
        "flex items-center space-x-1",
        isSelected
          ? "bg-neutral-50 text-neutral-800 px-2 active"
          : "bg-white text-neutral-800 hover:bg-neutral-50",
      )}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      data-testid={TestIds.autocomplete.item}
    >
      {isSelected && (
        <ChevronRight size={18} className="shrink-0 text-neutral-500" />
      )}
      {isPreset && (
        <div className="mr-2 shrink-0 size-5.5 flex items-center justify-center bg-blue-50 text-blue-600 rounded">
          <Variable className="inline size-4.5" />
        </div>
      )}
      <div className="w-full overflow-hidden">
        <div className="flex items-center gap-0.5">
          <p className="truncate">
            {name1}
            <span className="font-medium bg-amber-100 px-0.5 rounded">
              {name2}
            </span>
            {name3}
          </p>
          {match.isPinned && (
            <Star
              size={14}
              className="shrink-0 inline fill-yellow-300 stroke-yellow-400"
            />
          )}
        </div>
        <div className="text-xs text-neutral-600 truncate mt-0.5 font-light">
          {match.content}
        </div>
      </div>
      {isSelected && (
        <div className="text-xs text-neutral-500 flex items-center space-x-0.5">
          <Key>Tab</Key>
        </div>
      )}
    </button>
  )
}
