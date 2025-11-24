import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
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
import { useContainer } from "@/hooks/useContainer"
import { genaiApiKeyStorage } from "@/services/storage/definitions"
import { getGenaiApiKey } from "@/services/storage/genaiApiKey"
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
      /**
       * Load settings from storage
       */
      const loadSettings = async () => {
        try {
          const storedApiKey = await getGenaiApiKey()
          setApiKey(storedApiKey || "")
        } catch (error) {
          console.error("Failed to load settings:", error)
        }
      }

      loadSettings()
    }
  }, [open])

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
          <DialogTitle>{i18n.t("settings.promptImproverSettings")}</DialogTitle>
          <DialogDescription>
            {i18n.t("settings.promptImprover.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Settings */}
          <div className="space-y-3">
            <label className="text-base font-semibold">
              {i18n.t("settings.promptImprover.apiKeySettings")}
            </label>

            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium">
                {i18n.t("settings.promptImprover.geminiApiKey")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setApiKeyError(null)
                  }}
                  placeholder={i18n.t("settings.promptImprover.enterApiKey")}
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
              {apiKeyError && (
                <p className="text-sm text-destructive">{apiKeyError}</p>
              )}

              <div className="space-y-1 text-sm">
                <p className="flex items-start gap-1.5 text-muted-foreground">
                  <span>ℹ️</span>
                  <span>
                    {i18n.t("settings.promptImprover.getApiKeyInfo")}{" "}
                    <a
                      href="https://ai.google.dev/gemini-api/docs/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      https://ai.google.dev/gemini-api/docs/api-key
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-1.5 text-muted-foreground">
                  <span>⚠️</span>
                  <span>
                    {i18n.t("settings.promptImprover.freeApiWarning")}{" "}
                    <a
                      href="https://ai.google.dev/gemini-api/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      {i18n.t("settings.promptImprover.learnMore")}
                    </a>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

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
