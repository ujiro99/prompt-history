import React, { forwardRef, useRef, useState } from "react"
import { MenubarItem } from "@/components/ui/menubar"
import { PinButton } from "./controller/PinButton"
import { MenuItemPopup } from "./MenuItemPopup"
import { cn } from "@/lib/utils"
import { TestIds } from "@/components/const"

type MenuItemProps = {
  children: React.ReactNode
  value: string
  isPinned: boolean
  menuType?: "history" | "pinned"
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

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (props, ref) => {
    const [forceClose, setForceClose] = useState(false)
    const internalRef = useRef<HTMLDivElement>(null)
    const elementRef = ref || internalRef
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
      <MenubarItem
        ref={elementRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex justify-between pl-2 pr-1 py-1 text-sm font-normal font-sans text-gray-700 cursor-pointer outline-gray-300"
        style={{ outlineColor: "#d1d5db" }}
        data-value={props.value}
        data-testid={TestIds.inputPopup.historyItem}
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
      </MenubarItem>
    )
  },
)
MenuItem.displayName = "MenuItem"
