import { useState, useEffect } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"
import { SaveMode } from "@/types/prompt"
import type { SaveDialogData, VariableConfig } from "@/types/prompt"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"
import { VariableExpansionInfoDialog } from "./VariableExpansionInfoDialog"
import { VariableSettingsSection } from "@/components/shared"
import { CategorySelector } from "@/components/promptOrganizer/CategorySelector"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import {
  Dialog,
  DialogTitle,
  DialogDescription,
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
import { analyticsService, ANALYTICS_EVENTS } from "@/services/analytics"

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
  /** Initial category ID (when editing) */
  initialCategoryId?: string | null
  /** Initial use case (when editing) */
  initialUseCase?: string
  /** Initial exclude from organizer flag (when editing) */
  initialExcludeFromOrganizer?: boolean
  /** Whether the prompt is AI-generated */
  isAIGenerated?: boolean
  /** Dialog display mode */
  displayMode: SaveMode
  /** Callback on save */
  onSave: (
    data: Partial<SaveDialogData> & { saveMode: SaveMode },
  ) => Promise<void>
}

const variableEquals = (
  x: VariableConfig,
  y: VariableConfig | undefined,
): boolean => {
  if (!y) {
    return false
  }
  return (
    x.name === y.name &&
    x.type === y.type &&
    x.defaultValue === y.defaultValue &&
    JSON.stringify(x.selectOptions) === JSON.stringify(y.selectOptions)
  )
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
  initialCategoryId,
  initialUseCase = "",
  initialExcludeFromOrganizer = false,
  isAIGenerated,
  displayMode,
  onSave,
}) => {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [variables, setVariables] = useState<VariableConfig[]>(
    initialVariables || [],
  )
  const [categoryId, setCategoryId] = useState<string | null>(
    initialCategoryId ?? null,
  )
  const [useCase, setUseCase] = useState(initialUseCase)
  const [excludeFromOrganizer, setExcludeFromOrganizer] = useState(
    initialExcludeFromOrganizer,
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
    setCategoryId(initialCategoryId ?? null)
    setUseCase(initialUseCase)
    setExcludeFromOrganizer(initialExcludeFromOrganizer)
  }, [
    initialName,
    initialContent,
    initialVariables,
    initialCategoryId,
    initialUseCase,
    initialExcludeFromOrganizer,
    variableExpansionEnabled,
  ])

  // Clear values on close
  useEffect(() => {
    if (!open) {
      setName(initialName)
      setContent(initialContent)
      setVariables(initialVariables || [])
      setCategoryId(initialCategoryId ?? null)
      setUseCase(initialUseCase)
      setExcludeFromOrganizer(initialExcludeFromOrganizer)
    }
  }, [
    open,
    initialName,
    initialContent,
    initialVariables,
    initialCategoryId,
    initialUseCase,
    initialExcludeFromOrganizer,
  ])

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
      const updates: Partial<SaveDialogData> & { saveMode: SaveMode } = {
        saveMode: saveMode,
      }
      if (name.trim() !== initialName) {
        updates.name = name.trim()
      }
      if (content.trim() !== initialContent) {
        updates.content = content.trim()
      }
      if (
        !variables.every((v, i) => variableEquals(v, initialVariables?.[i]))
      ) {
        updates.variables = variables
      }
      if (categoryId !== initialCategoryId) {
        updates.categoryId = categoryId || null
      }
      if (useCase.trim() !== initialUseCase) {
        updates.useCase = useCase.trim() || undefined
      }
      if (excludeFromOrganizer !== initialExcludeFromOrganizer) {
        updates.excludeFromOrganizer = excludeFromOrganizer
      }

      await analyticsService.track(ANALYTICS_EVENTS.EDIT_SAVE)
      await onSave(updates)
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
          className="w-2xl sm:max-w-2xl max-h-9/10 flex flex-col pr-4"
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
            <DialogDescription className="sr-only">
              {i18n.t("dialogs.edit.description")}
            </DialogDescription>
          </DialogHeader>

          <ScrollAreaWithGradient
            className="flex-1 max-h-[70vh] pl-2 pr-4"
            indicatorVisible={false}
          >
            <div className="space-y-4 pt-1 pb-2">
              {/* Prompt name input */}
              <div className="flex flex-row items-center gap-1">
                <div className="w-48">
                  <label
                    htmlFor="prompt-name"
                    className="text-sm font-semibold text-foreground inline-block"
                  >
                    {i18n.t("common.name")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t("common.nameDescription")}
                  </p>
                </div>
                <Input
                  id="prompt-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={i18n.t("placeholders.enterPromptName")}
                  disabled={isLoading}
                  autoFocus
                  className="flex-1"
                />
              </div>

              {/* Use case input */}
              {isAIGenerated && (
                <div className="flex flex-row items-center gap-1">
                  <div className="w-48">
                    <label
                      htmlFor="prompt-usecase"
                      className="text-sm font-semibold text-foreground inline-block"
                    >
                      {i18n.t("promptOrganizer.preview.useCase")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {i18n.t("dialogs.edit.useCaseDescription")}
                    </p>
                  </div>
                  <Input
                    id="prompt-usecase"
                    type="text"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    placeholder={i18n.t("dialogs.edit.useCasePlaceholder")}
                    disabled={isLoading}
                    className="flex-1"
                  />
                </div>
              )}

              <div className="flex flex-row items-center gap-1">
                {/* Category selector */}
                <div className="w-48">
                  <label
                    htmlFor="prompt-category"
                    className="text-sm font-semibold text-foreground inline-block"
                  >
                    {i18n.t("promptOrganizer.preview.category")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t("dialogs.edit.categoryDescription")}
                  </p>
                </div>
                <CategorySelector
                  value={categoryId || ""}
                  onValueChange={(value) => setCategoryId(value || null)}
                  className="flex-1"
                />
              </div>

              {/* Prompt content input */}
              <div className="space-y-1">
                <label
                  htmlFor="prompt-content"
                  className="text-sm font-semibold text-foreground inline-block"
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
                    aria-label={i18n.t(
                      "dialogs.edit.variableExpansionInfo.link",
                    )}
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
              />

              {/* Exclude from organizer checkbox */}
              <div className="flex flex-row gap-3 items-start">
                <input
                  type="checkbox"
                  id="exclude-from-organizer"
                  checked={excludeFromOrganizer}
                  onChange={(e) => setExcludeFromOrganizer(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="exclude-from-organizer"
                    className="text-sm font-semibold text-foreground cursor-pointer select-none"
                  >
                    {i18n.t("dialogs.edit.excludeFromOrganizer")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t("dialogs.edit.excludeFromOrganizerHelp")}
                  </p>
                </div>
              </div>
            </div>
          </ScrollAreaWithGradient>

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
