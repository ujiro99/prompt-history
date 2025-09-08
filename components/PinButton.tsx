import React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type PinnButtonProps = {
  onClick: () => void
  isPinned: boolean
  className?: string
  size?: number
}

export const PinButton = ({
  onClick,
  isPinned,
  className,
  size = 16,
}: PinnButtonProps) => {
  const handleClick = (e: React.SyntheticEvent) => {
    onClick()
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <button
      type="button"
      className={cn(
        "outline-gray-200 p-1 rounded-md transition hover:scale-125 hover:bg-gray-100 cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      <Star
        size={size}
        className={cn(
          isPinned
            ? "fill-yellow-300 stroke-yellow-400"
            : "stroke-gray-400 fill-gray-100",
        )}
      />
    </button>
  )
}
