import { useState, useEffect } from "react"
import { Info, Eye, EyeOff, TriangleAlert } from "lucide-react"
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
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
} from "@/components/ui/field"
import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"
import { genaiApiKeyStorage } from "@/services/storage/definitions"
import { analyticsService, ANALYTICS_EVENTS } from "@/services/analytics"
import { i18n } from "#imports"
import { stopPropagation } from "@/utils/dom"

/**
 * Props for ModelSettingsDialog
 */
interface ModelSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Prompt Improver Settings Dialog Component
 */
export const ModelSettingsDialog: React.FC<ModelSettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()

  // API Key settings
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)

  // Validation states
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  /**
   * Validate inputs
   */
  const validate = (): boolean => {
    let isValid = true

    // Validate API key
    if (!apiKey.trim()) {
      setApiKeyError(i18n.t("errors.apiKeyRequired"))
      isValid = false
    } else {
      setApiKeyError(null)
    }

    return isValid
  }

  /**
   * Load settings from storage
   */
  useEffect(() => {
    if (open) {
      setApiKey(genaiApiKey || "")
    }
  }, [open, genaiApiKey])

  /**
   * Save settings
   */
  const handleSave = async () => {
    if (!validate()) {
      return
    }

    try {
      // Save API key
      await genaiApiKeyStorage.setValue(apiKey)

      // Track API key setup
      await analyticsService.track(ANALYTICS_EVENTS.SET_API_KEY)

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  /**
   * Cancel and close
   */
  const handleCancel = () => {
    onOpenChange(false)
  }

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
    }
    // Prevent propagation to avoid unwanted side effects on AI service input
    event.persist()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="w-xl sm:max-w-2xl"
        onKeyDown={handleKeyDown}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("settings.modelSettings.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("settings.modelSettings.description")}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <FieldLegend className="mb-0">
            {i18n.t("settings.modelSettings.apiKeySettings")}
          </FieldLegend>

          <Field>
            <FieldLabel htmlFor="api-key">
              {i18n.t("settings.modelSettings.geminiApiKey")}
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setApiKeyError(null)
                }}
                placeholder={i18n.t("settings.modelSettings.enterApiKey")}
                className={apiKeyError ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <FieldError>{apiKeyError}</FieldError>

            <div className="mt-2 space-y-2">
              <FieldDescription className="flex items-center gap-1.5">
                <Info className="size-4.5 stroke-blue-500 fill-blue-100" />
                <span>
                  {i18n.t("settings.modelSettings.getApiKeyInfo")}{" "}
                  <a
                    href="https://ai.google.dev/gemini-api/docs/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    https://ai.google.dev/gemini-api/docs/api-key
                  </a>
                </span>
              </FieldDescription>

              <FieldDescription className="flex items-start gap-1.5">
                <TriangleAlert className="size-5.5 stroke-amber-500 fill-amber-100 mt-0.5" />
                <span>
                  {i18n.t("settings.modelSettings.freeApiWarning")}{" "}
                  <a
                    href="https://ai.google.dev/gemini-api/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    {i18n.t("settings.modelSettings.learnMore")}
                  </a>
                </span>
              </FieldDescription>
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel}>
            {i18n.t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>{i18n.t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
