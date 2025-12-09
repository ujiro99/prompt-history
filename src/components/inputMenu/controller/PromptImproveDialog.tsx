import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Loader2, Settings } from "lucide-react"
import type { VariableConfig } from "@/types/prompt"
import { VariableExpansionInfoDialog } from "./VariableExpansionInfoDialog"
import { PromptImproverSettingsDialog } from "@/components/settings/PromptImproverSettingsDialog"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import { ApiKeyWarningBanner } from "@/components/shared/ApiKeyWarningBanner"
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Textarea } from "@/components/ui/textarea"
import { useContainer } from "@/hooks/useContainer"
import { useSettings } from "@/hooks/useSettings"
import { useAiModel } from "@/hooks/useAiModel"
import { analyticsService, ANALYTICS_EVENTS } from "@/services/analytics"
import { ImprovePromptData } from "@/types/prompt"
import { PromptImprover } from "@/services/genai/PromptImprover"
import { stopPropagation } from "@/utils/dom"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"
import { improvePromptSettingsStorage } from "@/services/storage/definitions"

/**
 * Props for prompt edit dialog
 */
interface PromptImproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Initial data */
  initialData: ImprovePromptData
  /** Callback on save */
  onInput: (data: ImprovePromptData) => Promise<void>
}

/**
 * Prompt save/edit dialog component
 */
