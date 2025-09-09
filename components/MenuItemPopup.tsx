import { useState, useEffect } from "react"
import { Ellipsis } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { RemoveButton } from "./RemoveButton"
import { EditButton } from "./EditButton"

interface MenuItemPopupProps {
  promptId: string
  butttonSize: number
  forceClose: boolean
  onEdit: (promptId: string) => void
  onRemove: (promptId: string) => void
}

const noFocus = (e: Event) => e.preventDefault()

export const MenuItemPopup = ({
  promptId,
  butttonSize,
  forceClose = false,
  onEdit,
  onRemove,
}: MenuItemPopupProps) => {
  const [open, setOpen] = useState(false)

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
          className="outline-gray-200 p-2 rounded-md transition group/button hover:bg-gray-200 cursor-pointer"
          onClick={handleClick}
        >
          <Ellipsis
            size={butttonSize}
            className="stroke-gray-500 group-hover/button:scale-125 transition"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="relative z-auto p-1 text-gray-700"
        side={"top"}
        align={"end"}
        sideOffset={-1}
        onOpenAutoFocus={noFocus}
      >
        <div className="space-y-1">
          <EditButton
            className="w-full"
            onClick={() => onEdit(promptId)}
            size={butttonSize}
          />
          <RemoveButton
            className="w-full"
            onClick={() => onRemove(promptId)}
            size={butttonSize}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
MenuItemPopup.displayName = "MenuItemPopup"
