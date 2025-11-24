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
import { Loader2, AlertCircle, Info } from "lucide-react"
import { i18n } from "#imports"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { costEstimatorService } from "@/services/promptOrganizer/CostEstimatorService"
import type { PromptOrganizerSettings } from "@/types/promptOrganizer"
import type { OrganizerExecutionEstimate } from "@/types/promptOrganizer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: () => Promise<void>
}

export const OrganizerExecuteDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onExecute,
}) => {
  const [_settings, setSettings] = useState<PromptOrganizerSettings | null>(
    null,
  )
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

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
      const { genaiApiKeyStorage } = await import(
        "@/services/storage/definitions"
      )
      const apiKey = await genaiApiKeyStorage.getValue()
      setApiKeyMissing(!apiKey)

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

    setIsExecuting(true)
    setError(null)

    try {
      await onExecute()
      onOpenChange(false)
    } catch (err) {
      console.error("Execution failed:", err)
      setError(
        err instanceof Error ? err.message : i18n.t("errors.unknownError"),
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const formatCost = (cost: number) => {
    return `¥${cost.toFixed(2)}`
  }

  const contextUsagePercent = estimate
    ? (estimate.estimatedInputTokens / 1000000) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key Warning */}
          {apiKeyMissing && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {i18n.t("promptOrganizer.errors.noApiKey")}
              </AlertDescription>
            </Alert>
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

          {/* Settings Change Notice */}
          {!apiKeyMissing && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ℹ️ 実行設定は「設定メニュー」から変更できます
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
            {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isExecuting
              ? i18n.t("promptOrganizer.status.generating")
              : i18n.t("promptOrganizer.buttons.organize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