export const PromptImproveDialog: React.FC<PromptImproveDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  onInput,
}) => {
  const initialContent = initialData.content
  const initialVariables = initialData.variables
  const [content, setContent] = useState(initialData.content)
  const [variables, setVariables] = useState<VariableConfig[]>(
    initialVariables || [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const { container } = useContainer()
  const { settings } = useSettings()

  const { genaiApiKey } = useAiModel()
  const isApiKeyConfigured = Boolean(genaiApiKey)

  // Prompt improvement states
  const [improvedContent, setImprovedContent] = useState("")
  const [isImproving, setIsImproving] = useState(false)
  const [improvementError, setImprovementError] = useState<string | null>(null)
  const promptImproverRef = useRef<PromptImprover | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [modelSettingsDialogOpen, setModelSettingsDialogOpen] = useState(false)

  // Check if variable expansion is enabled (default: true)
  const variableExpansionEnabled = settings?.variableExpansionEnabled ?? true

  const cancelImprovement = useCallback(() => {
    if (isImproving && promptImproverRef.current) {
      promptImproverRef.current.cancel()
      setIsImproving(false)
    }
  }, [isImproving])

  // Initialize PromptImprover
  useEffect(() => {
    if (!promptImproverRef.current) {
      promptImproverRef.current = new PromptImprover()
      promptImproverRef.current.loadSettings()

      // Watch for settings changes
      return improvePromptSettingsStorage.watch(() => {
        promptImproverRef.current?.loadSettings().catch((error) => {
          console.error("Failed to load prompt improver settings:", error)
        })
      })
    }
  }, [])

  // Update initial values
  useEffect(() => {
    setContent(initialContent)
    setVariables(
      variableExpansionEnabled
        ? initialVariables || mergeVariableConfigs(initialContent)
        : [],
    )
  }, [initialContent, initialVariables, variableExpansionEnabled])

  // Clear values on close
  useEffect(() => {
    if (!open) {
      setContent(initialContent)
      setVariables(initialVariables || [])
      setImprovedContent("")
      setImprovementError(null)
      // Cancel ongoing improvement if any
      cancelImprovement()
    }
  }, [open, initialContent, initialVariables, cancelImprovement])

  // cleanup function
  useEffect(() => {
    return () => {
      // Stop any ongoing improvement on unmount
      cancelImprovement()
    }
  }, [cancelImprovement])

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
   * Improve prompt using Gemini AI
   */
  const handleImprove = async () => {
    if (!content.trim() || !promptImproverRef.current) {
      return
    }

    setIsImproving(true)
    setImprovedContent("")
    setImprovementError(null)

    try {
      await promptImproverRef.current.improvePrompt({
        prompt: content,
        onStream: (chunk) => {
          setImprovedContent((prev) => prev + chunk)
        },
        onComplete: (improved) => {
          setIsImproving(false)
          setImprovedContent(improved)
        },
        onError: (error) => {
          setIsImproving(false)
          setImprovementError(error.message)
          console.error("Prompt improvement error:", error)
        },
      })

      await analyticsService.track(ANALYTICS_EVENTS.IMPROVE_PROMPT)
    } catch (error) {
      setIsImproving(false)
      setImprovementError(
        error instanceof Error ? error.message : "Unknown error occurred",
      )
      console.error("Prompt improvement error:", error)
    }
  }

  /**
   * Cancel improvement and close preview
   */
  const handleCancelImprovement = () => {
    cancelImprovement()
    setImprovedContent("")
    setImprovementError(null)
  }

  /**
   * Open model settings dialog
   */
  const handleOpenModelSettings = () => {
    setModelSettingsDialogOpen(true)
  }

  /**
   * Input processing
   */
  const handleInput = async () => {
    setIsLoading(true)

    try {
      // Use improved content if available, otherwise use current content
      const contentToUse = improvedContent.trim() || content.trim()

      const improvedData: ImprovePromptData = {
        content: contentToUse,
        variables: variables,
      }

      await analyticsService.track(ANALYTICS_EVENTS.INPUT_PROMPT)
      await onInput(improvedData)
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
      handleInput()
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
          <div className="flex items-center gap-2">
            <DialogHeader className="flex-1">
              <DialogTitle>{i18n.t("dialogs.promptImprove.title")}</DialogTitle>
              <DialogDescription>
                {i18n.t("dialogs.promptImprove.message")}
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={() => setSettingsDialogOpen(true)}
              variant="ghost"
              size="sm"
              className="group mr-1"
            >
              <Settings className="size-5 stroke-neutral-600 group-hover:stroke-neutral-800" />
            </Button>
          </div>

          {/* API Key Warning */}
          {!isApiKeyConfigured && (
            <ApiKeyWarningBanner
              variant="destructive"
              onOpenSettings={handleOpenModelSettings}
            />
          )}

          <div className="space-y-4">
            {/* Prompt content input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="prompt-content"
                  className="text-sm font-semibold text-foreground"
                >
                  {i18n.t("dialogs.promptImprove.promptTitle")}
                </label>
              </div>
              <Textarea
                id="prompt-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={i18n.t("placeholders.enterPromptContent")}
                disabled={isLoading || isImproving}
                className="max-h-60"
                rows={6}
              />

              {/* Preview area for improved prompt */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">
                    {i18n.t("dialogs.promptImprove.previewTitle")}
                  </label>
                </div>

                {improvementError ? (
                  <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    {improvementError}
                  </div>
                ) : (
                  <div className="relative">
                    <Textarea
                      value={improvedContent}
                      readOnly
                      className="max-h-60 bg-muted/50"
                      rows={6}
                      placeholder={
                        isImproving
                          ? i18n.t("dialogs.promptImprove.improving")
                          : ""
                      }
                    />
                    {improvedContent.trim() === "" && !isImproving && (
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/50">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleImprove}
                          className={cn(
                            "flex items-center",
                            "bg-gradient-to-r from-purple-50 to-blue-50",
                            "border-purple-200 hover:border-purple-300",
                            "hover:from-purple-100 hover:to-blue-100",
                            "text-purple-700 hover:text-purple-800",
                            "transition-all duration-200",
                          )}
                          disabled={
                            isImproving ||
                            isLoading ||
                            !content.trim() ||
                            !isApiKeyConfigured
                          }
                        >
                          <Sparkles
                            className="mr-0.5 size-4"
                            fill="url(#lucideGradient)"
                          />
                          {i18n.t("dialogs.promptImprove.improveButton")}
                        </Button>
                      </div>
                    )}
                    {isImproving && (
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/50">
                        <Loader2 className="ml-5 size-6 animate-spin text-primary" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelImprovement}
                          className="text-xs"
                        >
                          {i18n.t("common.cancel")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                onClick={handleInput}
                disabled={
                  isLoading ||
                  (!content.trim() && !improvedContent.trim()) ||
                  isImproving
                }
              >
                {i18n.t("common.input")}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VariableExpansionInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
      />
      <ModelSettingsDialog
        open={modelSettingsDialogOpen}
        onOpenChange={setModelSettingsDialogOpen}
      />
      <PromptImproverSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onClickModelSettings={() => {
          setSettingsDialogOpen(false)
          setModelSettingsDialogOpen(true)
        }}
      />
    </>
  )
}
