import { useState, useEffect } from "react"
import { EllipsisVertical } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
} from "@/components/ui/popover"
import { useContainer } from "@/hooks/useContainer"
import { RemoveButton } from "./controller/RemoveButton"
import { EditButton } from "./controller/EditButton"
import { CopyButton } from "./controller/CopyButton"

interface MenuItemPopupProps {
  promptId: string
  butttonSize: number
  forceClose: boolean
  onEdit: (promptId: string) => void
  onRemove: (promptId: string) => void
  onCopy: (promptId: string) => void
}

const noFocus = (e: Event) => e.preventDefault()

export const MenuItemPopup = ({
  promptId,
  butttonSize,
  forceClose = false,
  onEdit,
  onRemove,
  onCopy,
}: MenuItemPopupProps) => {
  const [open, setOpen] = useState(false)
  const { container } = useContainer()

  const handleClick = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  useEffect(() => {
    if (forceClose) {
      setOpen(false)
    }
  }, [forceClose])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="outline-neutral-200 p-1.5 rounded-md transition group/button hover:bg-neutral-200 cursor-pointer"
          onClick={handleClick}
        >
          <EllipsisVertical
            size={butttonSize}
            className="stroke-neutral-500 group-hover/button:scale-125 transition"
          />
        </button>
      </PopoverTrigger>
      <PopoverPortal container={container}>
        <PopoverContent
          className="relative p-1 text-foreground min-w-24"
          side={"top"}
          align={"center"}
          sideOffset={-1}
          onOpenAutoFocus={noFocus}
        >
          <div className="space-y-1">
            <EditButton
              className="w-full text-sm"
              onClick={() => onEdit(promptId)}
              size={butttonSize}
            />
            <CopyButton
              className="w-full text-sm"
              onClick={() => onCopy(promptId)}
              size={butttonSize}
            />
            <RemoveButton
              className="w-full text-sm"
              onClick={() => onRemove(promptId)}
              size={butttonSize}
            />
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  )
}
MenuItemPopup.displayName = "MenuItemPopup"
