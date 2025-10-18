import { useState, useEffect } from "react"
import { ChevronDownIcon } from "lucide-react"
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useContainer } from "@/hooks/useContainer"
import type { VariableConfig, VariableValues } from "@/types/prompt"
import { i18n } from "#imports"

/**
 * Props for variable input dialog
 */
interface VariableInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variables: VariableConfig[]
  onSubmit: (values: VariableValues) => void
}

/**
 * Variable input dialog component
 * Displays input fields for each variable based on their configuration
 */
export const VariableInputDialog: React.FC<VariableInputDialogProps> = ({
  open,
  onOpenChange,
  variables,
  onSubmit,
}) => {
  const [values, setValues] = useState<VariableValues>({})
  const { container } = useContainer()

  // Initialize values from variable configs
  useEffect(() => {
    const initialValues: VariableValues = {}
    for (const variable of variables) {
      if (variable.type !== "exclude") {
        initialValues[variable.name] = variable.defaultValue || ""
      }
    }
    setValues(initialValues)
  }, [variables])

  /**
   * Handle value change for a variable
   */
  const handleValueChange = (name: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  /**
   * Handle submit
   */
  const handleSubmit = () => {
    onSubmit(values)
    onOpenChange(false)
  }

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onOpenChange(false)
  }

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  // Filter out exclude type variables
  const visibleVariables = variables.filter((v) => v.type !== "exclude")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-xl max-h-9/10"
        onKeyDown={handleKeyDown}
        container={container}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("dialogs.variables.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {visibleVariables.map((variable) => (
            <div key={variable.name} className="space-y-2">
              <label
                htmlFor={`var-${variable.name}`}
                className="text-sm font-medium text-foreground"
              >
                {variable.name}:
              </label>

              {variable.type === "text" && (
                <Input
                  id={`var-${variable.name}`}
                  type="text"
                  value={values[variable.name] || ""}
                  onChange={(e) =>
                    handleValueChange(variable.name, e.target.value)
                  }
                  placeholder={i18n.t("placeholders.enterValue")}
                />
              )}

              {variable.type === "textarea" && (
                <Textarea
                  id={`var-${variable.name}`}
                  value={values[variable.name] || ""}
                  onChange={(e) =>
                    handleValueChange(variable.name, e.target.value)
                  }
                  placeholder={i18n.t("placeholders.enterValue")}
                  rows={4}
                />
              )}

              {variable.type === "select" && variable.selectOptions && (
                <Select
                  value={values[variable.name] || ""}
                  onValueChange={(value) =>
                    handleValueChange(variable.name, value)
                  }
                >
                  <SelectTrigger id={`var-${variable.name}`}>
                    <SelectValue
                      placeholder={i18n.t("placeholders.selectOption")}
                    />
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </SelectTrigger>
                  <SelectContent>
                    {variable.selectOptions.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="mt-3">
          <Button variant="secondary" onClick={handleCancel}>
            {i18n.t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit}>
            {i18n.t("common.execute") || "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
