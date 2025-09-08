import React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type PinnButtonProps = {
  onClick: () => void
  isPinned: boolean
  className?: string
  size?: number
}

export const PinnButton = ({
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
        "outline-gray-200 p-0.5 rounded-md transition hover:scale-125 group/pinn-button cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      <Star
        size={size}
        className={cn(
          isPinned
            ? "fill-yellow-300 stroke-yellow-400 group-hover/pinn-button:fill-gray-200 group-hover/pinn-button:stroke-gray-400"
            : "stroke-gray-400 fill-gray-100 group-hover/pinn-button:fill-yellow-300 group-hover/pinn-button:stroke-yellow-400",
        )}
      />
    </button>
  )
}
