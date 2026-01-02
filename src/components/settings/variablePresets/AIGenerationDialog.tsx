import { useState, useCallback, useEffect } from "react"
import { i18n } from "#imports"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  AlertCircle,
  Settings,
  PencilLine,
  MessageCircleMore,
} from "lucide-react"
import type { PresetVariableType } from "@/types/prompt"
import type {
  AIGenerationResponse,
  ExistingVariableContent,
} from "@/types/variableGeneration"
import type { GenerationProgress as GenerationProgressType } from "@/types/promptOrganizer"

import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ApiKeyWarningBanner } from "@/components/shared/ApiKeyWarningBanner"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import { EstimationDisplay } from "@/components/shared/EstimationDisplay"
import { VariableGenerationSettingsDialog } from "@/components/settings/variablePresets/VariableGenerationSettingsDialog"
import { GenerationProgress } from "@/components/shared/GenerationProgress"

import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"

import {
  variableGeneratorService,
  estimatorService,
  mergeResponse,
} from "@/services/variableGeneration"
import type { VariableGenerationEstimate } from "@/types/variableGeneration"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
import { stopPropagation } from "@/utils/dom"

/**
 * Dialog state
 */
type DialogState = "confirm" | "generating" | "success" | "error"

/**
 * Props for AI generation dialog
 */
interface AIGenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Variable name */
  variableName: string
  /** Variable purpose/description */
  variablePurpose: string
  /** Variable type */
  variableType: PresetVariableType
  /** Existing variable content (optional) */
  existingContent?: ExistingVariableContent
  /** Callback on apply */
  onApply: (response: AIGenerationResponse) => void
  /** Debug state (for development/testing) */
  debugState?: DialogState
}

const emptyProgress: GenerationProgressType = {
  chunk: "",
  accumulated: "",
  estimatedProgress: 0,
  status: "sending",
}

/**
 * AI Variable Generation Dialog Component
 */
