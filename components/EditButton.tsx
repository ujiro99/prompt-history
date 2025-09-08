import React from "react"
import { Pencil } from "lucide-react"

import { cn } from "@/lib/utils"

type EditButtonProps = {
  onClick: () => void
  className?: string
  size?: number
}

export const EditButton = ({
  onClick,
  className,
  size = 16,
}: EditButtonProps) => {
  const handleClick = (e: React.SyntheticEvent) => {
    onClick()
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <button
      type="button"
      className={cn(
        "outline-gray-200 p-2 rounded-md transition group/edit-button hover:bg-gray-100 cursor-pointer",
        "flex items-center gap-2",
        className,
      )}
      onClick={handleClick}
    >
      <Pencil
        className={cn(
          "stroke-gray-400 fill-gray-100 transition",
          "group-hover/edit-button:scale-125 group-hover/edit-button:stroke-sky-500 group-hover/edit-button:fill-sky-200",
        )}
        size={size}
      />
      Edit prompt
    </button>
  )
}
