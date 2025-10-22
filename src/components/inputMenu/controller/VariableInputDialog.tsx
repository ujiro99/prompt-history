import { useState, useEffect } from "react"
import { CornerDownLeft } from "lucide-react"
import { i18n } from "#imports"
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
import { Key } from "@/components/Key"
import { SelectField } from "@/components/inputMenu/controller/SelectField"
import { useContainer } from "@/hooks/useContainer"
import type { VariableConfig, VariableValues } from "@/types/prompt"
import { TestIds } from "@/components/const"
import { isMac } from "@/utils/platform"

/**
 * Props for variable input dialog
 */
interface VariableInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variables: VariableConfig[]
  onSubmit: (values: VariableValues) => void
  onDismiss?: () => void
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
  onDismiss,
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
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSubmit()
      return
    }
    if (event.key === "Tab" && !event.shiftKey) {
      const elm = event.target as HTMLElement
      if (elm.dataset.testid === TestIds.variableInputDialog.submit) {
        event.preventDefault()
        handleSubmit()
      }
      return
    }
    event.stopPropagation()
  }

  // Filter out exclude type variables
  const visibleVariables = variables.filter((v) => v.type !== "exclude")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="w-xl sm:max-w-xl max-h-9/10"
        onKeyDown={handleKeyDown}
        onKeyPress={(e) => e.stopPropagation()} // For chatgpt
        onKeyUp={(e) => e.stopPropagation()}
        onEscapeKeyDown={onDismiss}
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
                <SelectField
                  options={variable.selectOptions.options.map((opt) => ({
                    label: opt,
                    value: opt,
                  }))}
                  name={variable.name}
                  value={values[variable.name]}
                  onValueChange={handleValueChange}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="mt-3">
          <Button
            className="group gap-1 pr-2"
            onClick={handleSubmit}
            data-testid={TestIds.variableInputDialog.submit}
          >
            {i18n.t("common.execute") || "Execute"}
            <Key className="text-gray-200 bg-white/20 border border-gray-200/20 ml-1">
              <span className="group-focus:hidden">
                {isMac() ? "⌘ +" : "Ctrl +"}
              </span>
              <CornerDownLeft className="inline size-3 ml-1 group-focus:ml-0" />
            </Key>
            <span className="hidden group-focus:inline text-gray-300">/</span>
            <Key className="text-gray-200 bg-white/20 border border-gray-200/20 hidden group-focus:inline">
              <span className="">Tab</span>
            </Key>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