export const AIGenerationDialog: React.FC<AIGenerationDialogProps> = ({
  open,
  onOpenChange,
  variableName,
  variablePurpose,
  variableType,
  existingContent,
  onApply,
  debugState = "confirm",
}) => {
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()
  const hasApiKey = Boolean(genaiApiKey)

  // Dialog state
  const [state, setState] = useState<DialogState>(debugState)
  const [generatedResponse, setGeneratedResponse] =
    useState<AIGenerationResponse | null>(
      debugState === "success"
        ? {
            explanation: "explanation",
            textContent: "textContent",
          }
        : null,
    )
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] =
    useState<GenerationProgressType>(emptyProgress)
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // Model Settings Dialog state
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false)

  // Estimation state
  const [estimate, setEstimate] = useState<VariableGenerationEstimate | null>(
    null,
  )

  /**
   * Reset state when dialog closes
   */
  useEffect(() => {
    if (!open) {
      setState("confirm")
      setError(null)
      setGeneratedResponse(null)
      setProgress(emptyProgress)
      setAdditionalInstructions("")
      setEstimate(null)
    }
  }, [open])

  /**
   * Estimate token usage when dialog opens
   */
  useEffect(() => {
    const estimateTokens = async () => {
      if (!open || !hasApiKey) {
        setEstimate(null)
        return
      }

      try {
        // Estimate generation
        const estimation = await estimatorService.estimateGeneration({
          variableName,
          variablePurpose,
          variableType,
          existingContent,
          additionalInstructions,
        })

        setEstimate(estimation)
      } catch (err) {
        console.error("Failed to estimate token usage:", err)
        setEstimate(null)
      }
    }
    estimateTokens()

    // Watch for changes in estimation inputs
    return estimatorService.watch(() => {
      estimateTokens()
    })
  }, [
    open,
    hasApiKey,
    variableName,
    variablePurpose,
    variableType,
    existingContent,
    additionalInstructions,
  ])

  /**
   * Start AI generation
   */
  const handleStart = async () => {
    setState("generating")
    setError(null)
    setProgress(emptyProgress)

    try {
      // Generate variable content with progress tracking
      const response = await variableGeneratorService.generateVariable({
        request: {
          variableName,
          variablePurpose,
          variableType,
          existingContent,
          additionalInstructions,
        },
        apiKey: genaiApiKey || "",
        onProgress: (progressInfo) => {
          setProgress(progressInfo)
        },
      })

      setGeneratedResponse(response)
      setState("success")
    } catch (err) {
      // Handle cancellation
      if (
        err instanceof GeminiError &&
        err.type === GeminiErrorType.CANCELLED
      ) {
        // Reset to confirm state on cancellation
        setState("confirm")
        setProgress(emptyProgress)
        return
      }

      // Handle other errors
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      setState("error")
    }
  }

  /**
   * Cancel generation
   */
  const handleCancel = useCallback(() => {
    variableGeneratorService.cancel()
    setState("confirm")
    setProgress(emptyProgress)
  }, [])

  /**
   * Apply generated content
   */
  const handleApply = () => {
    if (generatedResponse) {
      // Merge with existing content if provided
      const mergedResponse = mergeResponse(
        generatedResponse,
        variableType,
        existingContent,
      )
      onApply(mergedResponse)
      onOpenChange(false)
    }
  }

  /**
   * Retry generation
   */
  const handleRetry = () => {
    setState("confirm")
    setError(null)
    setGeneratedResponse(null)
    setProgress(emptyProgress)
  }

  /**
   * Close dialog
   */
  const handleClose = () => {
    handleCancel()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          container={container}
          className="w-xl sm:max-w-xl max-h-9/10"
          {...stopPropagation()}
        >
          {/* Confirmation Screen */}
          {state === "confirm" && (
            <>
              <div className="flex items-center gap-2">
                <DialogHeader className="flex-1">
                  <DialogTitle>
                    {i18n.t("variablePresets.aiGeneration.dialog.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {i18n.t("variablePresets.aiGeneration.dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <Button
                  name="open-model-settings"
                  onClick={() => setSettingsDialogOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="group mr-1"
                  aria-label={i18n.t("settings.modelSettings.title")}
                >
                  <Settings className="size-5 stroke-neutral-600 group-hover:stroke-neutral-800" />
                </Button>
              </div>

              {/* API Key Warning */}
              {!hasApiKey && (
                <ApiKeyWarningBanner
                  onOpenSettings={() => setModelSettingsOpen(true)}
                  className="mb-0"
                />
              )}

              <div>
                <Separator className={`my-4 ${!hasApiKey && "mt-0"}`} />
                <div className="space-y-2 text-sm px-4">
                  {/* Variable Name */}
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">
                      {i18n.t(
                        "variablePresets.aiGeneration.dialog.variableName",
                      )}
                    </div>
                    <p className="md:text-3xl font-extrabold h-auto text-foreground/80">
                      {variableName}
                    </p>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">
                      {i18n.t(
                        "variablePresets.aiGeneration.dialog.variablePurpose",
                      )}
                    </div>
                    <p className="md:text-base font-medium text-foreground/60">
                      {variablePurpose || "(未入力)"}
                    </p>
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold">
                      {i18n.t(
                        "variablePresets.aiGeneration.dialog.variableType",
                      )}
                    </div>
                    <p className="border rounded-lg px-2 py-1 bg-muted/80 font-medium font-mono text-foreground/80">
                      {i18n.t(`variableTypes.${variableType}`)}
                    </p>
                  </div>
                </div>
                <Separator className="mt-4 mb-1" />

                {/* Token Estimation */}
                {hasApiKey && (
                  <EstimationDisplay
                    estimate={
                      estimate
                        ? {
                            ...estimate,
                            targetPromptCount: estimate.promptHistoryCount,
                            estimatedOutputTokens: 0, // Not displayed in EstimationDisplay
                          }
                        : null
                    }
                    collapsible={true}
                    hideWhenNoEstimate={false}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium inline-block">
                  <PencilLine className="inline-block size-4 mr-1 mb-0.5 text-foreground/80" />
                  {i18n.t(
                    "variablePresets.aiGeneration.dialog.additionalInstructions",
                  )}
                </label>
                <Textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder={i18n.t(
                    "variablePresets.aiGeneration.dialog.additionalInstructionsPlaceholder",
                  )}
                  rows={2}
                  className="max-h-[144px] resize-none"
                />
              </div>

              <DialogFooter>
                <Button name="cancel" variant="secondary" onClick={handleClose}>
                  {i18n.t("common.cancel")}
                </Button>
                <Button
                  name="start-generation"
                  onClick={handleStart}
                  variant="outline"
                  className={cn(
                    "bg-gradient-to-r from-purple-50 to-blue-50",
                    "border-purple-200 hover:border-purple-300",
                    "hover:from-purple-100 hover:to-blue-100",
                    "text-purple-700 hover:text-purple-800",
                    "transition-all duration-200",
                  )}
                >
                  <Sparkles className="size-4" />
                  {i18n.t("variablePresets.aiGeneration.dialog.start")}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Generating Screen */}
          {state === "generating" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {i18n.t("variablePresets.aiGeneration.dialog.loading")}
                </DialogTitle>
                <DialogDescription>
                  {i18n.t(
                    "variablePresets.aiGeneration.dialog.loadingDescription",
                  )}
                </DialogDescription>
              </DialogHeader>

              <GenerationProgress
                progress={progress}
                accumulatedTextLabel={i18n.t(
                  "variablePresets.aiGeneration.dialog.improving",
                )}
                showAccumulatedText={false}
              />

              <DialogFooter>
                <Button
                  name="cancel-generation"
                  variant="secondary"
                  size="sm"
                  onClick={handleCancel}
                >
                  {i18n.t("common.cancel")}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Success Screen */}
          {state === "success" && generatedResponse && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {i18n.t("variablePresets.aiGeneration.dialog.success")}
                </DialogTitle>
                <DialogDescription>
                  {i18n.t(
                    "variablePresets.aiGeneration.dialog.successDescription",
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* AI Explanation */}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    <MessageCircleMore className="size-4 inline-block mr-1 -mt-1 stroke-fuchsia-400 fill-purple-100" />
                    {i18n.t("variablePresets.aiGeneration.dialog.explanation")}
                  </div>
                  <blockquote className="font-serif text-sm border-l-2 px-4 py-3 bg-muted/60 tracking-wider whitespace-pre-line">
                    {generatedResponse.explanation}
                  </blockquote>
                </div>

                {/* Generated Content Preview */}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {i18n.t("variablePresets.aiGeneration.dialog.previewTitle")}
                  </div>
                  <div className="border rounded-md">
                    <Textarea
                      value={formatPreviewContent(
                        generatedResponse,
                        variableType,
                      )}
                      readOnly
                      className="max-h-60 bg-background border-none resize-none cursor-default"
                      rows={8}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  name="close-apply"
                  variant="secondary"
                  onClick={handleClose}
                >
                  {i18n.t("common.cancel")}
                </Button>
                <Button name="apply-generated" onClick={handleApply}>
                  {i18n.t("variablePresets.aiGeneration.dialog.apply")}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Error Screen */}
          {state === "error" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  {i18n.t("common.error")}
                </DialogTitle>
              </DialogHeader>

              <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>

              <DialogFooter>
                <Button
                  name="close-error"
                  variant="secondary"
                  onClick={handleClose}
                >
                  {i18n.t("common.cancel")}
                </Button>
                <Button
                  name="retry-generation"
                  variant="outline"
                  onClick={handleRetry}
                >
                  {i18n.t("variablePresets.aiGeneration.dialog.retry")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
        <VariableGenerationSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
        />
      </Dialog>
      {/* Model Settings Dialog */}
      <ModelSettingsDialog
        open={modelSettingsOpen}
        onOpenChange={setModelSettingsOpen}
      />
    </>
  )
}

/**
 * Format preview content based on variable type
 */
function formatPreviewContent(
  response: AIGenerationResponse,
  variableType: PresetVariableType,
): string {
  switch (variableType) {
    case "text":
      return response.textContent || ""

    case "select":
      return response.selectOptions?.join(", ") || ""

    case "dictionary":
      return (
        response.dictionaryItems
          ?.map((item) => `【${item.name}】\n${item.content}`)
          .join("\n\n") || ""
      )

    default:
      return ""
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof GeminiError) {
    switch (error.type) {
      case GeminiErrorType.API_KEY_MISSING:
        return i18n.t("variablePresets.aiGeneration.error.apiKeyMissing")
      case GeminiErrorType.NETWORK_ERROR:
        return i18n.t("variablePresets.aiGeneration.error.networkError")
      case GeminiErrorType.CANCELLED:
        return i18n.t("variablePresets.aiGeneration.error.cancelled")
      default:
        return i18n.t("variablePresets.aiGeneration.error.apiError")
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return i18n.t("variablePresets.aiGeneration.error.invalidResponse")
}
