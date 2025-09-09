import { Children, cloneElement, ReactElement, isValidElement } from "react"
import { cn } from "@/lib/utils"

interface ButtonGroupProps {
  children: React.ReactNode
  orientation?: "horizontal" | "vertical"
  className?: string
}
export const ButtonGroup = ({
  children,
  orientation = "horizontal",
  className,
}: ButtonGroupProps) => {
  const isVertical = orientation === "vertical"

  // Filter out falsy values and get valid React elements
  const validChildren = Children.toArray(children).filter((child) =>
    isValidElement<React.ComponentProps<"button">>(child),
  ) as ReactElement<React.ComponentProps<"button">>[]

  const hasGroup = validChildren.length > 1
  if (!hasGroup) return <div>{children}</div>

  return (
    <div className={cn("flex", isVertical ? "flex-col w-fit" : "", className)}>
      {validChildren.map((child, i) => {
        return cloneElement(child, {
          className: cn(
            isVertical
              ? i > 0
                ? "rounded-t-none border-t-1"
                : "rounded-b-none border-b-0"
              : i > 0
                ? "rounded-l-none border-l-1"
                : "rounded-r-none border-r-0",
            child.props.className,
          ),
        })
      })}
    </div>
  )
}
