import { useState, useEffect } from "react"
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
import {
  promptOrganizerSettingsStorage,
  genaiApiKeyStorage,
} from "@/services/storage/definitions"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"
import type {
  PromptOrganizerSettings,
  PromptOrganizerResult,
} from "@/types/promptOrganizer"
import { useContainer } from "@/hooks/useContainer"
import type { Prompt } from "@/types/prompt"
import { i18n } from "#imports"

/**
 * Props for PromptOrganizerDialog
 */
interface PromptOrganizerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompts: Prompt[]
}

/**
 * Prompt Organizer Dialog Component
 * MVP version with basic settings
 */
export const PromptOrganizerDialog: React.FC<PromptOrganizerDialogProps> = ({
  open,
  onOpenChange,
  prompts,
}) => {
  const [settings, setSettings] = useState<PromptOrganizerSettings>({
    filterPeriodDays: 30,
    filterMinExecutionCount: 2,
    filterMaxPrompts: 40,
    organizationPrompt: "",
  })
  const { container } = useContainer()

  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PromptOrganizerResult | null>(null)

  /**
   * Load settings from storage
   */
  useEffect(() => {
    if (open) {
      const loadSettings = async () => {
        const stored = await promptOrganizerSettingsStorage.getValue()
        setSettings(stored)
      }
      loadSettings()
    }
  }, [open])

  /**
   * Handle execute organization
   */
  const handleExecute = async () => {
    try {
      setIsExecuting(true)
      setError(null)
      setResult(null)

      // Check API key
      const apiKey = await genaiApiKeyStorage.getValue()
      if (!apiKey) {
        setError("Gemini API key is required. Please set it in settings.")
        return
      }

      // Save settings
      await promptOrganizerSettingsStorage.setValue(settings)

      // Execute organization
      const organizationResult =
        await promptOrganizerService.executeOrganization(prompts, settings)

      setResult(organizationResult)

      // Show result summary
      console.log("Organization result:", organizationResult)
    } catch (err) {
      console.error("Organization error:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-2xl"
        container={container}
        onKeyPress={(e) => e.stopPropagation()} // For chatgpt
        onKeyUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Filter Period */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.settings.filterPeriod")}
            </div>
            <Input
              id="period"
              type="number"
              value={settings.filterPeriodDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  filterPeriodDays: parseInt(e.target.value) || 30,
                })
              }
              min={1}
              max={365}
            />
          </div>

          {/* Min Execution Count */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.settings.minExecutionCount")}
            </div>
            <Input
              id="minCount"
              type="number"
              value={settings.filterMinExecutionCount}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  filterMinExecutionCount: parseInt(e.target.value) || 2,
                })
              }
              min={1}
              max={100}
            />
          </div>

          {/* Max Prompts */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.settings.maxPrompts")}
            </div>
            <Input
              id="maxPrompts"
              type="number"
              value={settings.filterMaxPrompts}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  filterMaxPrompts: parseInt(e.target.value) || 40,
                })
              }
              min={20}
              max={100}
              step={20}
            />
          </div>

          {/* Result Display */}
          {result && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">
                {i18n.t("promptOrganizer.result.templatesGenerated", [
                  result.templates.length.toString(),
                ])}
              </p>
              <p className="text-sm text-muted-foreground">
                {i18n.t("promptOrganizer.result.sourceCount", [
                  result.sourceCount.toString(),
                ])}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Input tokens: {result.inputTokens} | Output tokens:{" "}
                {result.outputTokens}
              </p>
              <p className="text-xs text-muted-foreground">
                Estimated cost: ¥{result.estimatedCost.toFixed(2)}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
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
          <Button onClick={handleExecute} disabled={isExecuting}>
            {isExecuting
              ? i18n.t("promptOrganizer.status.generating")
              : i18n.t("promptOrganizer.buttons.organize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
