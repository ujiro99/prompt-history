import { useState, useRef, useCallback, useEffect } from "react"
import { Sparkles, Loader2, AlertCircle, Settings } from "lucide-react"
import type {
  PresetVariableType,
  AIGenerationResponse,
  ExistingVariableContent,
} from "@/types/prompt"
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
import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"
import { i18n } from "#imports"
import { generateVariable } from "@/services/variableGeneration"
import {
  generateMetaPrompt,
  getPromptHistoryCount,
} from "@/services/variableGeneration/metaPromptGenerator"
import { fetchPromptHistory } from "@/services/variableGeneration/promptHistoryFetcher"
import { mergeResponse } from "@/services/variableGeneration/responseMerger"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
import { stopPropagation } from "@/utils/dom"
import { VariableGenerationSettingsDialog } from "@/components/settings/variablePresets/VariableGenerationSettingsDialog"

/**
 * Dialog state
 */
type DialogState = "confirm" | "loading" | "success" | "error"

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
}) => {
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Dialog state
  const [state, setState] = useState<DialogState>("confirm")
  const [generatedResponse, setGeneratedResponse] =
    useState<AIGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accumulatedText, setAccumulatedText] = useState("")
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  /**
   * Reset state when dialog closes
   */
  useEffect(() => {
    if (!open) {
      setState("confirm")
      setError(null)
      setGeneratedResponse(null)
      setAccumulatedText("")
      setAdditionalInstructions("")
    }
  }, [open])

  /**
   * Start AI generation
   */
  const handleStart = async () => {
    setState("loading")
    setError(null)
    setAccumulatedText("")

    // Create AbortController for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Fetch prompt history
      const historyCount = await getPromptHistoryCount()
      const promptHistory = await fetchPromptHistory(historyCount)

      // Generate meta-prompt (including existing content and additional instructions if provided)
      const metaPrompt = await generateMetaPrompt({
        variableName,
        variablePurpose,
        variableType,
        promptHistory,
        existingContent,
        additionalInstructions,
      })

      console.log("Generated Meta-Prompt:", metaPrompt)

      // Generate variable content
      const response = await generateVariable({
        request: {
          variableName,
          variablePurpose,
          variableType,
          promptHistory,
          metaPrompt,
          existingContent,
        },
        apiKey: genaiApiKey || "",
        signal: abortControllerRef.current.signal,
        onProgress: (_chunk, accumulated) => {
          setAccumulatedText(accumulated)
        },
      })

      // Merge with existing content if provided
      const mergedResponse = mergeResponse(
        response,
        variableType,
        existingContent,
      )

      setGeneratedResponse(mergedResponse)
      setState("success")
    } catch (err) {
      // Handle cancellation
      if (
        err instanceof GeminiError &&
        err.type === GeminiErrorType.CANCELLED
      ) {
        // Reset to confirm state on cancellation
        setState("confirm")
        setAccumulatedText("")
        return
      }

      // Handle other errors
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      setState("error")
    } finally {
      abortControllerRef.current = null
    }
  }

  /**
   * Cancel generation
   */
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState("confirm")
    setAccumulatedText("")
  }, [])

  /**
   * Apply generated content
   */
  const handleApply = () => {
    if (generatedResponse) {
      onApply(generatedResponse)
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
    setAccumulatedText("")
  }

  /**
   * Close dialog
   */
  const handleClose = () => {
    handleCancel()
    onOpenChange(false)
  }

  return (
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
                onClick={() => setSettingsDialogOpen(true)}
                variant="ghost"
                size="sm"
                className="group mr-1"
              >
                <Settings className="size-5 stroke-neutral-600 group-hover:stroke-neutral-800" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                {i18n.t("variablePresets.aiGeneration.dialog.variableName", [
                  variableName,
                ])}
              </div>
              <div>
                {i18n.t("variablePresets.aiGeneration.dialog.variablePurpose", [
                  variablePurpose || "(未入力)",
                ])}
              </div>
              <div>
                {i18n.t("variablePresets.aiGeneration.dialog.variableType", [
                  i18n.t(`variableTypes.${variableType}`),
                ])}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
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
              <Button variant="secondary" onClick={handleClose}>
                {i18n.t("common.cancel")}
              </Button>
              <Button onClick={handleStart}>
                <Sparkles className="mr-1 size-4" />
                {i18n.t("variablePresets.aiGeneration.dialog.start")}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading Screen */}
        {state === "loading" && (
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

            <div className="relative min-h-40">
              <Textarea
                value={accumulatedText}
                readOnly
                className="max-h-60 bg-muted/50 resize-none"
                rows={8}
                placeholder={i18n.t(
                  "variablePresets.aiGeneration.dialog.improving",
                )}
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/50 pointer-events-none">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
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
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {i18n.t("variablePresets.aiGeneration.dialog.explanation")}
                </div>
                <div className="text-sm text-foreground/80 p-3 bg-muted/50 rounded-md border border-muted whitespace-pre-line">
                  {generatedResponse.explanation}
                </div>
              </div>

              {/* Generated Content Preview */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {i18n.t("variablePresets.aiGeneration.dialog.previewTitle")}
                </div>
                <div className="border border-purple-200 rounded-md bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-1">
                  <Textarea
                    value={formatPreviewContent(
                      generatedResponse,
                      variableType,
                    )}
                    readOnly
                    className="max-h-60 bg-white border-none resize-none"
                    rows={8}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={handleClose}>
                {i18n.t("common.cancel")}
              </Button>
              <Button onClick={handleApply}>
                <Sparkles className="mr-1 size-4" />
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
              <Button variant="secondary" onClick={handleClose}>
                {i18n.t("common.cancel")}
              </Button>
              <Button variant="outline" onClick={handleRetry}>
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
          .join("\n\n---\n\n") || ""
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
