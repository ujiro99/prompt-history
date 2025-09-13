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
        "outline-gray-200 p-1.5 rounded-md transition hover:bg-gray-200 cursor-pointer",
        "group/button",
        className,
      )}
      onClick={handleClick}
    >
      <Star
        size={size}
        className={cn(
          "group-hover/button:scale-125 transition",
          isPinned
            ? "fill-yellow-300 stroke-yellow-400"
            : "stroke-gray-400 fill-gray-100",
        )}
      />
    </button>
  )
}
