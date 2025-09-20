import React from "react"
import { cn } from "@/lib/utils"

type KeyProps = {
  children: React.ReactNode
} & React.ComponentProps<"span">

export const Key: React.FC<KeyProps> = ({ children, className, ...props }) => {
  return (
    <span
      className={cn(
        "text-xs text-gray-500 rounded px-1 py-0.5 bg-gray-200/80 tracking-tight",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
