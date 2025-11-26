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
import { AlertCircle } from "lucide-react"
import { i18n } from "#imports"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { costEstimatorService } from "@/services/promptOrganizer/CostEstimatorService"
import { useContainer } from "@/hooks/useContainer"
import { stopPropagation } from "@/utils/dom"
import { ApiKeyWarningBanner } from "@/components/common/ApiKeyWarningBanner"
import { PromptImproverSettingsDialog } from "@/components/settings/PromptImproverSettingsDialog"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import type { PromptOrganizerSettings } from "@/types/promptOrganizer"
import type {
  OrganizerExecutionEstimate,
  GenerationProgress,
} from "@/types/promptOrganizer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: () => Promise<void>
  isExecuting?: boolean
  progress?: GenerationProgress | null
  onCancel?: () => void
}

export const OrganizerExecuteDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onExecute,
  isExecuting: externalIsExecuting,
  progress,
  onCancel,
}) => {
  const [_settings, setSettings] = useState<PromptOrganizerSettings | null>(
    null,
  )
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [localIsExecuting, setLocalIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [modelSettingsDialogOpen, setModelSettingsDialogOpen] = useState(false)
  const { container } = useContainer()

  // Use external isExecuting if provided, otherwise use local state
  const isExecuting = externalIsExecuting ?? localIsExecuting

  // Load settings and calculate estimate when dialog opens
  useEffect(() => {
    if (open) {
      loadSettingsAndEstimate()
    }
  }, [open])

  const loadSettingsAndEstimate = async () => {
    try {
      const loadedSettings = await promptOrganizerSettingsStorage.getValue()
      setSettings(loadedSettings)

      // Check API key
      const { getGenaiApiKey } = await import("@/services/storage/genaiApiKey")
      const apiKey = await getGenaiApiKey()
      setApiKeyMissing(!apiKey)
      if (!apiKey) {
        setEstimate(null)
        return
      }

      // Calculate estimate
      const estimateResult =
        await costEstimatorService.estimateExecution(loadedSettings)
      setEstimate(estimateResult)
    } catch (err) {
      console.error("Failed to load settings:", err)
      setError(i18n.t("errors.unknownError"))
    }
  }

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

  const formatCost = (cost: number) => {
    return `¥${cost.toFixed(2)}`
  }

  const contextUsagePercent = estimate
    ? (estimate.estimatedInputTokens / 1000000) * 100
    : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[500px]"
          container={container}
          {...stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{i18n.t("promptOrganizer.title")}</DialogTitle>
            <DialogDescription>
              {i18n.t("promptOrganizer.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* API Key Warning */}
            {apiKeyMissing && (
              <ApiKeyWarningBanner onOpenSettings={handleOpenSettings} />
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Execution Estimate Display */}
            {estimate && !apiKeyMissing && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  📊 {i18n.t("promptOrganizer.estimate.title")}
                </h3>

                <div className="rounded-lg border p-4 space-y-3">
                  {/* Target Prompts Count */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.targetPrompts")}
                    </span>
                    <span className="font-medium">
                      {estimate.targetPromptCount}件
                    </span>
                  </div>

                  {/* Input Tokens */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.inputTokens")}
                    </span>
                    <span className="font-medium">
                      {estimate.estimatedInputTokens.toLocaleString()} tokens
                    </span>
                  </div>

                  {/* Output Tokens (estimate) */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.outputTokens")}
                    </span>
                    <span className="font-medium text-muted-foreground">
                      (AI生成後に確定)
                    </span>
                  </div>

                  {/* Context Usage Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {i18n.t("promptOrganizer.estimate.contextUsage")}
                      </span>
                      <span className="font-medium">
                        {contextUsagePercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={contextUsagePercent} className="h-2" />
                  </div>

                  {/* Estimated Cost */}
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.estimatedCost")}
                    </span>
                    <span className="font-medium text-lg">
                      {formatCost(estimate.estimatedCost)}
                      <span className="text-xs text-muted-foreground ml-1">
                        / 回 (参考)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
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
