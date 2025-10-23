import React from "react"
import { Copy } from "lucide-react"
import { i18n } from "#imports"

import { cn } from "@/lib/utils"

type CopyButtonProps = {
  onClick: () => void
  className?: string
  size?: number
}

export const CopyButton = ({
  onClick,
  className,
  size = 16,
}: CopyButtonProps) => {
  const handleClick = (e: React.SyntheticEvent) => {
    onClick()
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <button
      type="button"
      className={cn(
        "outline-neutral-200 px-2 py-1.5 rounded-md transition group/copy-button hover:bg-neutral-100 cursor-pointer",
        "flex items-center gap-2",
        className,
      )}
      onClick={handleClick}
    >
      <Copy
        className={cn(
          "stroke-neutral-400 transition",
          "group-hover/copy-button:scale-120 group-hover/copy-button:stroke-green-500",
        )}
        size={size}
      />
      {i18n.t("buttons.copy")}
    </button>
  )
}
