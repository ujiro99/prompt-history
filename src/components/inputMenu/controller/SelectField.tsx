import { useRef } from "react"
import { i18n } from "#imports"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useContainer } from "@/hooks/useContainer"
import { nextCyclic, prevCyclic } from "@/services/dom/elementUtils"
import { isEmpty } from "@/lib/utils"

interface SelectOption {
  label: string
  value: string
}

interface SelectFieldProps {
  name: string
  options: SelectOption[]
  value: string
  onValueChange: (name: string, value: string) => void
  className?: string
}

export const SelectField = (props: SelectFieldProps) => {
  const { name, options, value, onValueChange } = props
  const { container } = useContainer()
  const contentRef = useRef(null)

  const safeOptions = options.filter((opt) => !isEmpty(opt.value))
  const optionsExist = safeOptions.length > 0

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      // Set focus to the selected item when opened
      setTimeout(() => {
        if (!contentRef.current) return
        const contentElm = contentRef.current as HTMLElement
        const selectedItem = contentElm?.querySelector(
          '[data-slot="select-item"][data-state="checked"]',
        ) as HTMLElement
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentActive = document.activeElement?.shadowRoot?.activeElement
    if (currentActive == null) return

    // Implement a custom focus movement with Arrow Keys,
    // to avoid the focus management bug in Radix UI when using the Shadow DOM.
    // See: https://github.com/radix-ui/primitives/issues/2606
    if (event.key === "ArrowDown") {
      const nextEl = nextCyclic(currentActive) as HTMLElement
      nextEl?.focus()
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key === "ArrowUp") {
      const prevEl = prevCyclic(currentActive) as HTMLElement
      prevEl?.focus()
      event.preventDefault()
      event.stopPropagation()
      return
    }
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => onValueChange(name, v)}
      onOpenChange={handleOnOpenChange}
    >
      <SelectTrigger id={`var-${name}`} className={props.className}>
        <SelectValue placeholder={i18n.t("placeholders.selectOption")} />
      </SelectTrigger>
      <SelectContent
        container={container}
        onKeyDown={handleKeyDown}
        ref={contentRef}
      >
        {!optionsExist && (
          <div className="p-2 text-sm text-muted-foreground">
            {i18n.t("selectField.noOptions")}
          </div>
        )}
        {safeOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
