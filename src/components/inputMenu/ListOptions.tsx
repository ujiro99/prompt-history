import { useState } from "react"
import { i18n } from "#imports"
import { Settings2, ArrowDownUp, Funnel } from "lucide-react"
import type { SortOrder } from "@/types/prompt"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/useSettings"
import { useContainer } from "@/hooks/useContainer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

const orders: SortOrder[] = ["recent", "execution", "name", "composite"]

interface ListOptionsProps {
  menuType: "history" | "pinned"
  sortOrder: SortOrder
  hideOrganizerExcluded?: boolean
  className?: string
}

export const ListOptions = ({
  menuType,
  sortOrder,
  hideOrganizerExcluded,
  className,
}: ListOptionsProps) => {
  const { update } = useSettings()
  const { container } = useContainer()
  const [open, setOpen] = useState(false)
  const [popoverContent, setPopoverContent] = useState<HTMLElement | null>(null)

  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    const settingsKey =
      menuType === "history" ? "historySettings" : "pinnedSettings"
    update({
      [settingsKey]: {
        sortOrder: newSortOrder,
        hideOrganizerExcluded,
      },
    })
  }

  const handleFilterToggle = (checked: boolean) => {
    const settingsKey =
      menuType === "history" ? "historySettings" : "pinnedSettings"
    update({
      [settingsKey]: {
        sortOrder,
        hideOrganizerExcluded: checked,
      },
    })
  }

  const handleOnMouseLeave = (ev: React.MouseEvent) => {
    if (
      ev.relatedTarget &&
      popoverContent &&
      (popoverContent.contains(ev.relatedTarget as Node) ||
        ev.relatedTarget === popoverContent.parentElement)
    ) {
      return
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            className={cn(
              "border border-input p-1.5 shadow-xs inline-flex items-center justify-center rounded-md transition hover:bg-neutral-100 cursor-pointer",
              className,
            )}
          >
            <Settings2 className="size-4 stroke-neutral-500" />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{i18n.t("listOptions.menu")}</TooltipContent>
      </Tooltip>
      <PopoverPortal container={container}>
        <PopoverContent
          onMouseLeave={handleOnMouseLeave}
          className="w-80 bg-background"
          ref={setPopoverContent}
        >
          <div className="space-y-4">
            {/* Sort Order Section */}
            <div className="space-y-2">
              <label className="text-sm inline-block select-none">
                <ArrowDownUp className="size-4 inline-block mr-1 -mt-1" />
                {i18n.t("sortOrder.label")}
              </label>
              <Select onValueChange={handleSortOrderChange} value={sortOrder}>
                <SelectTrigger className="w-full cursor-pointer">
                  {i18n.t(`sortOrder.${sortOrder}.label`)}
                </SelectTrigger>
                <SelectContent
                  className="bg-background"
                  container={popoverContent}
                >
                  {orders.map((order) => (
                    <SelectItem key={order} value={order}>
                      {i18n.t(`sortOrder.${order}.label`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr />

            {/* Filter Options Section */}
            <div className="space-y-3 pb-1">
              <label className="text-sm inline-block select-none">
                <Funnel className="size-4 inline-block mr-1 -mt-1" />
                {i18n.t("listOptions.filter.label")}
              </label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hideOrganizerExcluded"
                  checked={hideOrganizerExcluded ?? false}
                  onCheckedChange={handleFilterToggle}
                />
                <label
                  htmlFor="hideOrganizerExcluded"
                  className="text-sm cursor-pointer select-none"
                >
                  {i18n.t("listOptions.filter.hideOrganizerExcluded")}
                </label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  )
}
