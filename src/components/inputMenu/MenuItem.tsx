import React, { useRef, useState } from "react"
import { PinButton } from "./controller/PinButton"
import { MenuItemPopup } from "./MenuItemPopup"
import { cn } from "@/lib/utils"

type MenuItemProps = {
  menuType?: "history" | "pinned"
  value: string
  isPinned: boolean
  testId: string
  children: React.ReactNode
  onClick: (promptId: string) => void
  onHover: (
    promptId: string,
    element: HTMLElement,
    menuType: "history" | "pinned",
  ) => void
  onLeave: () => void
  onEdit: (promptId: string) => void
  onRemove: (promptId: string) => void
  onCopy: (promptId: string) => void
  onTogglePin: (promptId: string, isPinned: boolean) => void
}

const BUTTON_SIZE = 11

export const MenuItem = (props: MenuItemProps) => {
  const [forceClose, setForceClose] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const promptId = props.value

  const handleClick = () => {
    if (promptId) {
      props.onClick(promptId)
    } else {
      console.warn("MenuItem clicked but no data-value found")
    }
  }

  const handleMouseEnter = () => {
    setForceClose(false)
    if (props.onHover && props.menuType) {
      const element = (elementRef as React.RefObject<HTMLDivElement>).current
      if (element) {
        props.onHover(props.value, element, props.menuType)
      }
    }
  }

  const handleMouseLeave = () => {
    setForceClose(true)
    if (props.onLeave) {
      props.onLeave()
    }
  }

  return (
    <div
      ref={elementRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "hover:bg-accent focus:bg-accent focus:text-accent-foreground cursor-default items-center gap-2 rounded-sm text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4",
        "relative flex justify-between px-2 pr-1 py-1 text-sm font-normal font-sans text-gray-700 cursor-pointer outline-gray-300",
      )}
      style={{ outlineColor: "#d1d5db" }}
      data-testid={props.testId}
    >
      <div className="max-w-50 truncate">{props.children}</div>
      <div className={cn("flex items-center")}>
        <PinButton
          onClick={() => props.onTogglePin(promptId, !props.isPinned)}
          isPinned={props.isPinned}
          size={BUTTON_SIZE}
        />
        <MenuItemPopup
          promptId={promptId}
          forceClose={forceClose}
          onEdit={props.onEdit}
          onRemove={props.onRemove}
          onCopy={props.onCopy}
          butttonSize={BUTTON_SIZE}
        />
      </div>
    </div>
  )
}

MenuItem.displayName = "MenuItem"
