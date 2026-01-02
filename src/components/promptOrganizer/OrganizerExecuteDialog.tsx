import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, Settings, Play, Square, Ban } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { i18n } from "#imports"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"
import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"
import { stopPropagation } from "@/utils/dom"
import { ApiKeyWarningBanner } from "@/components/shared/ApiKeyWarningBanner"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import { OrganizerSettingsDialog } from "@/components/promptOrganizer/OrganizerSettingsDialog"
import { EstimationDisplay } from "@/components/shared/EstimationDisplay"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import { GenerationProgress } from "@/components/shared/GenerationProgress"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  GenerationProgress as GenerationProgressType,
  TemplateCandidate,
  PromptForOrganization,
  OrganizerError,
} from "@/types/promptOrganizer"
import { GeminiError } from "@/services/genai/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (count: number) => Promise<void>
  isExecuting: boolean
  isCanceling: boolean
  progress: GenerationProgressType | null
  error?: OrganizerError | null
  onCancel: () => void
  pendingTemplates?: TemplateCandidate[]
  onOpenPreview?: () => void
}

export const OrganizerExecuteDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onExecute,
  isExecuting,
  isCanceling,
  progress,
  error: executeError,
  onCancel,
  pendingTemplates,
  onOpenPreview,
}) => {
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [targetPrompts, setTargetPrompts] = useState<
    PromptForOrganization[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [modelSettingsDialogOpen, setModelSettingsDialogOpen] = useState(false)
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()
  const apiKeyMissing = !genaiApiKey
  const targetExists = targetPrompts && targetPrompts.length > 0
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  const messages = [
    i18n.t("promptOrganizer.execute.executeMessage1"),
    i18n.t("promptOrganizer.execute.executeMessage2"),
  ]

  useEffect(() => {
    // Check API key
    if (apiKeyMissing) {
      setEstimate(null)
      return
    }
  }, [apiKeyMissing])

  // Load settings and calculate estimate when dialog opens
  useEffect(() => {
    const updateSettings = async (loadedSettings: PromptOrganizerSettings) => {
      // Skip estimation if no API key
      if (apiKeyMissing) {
        setEstimate(null)
        setTargetPrompts(null)
        return
      }

      try {
        // Calculate estimate
        const estimateResult =
          await promptOrganizerService.estimateExecution(loadedSettings)
        setEstimate(estimateResult)
        // Get target prompts
        const targets =
          await promptOrganizerService.targetPrompts(loadedSettings)
        setTargetPrompts(targets)
      } catch (err) {
        console.error("Failed to load settings:", err)
        if (err instanceof GeminiError) {
          setError(err.message)
          return
        }
        setError(i18n.t("errors.unknownError"))
      }
    }

    if (open) {
      setError(null)
      promptOrganizerSettingsStorage
        .getValue()
        .then((loadedSettings) => updateSettings(loadedSettings))
      return promptOrganizerSettingsStorage.watch((loadedSettings) => {
        updateSettings(loadedSettings)
      })
    }
  }, [open, apiKeyMissing])

  useEffect(() => {
    if (executeError) {
      setError(
        executeError.message ||
          i18n.t("promptOrganizer.execute.executionFailed"),
      )
    }
  }, [executeError])

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [messages.length, open])

  const handleExecute = async () => {
    if (apiKeyMissing) {
      return
    }
    // Clear previous error
    setError(null)

    try {
      await onExecute(targetPrompts ? targetPrompts.length : 0)
    } catch (err) {
      console.error("Execution failed:", err)
      setError(
        err instanceof Error ? err.message : i18n.t("errors.unknownError"),
      )
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const handleClose = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const handleOpenSettings = () => {
    setSettingsDialogOpen(true)
  }

  const hasPendingTemplates = pendingTemplates && pendingTemplates.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[600px] gap-6"
          container={container}
          onInteractOutside={(e) => {
            // Prevent closing the dialog while executing
            if (isExecuting) e.preventDefault()
          }}
          showCloseButton={!isExecuting}
          {...stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <DialogHeader className="flex-1">
              <DialogTitle>
                {i18n.t("promptOrganizer.execute.title")}
              </DialogTitle>
              <DialogDescription>
                {i18n.t("promptOrganizer.execute.description")}
                <br />
                {i18n.t("promptOrganizer.execute.description2")}
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

          <div className="space-y-6">
            {/* API Key Warning */}
            {apiKeyMissing && (
              <ApiKeyWarningBanner onOpenSettings={handleOpenSettings} />
            )}

            {/* Pending Templates Warning */}
            {hasPendingTemplates && !isExecuting && (
              <Alert className="bg-neutral-100 border-neutral-200 flex items-center">
                <AlertDescription className="text-neutral-600 flex items-center flex-1">
                  <AlertCircle className="h-4 w-4" />
                  {i18n.t("promptOrganizer.pendingTemplates.warning", [
                    pendingTemplates.length,
                  ])}
                </AlertDescription>
                {onOpenPreview && (
                  <Button
                    variant="outline"
                    onClick={onOpenPreview}
                    className="ml-2"
                  >
                    {i18n.t("promptOrganizer.pendingTemplates.review")}
                  </Button>
                )}
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {i18n.t("promptOrganizer.status.error")}
                </AlertTitle>
                <AlertDescription className="text-balance break-all max-h-40 overflow-y-auto">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <section className="space-y-1">
              <h3 className="text-sm font-semibold">
                {i18n.t("promptOrganizer.execute.targetPrompts")}
                <span className="font-medium font-mono text-foreground/70">
                  ({targetPrompts ? targetPrompts.length : 0})
                </span>
              </h3>
              <div className="bg-neutral-100 border border-neutral-200 rounded-md overflow-hidden">
                <ScrollAreaWithGradient
                  className="max-h-40 px-3 py-2.5"
                  gradientHeight={"2rem"}
                  style={
                    {
                      "--ph-gradient-background": "rgb(243 244 246)",
                    } as React.CSSProperties
                  }
                  indicatorVisible={false}
                >
                  <div className="space-y-1.5">
                    {targetExists ? (
                      targetPrompts?.map((prompt, index) => (
                        <div
                          key={prompt.id}
                          className="text-xs font-mono break-all"
                        >
                          {index + 1}. {prompt.name}{" "}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-foreground/80">
                        {i18n.t("promptOrganizer.execute.noTargetPrompts")}
                      </p>
                    )}
                  </div>
                </ScrollAreaWithGradient>
              </div>

              {/* Estimation Display */}
              {!apiKeyMissing && (
                <EstimationDisplay
                  estimate={estimate}
                  hideWhenNoEstimate
                  collapsible
                />
              )}
            </section>

            <section className="flex justify-center">
              {isExecuting ? (
                /* Cancel button during execution */
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className={cn(
                    "bg-gradient-to-r from-purple-50 to-blue-50",
                    "border-purple-200 hover:border-purple-300",
                    "hover:from-purple-100 hover:to-blue-100",
                    "text-purple-700 hover:text-purple-800",
                    "transition-all duration-200",
                  )}
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <>
                      <Ban className="size-4" />
                      {i18n.t("promptOrganizer.buttons.canceling")}
                    </>
                  ) : (
                    <>
                      <Square className="size-4" fill="url(#lucideGradient)" />
                      {i18n.t("promptOrganizer.buttons.cancel")}
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex flex-col w-full items-center gap-1 pb-4">
                  <Button
                    onClick={handleExecute}
                    disabled={
                      isExecuting || apiKeyMissing || !estimate || !targetExists
                    }
                    variant="outline"
                    className={cn(
                      "bg-gradient-to-r from-purple-50 to-blue-50",
                      "border-purple-200 hover:border-purple-300",
                      "hover:from-purple-100 hover:to-blue-100",
                      "text-purple-700 hover:text-purple-800",
                      "transition-all duration-200",
                    )}
                  >
                    <Play className="size-4" fill="url(#lucideGradient)" />
                    {i18n.t("promptOrganizer.buttons.organize", [
                      targetPrompts?.length ?? 0,
                    ])}
                  </Button>
                  <div className="relative h-6 w-full overflow-hidden flex items-center justify-center">
                    <p
                      key={currentMessageIndex}
                      className="text-xs text-center text-foreground/90 absolute w-full animate-slide-in-out"
                    >
                      {messages[currentMessageIndex]}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Progress Display */}
            {isExecuting && progress && (
              <GenerationProgress progress={progress} />
            )}
          </div>

          <DialogFooter>
            {/* Close button */}
            {isExecuting ? null : (
              <Button variant="secondary" onClick={handleClose}>
                {i18n.t("buttons.cancel")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModelSettingsDialog
        open={modelSettingsDialogOpen}
        onOpenChange={setModelSettingsDialogOpen}
      />
      <OrganizerSettingsDialog
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
