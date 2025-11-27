import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Settings } from "lucide-react"
import { i18n } from "#imports"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"
import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"
import { stopPropagation } from "@/utils/dom"
import { ApiKeyWarningBanner } from "@/components/common/ApiKeyWarningBanner"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import { OrganizerSettingsDialog } from "@/components/promptOrganizer/OrganizerSettingsDialog"
import { EstimationDisplay } from "@/components/promptOrganizer/EstimationDisplay"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  GenerationProgress,
  TemplateCandidate,
  PromptForOrganization,
} from "@/types/promptOrganizer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: () => Promise<void>
  isExecuting?: boolean
  progress?: GenerationProgress | null
  onCancel?: () => void
  pendingTemplates?: TemplateCandidate[]
  onOpenPreview?: () => void
}

export const OrganizerExecuteDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onExecute,
  isExecuting: externalIsExecuting,
  progress,
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
  const [localIsExecuting, setLocalIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [modelSettingsDialogOpen, setModelSettingsDialogOpen] = useState(false)
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()
  const apiKeyMissing = !genaiApiKey

  // Use external isExecuting if provided, otherwise use local state
  const isExecuting = externalIsExecuting ?? localIsExecuting

  useEffect(() => {
    // Check API key (using hook value)
    if (!genaiApiKey) {
      setEstimate(null)
      return
    }
  }, [genaiApiKey])

  // Load settings and calculate estimate when dialog opens
  useEffect(() => {
    const updateSettings = async (loadedSettings: PromptOrganizerSettings) => {
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
        setError(i18n.t("errors.unknownError"))
      }
    }

    if (open) {
      promptOrganizerSettingsStorage
        .getValue()
        .then((loadedSettings) => updateSettings(loadedSettings))
      return promptOrganizerSettingsStorage.watch((loadedSettings) => {
        updateSettings(loadedSettings)
      })
    }
  }, [open])

  const handleExecute = async () => {
    if (apiKeyMissing) {
      return
    }

    setLocalIsExecuting(true)
    setError(null)

    try {
      await onExecute()
      // Don't close immediately if using external isExecuting
      if (!externalIsExecuting) {
        onOpenChange(false)
      }
    } catch (err) {
      console.error("Execution failed:", err)
      setError(
        err instanceof Error ? err.message : i18n.t("errors.unknownError"),
      )
    } finally {
      setLocalIsExecuting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const handleOpenSettings = () => {
    setSettingsDialogOpen(true)
  }

  const hasPendingTemplates = pendingTemplates && pendingTemplates.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[500px]"
          container={container}
          {...stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <DialogHeader className="flex-1">
              <DialogTitle>{i18n.t("promptOrganizer.title")}</DialogTitle>
              <DialogDescription>
                {i18n.t("promptOrganizer.description")}
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

          <div className="space-y-4 pb-4">
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
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {i18n.t("promptOrganizer.targetPrompts")}
              </h3>
              <div className="bg-neutral-100 rounded-md overflow-hidden">
                <ScrollAreaWithGradient
                  className="max-h-40 px-2.5 py-3"
                  gradientHeight={"2rem"}
                  style={
                    {
                      "--ph-gradient-background": "rgb(243 244 246)",
                    } as React.CSSProperties
                  }
                  indicatorVisible={false}
                >
                  <div className="space-y-1.5">
                    {targetPrompts?.map((prompt, index) => (
                      <div
                        key={prompt.id}
                        className="text-xs font-mono break-all"
                      >
                        {index + 1}. {prompt.name}{" "}
                      </div>
                    ))}
                  </div>
                </ScrollAreaWithGradient>
              </div>
            </div>

            {/* Estimation Display */}
            {!apiKeyMissing && (
              <EstimationDisplay estimate={estimate} hideWhenNoEstimate />
            )}

            {/* Progress Display */}
            {isExecuting && progress && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  ⚡ {i18n.t("promptOrganizer.status.generating")}
                </h3>

                <div className="rounded-lg border p-4 space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">進捗</span>
                      <span className="font-medium">
                        {progress.estimatedProgress}%
                      </span>
                    </div>
                    <Progress
                      value={progress.estimatedProgress}
                      className="h-2"
                    />
                  </div>

                  {/* Partial JSON Preview (Optional) */}
                  {progress.accumulated && progress.accumulated.length > 50 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        受信中のデータ:
                      </span>
                      <ScrollArea className="h-16 rounded border bg-muted p-2">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                          {progress.accumulated.substring(0, 300)}...
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {isExecuting ? (
              <>
                {/* Cancel button during execution */}
                <Button variant="outline" onClick={handleCancel}>
                  {i18n.t("common.cancel")}
                </Button>
              </>
            ) : (
              <>
                {/* Normal buttons before execution */}
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isExecuting}
                >
                  {i18n.t("promptOrganizer.buttons.cancel")}
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting || apiKeyMissing || !estimate}
                >
                  {i18n.t("promptOrganizer.buttons.organize")}
                </Button>
              </>
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
