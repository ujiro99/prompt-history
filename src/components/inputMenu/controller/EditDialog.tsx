import { useState, useEffect } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"
import { SaveMode } from "@/types/prompt"
import type { SaveDialogData, VariableConfig } from "@/types/prompt"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"
import { VariableExpansionInfoDialog } from "./VariableExpansionInfoDialog"
import { VariableSettingsSection } from "@/components/shared"
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
import { useContainer } from "@/hooks/useContainer"
import { useSettings } from "@/hooks/useSettings"
import { stopPropagation } from "@/utils/dom"
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
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const isEdit = displayMode === SaveMode.Overwrite
  const isCopy = displayMode === SaveMode.Copy
  const { container } = useContainer()
  const { settings } = useSettings()

  // Check if variable expansion is enabled (default: true)
  const variableExpansionEnabled = settings?.variableExpansionEnabled ?? true

  // Update initial values
  useEffect(() => {
    setName(initialName)
    setContent(initialContent)
    setVariables(
      variableExpansionEnabled
        ? initialVariables || mergeVariableConfigs(initialContent)
        : [],
    )
  }, [initialName, initialContent, initialVariables, variableExpansionEnabled])

  // Clear values on close
  useEffect(() => {
    if (!open) {
      setName(initialName)
      setContent(initialContent)
      setVariables(initialVariables || [])
    }
  }, [open, initialName, initialContent, initialVariables])

  // Parse and merge variables when content changes (only if variable expansion is enabled)
  useEffect(() => {
    if (variableExpansionEnabled) {
      setVariables((prevVariables) =>
        mergeVariableConfigs(content, prevVariables),
      )
    } else {
      setVariables([])
    }
  }, [content, variableExpansionEnabled])

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          container={container}
          className="w-xl sm:max-w-xl max-h-9/10"
          onKeyDown={handleKeyDown}
          {...stopPropagation()}
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {i18n.t("common.promptDescription")}
                </p>
                <button
                  type="button"
                  onClick={() => setIsInfoDialogOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors whitespace-nowrap cursor-pointer"
                  aria-label={i18n.t("dialogs.edit.variableExpansionInfo.link")}
                >
                  <HelpCircle className="size-3.5" />
                  <span>
                    {i18n.t("dialogs.edit.variableExpansionInfo.link")}
                  </span>
                </button>
              </div>
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
            <VariableSettingsSection
              variables={variables}
              onChange={setVariables}
              enableAutoDetection={false}
              scrollAreaClassName="max-h-60"
            />
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
      <VariableExpansionInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
      />
    </>
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
      <DropdownMenuContent
        className="min-w-40"
        align="start"
        container={container}
      >
        <DropdownMenuItem onClick={onSaveAsNew}>
          {i18n.t("buttons.saveAsNew")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
