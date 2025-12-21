import React from "react"
import { AutoCompleteItem } from "./AutoCompleteItem"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"

/**
 * Props for MatchesList component
 */
interface MatchesListProps {
  matches: AutoCompleteMatch[]
  selectedIndex: number
  onExecute: (match: AutoCompleteMatch) => void
  onSelectAt: (index: number) => void
}

/**
 * Matches list component - displays autocomplete matches
 */
export const MatchesList: React.FC<MatchesListProps> = ({
  matches,
  selectedIndex,
  onExecute,
  onSelectAt,
}) => {
  return (
    <div>
      {matches.map((match, index) => (
        <AutoCompleteItem
          key={`${match.name}-${index}`}
          match={match}
          isSelected={index === selectedIndex}
          onClick={onExecute}
          onMouseEnter={() => onSelectAt(index)}
        />
      ))}
    </div>
  )
}
