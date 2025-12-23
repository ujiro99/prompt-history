import { useState, useRef } from "react"
import { i18n } from "#imports"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useContainer } from "@/hooks/useContainer"
import { isEmpty } from "@/lib/utils"

interface FlatOption {
  label: string
  value: string
}

interface FolderOption {
  label: string
  children: FlatOption[]
}

export type MenuOption = FlatOption | FolderOption

interface DropdownMenuFieldProps {
  name: string
  options: MenuOption[]
  value: string
  onValueChange: (name: string, value: string) => void
  className?: string
  placeholder?: string
}

function isFolderOption(option: MenuOption): option is FolderOption {
  return "children" in option
}

export const DropdownMenuField = (props: DropdownMenuFieldProps) => {
  const { name, options, value, onValueChange, placeholder } = props
  const { container } = useContainer()
  const [open, setOpen] = useState(false)
  const contentRef = useRef(null)

  // Filter out options with empty values
  const safeOptions = options
    .map((opt) => {
      if (isFolderOption(opt)) {
        return {
          ...opt,
          children: opt.children.filter((child) => !isEmpty(child.value)),
        }
      }
      return opt
    })
    .filter((opt) => {
      if (isFolderOption(opt)) return true
      return !isEmpty(opt.value)
    })

  const optionsExist = safeOptions.some((opt) => {
    if (isFolderOption(opt)) return opt.children.length > 0
    return true
  })

  // Find the label for the current value
  const findLabel = (searchValue: string): string | undefined => {
    for (const opt of safeOptions) {
      if (isFolderOption(opt)) {
        const found = opt.children.find((child) => child.value === searchValue)
        if (found) return found.label
      } else {
        if (opt.value === searchValue) return opt.label
      }
    }
    return undefined
  }

  const currentLabel = findLabel(value)
  const displayText =
    currentLabel || placeholder || i18n.t("placeholders.selectOption")

  const hasSelected = (opt: FolderOption) => {
    if (isFolderOption(opt)) {
      return opt.children.some((child) => child.value === value)
    }
    return false
  }

  const handleSelect = (selectedValue: string) => {
    onValueChange(name, selectedValue)
    setOpen(false)
  }

  const handleOnOpenChange = (open: boolean) => {
    setOpen(open)
    if (open) {
      // Set focus to the selected item when opened
      setTimeout(() => {
        if (!contentRef.current) return
        const contentElm = contentRef.current as HTMLElement
        const selectedItem =
          (contentElm?.querySelector(
            '[data-slot="dropdown-menu-item"][data-state="checked"]',
          ) as HTMLElement) ||
          (contentElm?.querySelector(
            '[data-slot="dropdown-menu-sub-trigger"][data-state="contains"]',
          ) as HTMLElement)
        if (selectedItem) {
          selectedItem?.focus()
        } else {
          // Focus the first item if none selected
          const firstItem = contentElm?.querySelector(
            '[data-slot="select-item"]',
          ) as HTMLElement
          firstItem?.focus()
        }
      }, 0)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOnOpenChange}>
      <DropdownMenuTrigger
        id={`var-${name}`}
        className={props.className}
        asChild
      >
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          <span>{displayText}</span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        container={container}
        className="min-w-[200px]"
        ref={contentRef}
      >
        {!optionsExist && (
          <div className="p-2 text-sm text-muted-foreground">
            {i18n.t("selectField.noOptions")}
          </div>
        )}
        {safeOptions.map((opt, index) => {
          if (isFolderOption(opt)) {
            return (
              <DropdownMenuSub key={`folder-${index}`}>
                <DropdownMenuSubTrigger
                  className="pl-8"
                  data-state={hasSelected(opt) ? "contains" : ""}
                >
                  {opt.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {opt.children.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {i18n.t("selectField.noItems")}
                    </div>
                  ) : (
                    opt.children.map((child) => (
                      <DropdownMenuItem
                        key={child.value}
                        onClick={() => handleSelect(child.value)}
                        className="relative pl-8"
                        data-state={child.value === value ? "checked" : ""}
                      >
                        {child.value === value && (
                          <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                            <CheckIcon className="size-4" />
                          </span>
                        )}
                        {child.label}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          }

          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="relative pl-8"
              data-state={opt.value === value ? "checked" : ""}
            >
              {opt.value === value && (
                <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                  <CheckIcon className="size-4" />
                </span>
              )}
              {opt.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
