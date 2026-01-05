/**
 * Variable Generation Settings Dialog Component
 * Settings for AI-powered variable generation
 */

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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { useContainer } from "@/hooks/useContainer"
import { useLazyStorage } from "@/hooks/useLazyStorage"
import { variableGenerationSettingsStorage } from "@/services/storage/definitions"
import { i18n } from "#imports"
import { stopPropagation } from "@/utils/dom"
import { DEFAULT_META_PROMPT } from "@/services/variableGeneration/defaultPrompts"

interface VariableGenerationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const VariableGenerationSettingsDialog: React.FC<
  VariableGenerationSettingsDialogProps
> = ({ open, onOpenChange }) => {
  const { container } = useContainer()
  const {
    value: settings,
    setValue: setSettings,
    isSaving,
  } = useLazyStorage(variableGenerationSettingsStorage, {
    debounceDelay: 400,
    artificialSetDelay: 600,
  })

  /**
   * Validate settings
   */
  const isValid = () => {
    if (!settings) return false
    // If custom prompt is selected, it must not be empty
    if (!settings.useDefault && !settings.customPrompt?.trim()) {
      return false
    }
    return true
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
            {i18n.t("settings.variableGeneration.title")}
          </DialogTitle>
          <DialogDescription>
            {i18n.t("settings.variableGeneration.description")}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="space-y-4">
          <Field>
            <FieldLabel htmlFor="use-default">
              {i18n.t("settings.variableGeneration.metaPrompt")}
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-default"
                checked={settings.useDefault}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    useDefault: checked === true,
                  })
                }
              />
              <FieldLabel
                htmlFor="use-default"
                className="cursor-pointer font-normal"
              >
                {i18n.t("settings.variableGeneration.useDefault")}
              </FieldLabel>
            </div>
          </Field>

          {!settings.useDefault && (
            <Field>
              <FieldLabel htmlFor="custom-prompt">
                {i18n.t("settings.variableGeneration.customPrompt")}
              </FieldLabel>
              <FieldDescription>
                {i18n.t("settings.variableGeneration.customPromptDescription")}
              </FieldDescription>
              <Textarea
                id="custom-prompt"
                value={settings.customPrompt || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    customPrompt: e.target.value,
                  })
                }
                placeholder={DEFAULT_META_PROMPT}
                rows={8}
                className="font-mono text-sm max-h-80"
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="history-count">
              {i18n.t("settings.variableGeneration.promptHistoryCount")}
            </FieldLabel>
            <FieldDescription>
              {i18n.t(
                "settings.variableGeneration.promptHistoryCountDescription",
              )}
            </FieldDescription>
            <Select
              value={settings.promptHistoryCount.toString()}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  promptHistoryCount: Number.parseInt(value),
                })
              }
            >
              <SelectTrigger id="history-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={container}>
                <SelectItem value="50">
                  {i18n.t("settings.variableGeneration.count50")}
                </SelectItem>
                <SelectItem value="100">
                  {i18n.t("settings.variableGeneration.count100")}
                </SelectItem>
                <SelectItem value="200">
                  {i18n.t("settings.variableGeneration.count200")}
                </SelectItem>
                <SelectItem value="500">
                  {i18n.t("settings.variableGeneration.count500")}
                </SelectItem>
                <SelectItem value="-1">
                  {i18n.t("settings.variableGeneration.countUnlimited")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isSaving || !isValid()}
            className="min-w-24"
          >
            {isSaving ? (
              <>
                <RefreshCw className="size-4 animate-spin mr-2" />
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
