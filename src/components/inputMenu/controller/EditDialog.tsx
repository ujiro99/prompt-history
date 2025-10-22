import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { SaveMode } from "@/types/prompt"
import type { SaveDialogData, VariableConfig } from "@/types/prompt"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"
import { VariableConfigField } from "./VariableConfigField"
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import { useContainer } from "@/hooks/useContainer"
import { analytics } from "#imports"

/**
 * Props for prompt edit dialog
 */
interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Initial prompt name (when editing) */
  initialName?: string
  /** Initial prompt content */
  initialContent: string
  /** Initial variable configurations (when editing) */
  initialVariables?: VariableConfig[]
  /** Dialog display mode */
  displayMode: SaveMode
  /** Callback on save */
  onSave: (data: SaveDialogData) => Promise<void>
}

/**
 * Prompt save/edit dialog component
 */
export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  initialName = "",
  initialContent,
  initialVariables,
  displayMode,
  onSave,
}) => {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [variables, setVariables] = useState<VariableConfig[]>(
    initialVariables || [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = displayMode === SaveMode.Overwrite
  const isCopy = displayMode === SaveMode.Copy
  const { container } = useContainer()

  // Update initial values
  useEffect(() => {
    setName(initialName)
    setContent(initialContent)
    setVariables(initialVariables || mergeVariableConfigs(initialContent))
  }, [initialName, initialContent, initialVariables])

  // Clear values on close
  useEffect(() => {
    if (!open) {
      setName(initialName)
      setContent(initialContent)
      setVariables(initialVariables || [])
    }
  }, [open, initialName, initialContent, initialVariables])

  // Parse and merge variables when content changes
  useEffect(() => {
    setVariables((prevVariables) =>
      mergeVariableConfigs(content, prevVariables),
    )
  }, [content])

  /**
   * Handle variable configuration change
   */
  const handleVariableChange = (index: number, config: VariableConfig) => {
    const updatedVariables = [...variables]
    updatedVariables[index] = config
    setVariables(updatedVariables)
  }

  /**
   * Save processing
   */
  const handleSave = async (saveMode: SaveMode) => {
    if (!name.trim()) {
      return // Do nothing if name is empty
    }

    setIsLoading(true)

    try {
      const saveData: SaveDialogData = {
        name: name.trim(),
        content: content.trim(),
        saveMode: saveMode,
        isPinned: true,
        variables: variables.length > 0 ? variables : undefined,
      }

      try {
        await analytics.track("edit-save")
      } catch (error) {
        // Ignore analytics errors to prevent them from affecting core functionality
        console.warn("Analytics tracking failed:", error)
      }
      await onSave(saveData)
    } finally {
      setIsLoading(false)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSave(displayMode)
    }
    // Prevent propagation to avoid unwanted side effects on AI service input
    event.persist()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="w-xl sm:max-w-xl max-h-9/10"
        onKeyDown={handleKeyDown}
        onKeyPress={(e) => e.stopPropagation()} // For chatgpt
        onKeyUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? i18n.t("dialogs.edit.title")
              : isCopy
                ? i18n.t("dialogs.copy.title")
                : i18n.t("dialogs.save.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt name input */}
          <div className="space-y-2">
            <label
              htmlFor="prompt-name"
              className="text-sm font-semibold text-foreground"
            >
              {i18n.t("common.name")}
            </label>
            <p className="text-xs text-muted-foreground">
              {i18n.t("common.nameDescription")}
            </p>
            <Input
              id="prompt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={i18n.t("placeholders.enterPromptName")}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Prompt content input */}
          <div className="space-y-2">
            <label
              htmlFor="prompt-content"
              className="text-sm font-semibold text-foreground"
            >
              {i18n.t("common.prompt")}
            </label>
            <p className="text-xs text-muted-foreground">
              {i18n.t("common.promptDescription")}
            </p>
            <Textarea
              id="prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={i18n.t("placeholders.enterPromptContent")}
              disabled={isLoading}
              className="max-h-60"
              rows={6}
            />
          </div>

          {/* Variable configuration section */}
          {variables.length > 0 && (
            <div className="space-y-2">
              <div>
                <label className="text-sm font-semibold text-foreground">
                  {i18n.t("dialogs.edit.variableSettings")}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure variables found in the prompt
                </p>
              </div>
              <ScrollAreaWithGradient
                className="max-h-60 border-t-1"
                gradientHeight={25}
              >
                {variables.map((variable, index) => (
                  <VariableConfigField
                    key={variable.name}
                    variable={variable}
                    initialVariable={initialVariables?.[index]}
                    onChange={(config) => handleVariableChange(index, config)}
                  />
                ))}
              </ScrollAreaWithGradient>
            </div>
          )}
        </div>

        <DialogFooter className="mt-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {i18n.t("common.cancel")}
          </Button>
          <ButtonGroup>
            <Button
              onClick={() =>
                handleSave(
                  isEdit
                    ? SaveMode.Overwrite
                    : isCopy
                      ? SaveMode.Copy
                      : SaveMode.New,
                )
              }
              disabled={isLoading || !name.trim() || !content.trim()}
            >
              {isEdit
                ? isLoading
                  ? i18n.t("status.updating")
                  : i18n.t("common.update")
                : isCopy
                  ? isLoading
                    ? i18n.t("status.saving")
                    : i18n.t("buttons.saveAsCopy")
                  : isLoading
                    ? i18n.t("status.saving")
                    : i18n.t("common.save")}
            </Button>
            {isEdit && !isCopy && (
              <SaveAsNew
                disabled={isLoading || !name.trim() || !content.trim()}
                onSaveAsNew={() => handleSave(SaveMode.New)}
                className="w-6"
              />
            )}
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SaveAsNewProps extends React.ComponentProps<"button"> {
  onSaveAsNew?: () => void
}

export function SaveAsNew(_props: SaveAsNewProps) {
  const { onSaveAsNew, ...props } = _props
  const { container } = useContainer()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger {...props} asChild>
        <Button>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" container={container}>
        <DropdownMenuItem onClick={onSaveAsNew}>
          {i18n.t("buttons.saveAsNew")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
