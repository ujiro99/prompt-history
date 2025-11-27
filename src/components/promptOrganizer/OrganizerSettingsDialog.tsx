/**
 * Organizer Settings Dialog Component
 * Settings input form with token count display
 */

import { useState, useEffect, useRef } from "react"
import { i18n } from "#imports"
import { RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ApiKeyWarningBanner } from "@/components/common/ApiKeyWarningBanner"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { useContainer } from "@/hooks/useContainer"
import { usePromptOrganizer } from "@/hooks/usePromptOrganizer"
import { useDebounce } from "@/hooks/useDebounce"
import { useAiModel } from "@/hooks/useAiModel"
import type { PromptOrganizerSettings } from "@/types/promptOrganizer"
import { sleep } from "@/lib/utils"
import { stopPropagation } from "@/utils/dom"

interface OrganizerSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClickModelSettings: () => void
}

/**
 * Period options for filter
 */
const PERIOD_OPTIONS = [
  {
    value: "3",
    label: i18n.t("promptOrganizer.settings.filterPeriodDays", [3]),
  },
  {
    value: "7",
    label: i18n.t("promptOrganizer.settings.filterPeriodWeek", [1]),
  },
  {
    value: "30",

    label: i18n.t("promptOrganizer.settings.filterPeriodMonth", [1]),
  },
  {
    value: "365",
    label: i18n.t("promptOrganizer.settings.filterPeriodYear", [1]),
  },
]

export const OrganizerSettingsDialog: React.FC<
  OrganizerSettingsDialogProps
> = ({ open, onOpenChange, onClickModelSettings }) => {
  const [settings, setSettings] = useState<PromptOrganizerSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isFirstRender = useRef(true)
  const { container } = useContainer()
  const { estimate } = usePromptOrganizer({ enableEstimate: open })
  const debouncedSettings = useDebounce(settings, 400)

  const { genaiApiKey } = useAiModel()
  const hasApiKey = !!genaiApiKey

  /**
   * Load settings on dialog open
   */
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        const storedSettings = await promptOrganizerSettingsStorage.getValue()
        setSettings(storedSettings)
      }
      loadData()
      return () => {
        isFirstRender.current = true
      }
    }
  }, [open])

  /**
   * Persist settings on change
   */
  useEffect(() => {
    if (!debouncedSettings) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const saveData = async () => {
      setIsSaving(true)
      await promptOrganizerSettingsStorage.setValue(debouncedSettings)
      await sleep(600)
      setIsSaving(false)
    }
    saveData()
  }, [debouncedSettings])

  /**
   * Handle period change
   */
  const handlePeriodChange = (value: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      filterPeriodDays: parseInt(value),
    })
  }

  /**
   * Calculate context usage percentage
   */
  const getContextUsagePercentage = (): number => {
    if (!estimate) return 0
    const maxTokens = 1000000 // Gemini 1.5 Flash context window
    return (estimate.estimatedInputTokens / maxTokens) * 100
  }

  if (!settings) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-2xl"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {i18n.t("settings.promptOrganizerSettings")}
          </DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Settings Section */}
          <div className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {i18n.t("promptOrganizer.settings.filterConditions")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Period Selector */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {i18n.t("promptOrganizer.settings.filterPeriod")}
                  </div>
                  <Select
                    value={settings.filterPeriodDays.toString()}
                    onValueChange={handlePeriodChange}
                  >
                    <SelectTrigger className="min-w-24 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Execution Count Input */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {i18n.t("promptOrganizer.settings.minExecutionCount")}
                  </div>
                  <Input
                    type="number"
                    value={settings.filterMinExecutionCount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        filterMinExecutionCount: parseInt(e.target.value) || 2,
                      })
                    }
                    min={1}
                  />
                </div>

                {/* Max Prompts Input */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {i18n.t("promptOrganizer.settings.maxPrompts")}
                  </div>
                  <Input
                    type="number"
                    value={settings.filterMaxPrompts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        filterMaxPrompts: parseInt(e.target.value) || 40,
                      })
                    }
                    min={20}
                    max={1000}
                    step={20}
                  />
                </div>
              </div>
            </section>

            {/* Organization Prompt Editor */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {i18n.t("promptOrganizer.settings.organizationPrompt")}
              </h3>
              <Textarea
                value={settings.organizationPrompt}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    organizationPrompt: e.target.value,
                  })
                }
                rows={6}
                className="font-mono max-h-60"
              />
            </section>
          </div>

          {/* Estimation Display */}
          {estimate && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {i18n.t("promptOrganizer.estimate.title")}
              </h3>
              <div className="rounded-lg bg-muted p-4 space-y-3">
                {/* Token Count Display */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.targetPrompts")}
                    </span>
                    <span className="font-mono">
                      {estimate.targetPromptCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.inputTokens")}
                    </span>
                    <span className="font-mono">
                      {estimate.estimatedInputTokens.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Context Usage Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {i18n.t("promptOrganizer.estimate.contextUsage")}
                    </span>
                    <span className="font-mono">
                      {getContextUsagePercentage().toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={getContextUsagePercentage()}
                    className="h-2"
                  />
                </div>
              </div>
            </section>
          )}

          {/* API Key Warning */}
          {!hasApiKey && (
            <ApiKeyWarningBanner
              variant="warning"
              onOpenSettings={onClickModelSettings}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="min-w-24"
          >
            {isSaving ? (
              <>
                <RefreshCw className="size-4 animate-spin mr-2" />{" "}
                <span>{i18n.t("status.saving")}</span>
              </>
            ) : (
              i18n.t("buttons.complete")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
