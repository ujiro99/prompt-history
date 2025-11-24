import { useState, useEffect } from "react"
import { AlertCircle, Info } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useContainer } from "@/hooks/useContainer"
import { improvePromptSettingsStorage } from "@/services/storage/definitions"
import { improvePromptCacheService } from "@/services/storage/improvePromptCache"
import type { ImprovePromptSettings } from "@/types/prompt"
import { ImprovePromptInputMethod } from "@/types/prompt"
import { i18n } from "#imports"
import { sleep } from "@/lib/utils"
import { stopPropagation } from "@/utils/dom"

/**
 * Props for PromptImproverSettingsDialog
 */
interface PromptImproverSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Default URL from environment variable
const DefaultUrl = import.meta.env.WXT_IMPROVE_PROMPT_URL || ""

/**
 * Prompt Improver Settings Dialog Component
 */
export const PromptImproverSettingsDialog: React.FC<
  PromptImproverSettingsDialogProps
> = ({ open, onOpenChange }) => {
  const { container } = useContainer()

  // Improvement prompt settings (improvement guidelines only, system role is fixed)
  const [settings, setSettings] = useState<ImprovePromptSettings>({
    mode: ImprovePromptInputMethod.URL,
    textContent: "",
    urlContent: "",
    lastModified: 0,
  })

  // Preview and fetch states
  const [previewPrompt, setPreviewPrompt] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Validation states
  const [urlError, setUrlError] = useState<string | null>(null)

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
          const storedSettings = await improvePromptSettingsStorage.getValue()

          // Use default URL if urlContent is empty
          if (!storedSettings.urlContent && DefaultUrl) {
            storedSettings.urlContent = DefaultUrl
          }

          setSettings(storedSettings)

          // Load preview based on mode
          if (storedSettings.mode === "text" && storedSettings.textContent) {
            setPreviewPrompt(storedSettings.textContent)
          } else if (
            storedSettings.mode === "url" &&
            storedSettings.urlContent
          ) {
            // Try to fetch from URL for preview
            await fetchPromptFromUrl(storedSettings.urlContent, true)
          }
        } catch (error) {
          console.error("Failed to load settings:", error)
        }
      }

      loadSettings()
    }
  }, [open])

  /**
   * Handle mode change
   */
  const handleModeChange = (mode: ImprovePromptInputMethod) => {
    setSettings((prev) => ({
      ...prev,
      mode,
    }))

    // Update preview when mode changes
    if (mode === "text" && settings.textContent) {
      setPreviewPrompt(settings.textContent)
    } else if (mode === "url" && settings.urlContent) {
      // Preview will be updated when user clicks fetch
      setPreviewPrompt("")
    } else {
      setPreviewPrompt("")
    }
  }

  /**
   * Handle text content change
   */
  const handleTextContentChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      textContent: value,
    }))
    setPreviewPrompt(value)
  }

  /**
   * Handle URL content change
   */
  const handleUrlContentChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      urlContent: value,
    }))
    setUrlError(null)
  }

  /**
   * Set default URL
   */
  const handleSetDefaultUrl = () => {
    if (DefaultUrl) {
      setSettings((prev) => ({
        ...prev,
        urlContent: DefaultUrl,
      }))
      setUrlError(null)
    }
  }

  /**
   * Fetch prompt from URL
   */
  const handleFetchPrompt = async () => {
    await fetchPromptFromUrl(settings.urlContent, false)
  }

  /**
   * Fetch prompt from URL (shared logic)
   */
  const fetchPromptFromUrl = async (
    url: string,
    isPreview: boolean,
  ): Promise<void> => {
    if (!url.trim()) {
      setUrlError(i18n.t("errors.urlRequired"))
      return
    }

    setIsFetching(true)
    setFetchError(null)

    try {
      // Fetch with at least 1 second delay for better UX and to avoid rapid requests
      const [response] = await Promise.all([fetch(url), sleep(1000)])
      if (!response.ok) {
        throw new Error(
          i18n
            .t("errors.fetchFailed")
            .replace("$1", response.status.toString())
            .replace("$2", response.statusText),
        )
      }

      const contentType = response.headers.get("content-type") || ""
      // Allow only text content types
      if (!contentType.startsWith("text/")) {
        throw new Error(
          i18n.t("errors.notTextContent").replace("$1", contentType),
        )
      }

      const text = await response.text()
      setPreviewPrompt(text)

      // Clear cache to ensure consistency between preview and actual usage
      await improvePromptCacheService.clearCache()

      if (!isPreview) {
        // Show success feedback only for manual fetch
        setFetchError(null)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : i18n.t("errors.unknownError")
      if (!isPreview) {
        setFetchError(
          i18n.t("errors.fetchPromptFailed").replace("$1", errorMessage),
        )
      }
      console.error("Failed to fetch prompt from URL:", error)
    } finally {
      setIsFetching(false)
    }
  }

  /**
   * Validate inputs
   */
  const validate = (): boolean => {
    let isValid = true
    // Validate based on mode
    if (settings.mode === "url") {
      if (!settings.urlContent.trim()) {
        setUrlError(i18n.t("errors.urlRequired"))
        isValid = false
      } else {
        try {
          new URL(settings.urlContent)
          setUrlError(null)
        } catch {
          setUrlError(i18n.t("errors.invalidUrl"))
          isValid = false
        }
      }
    } else if (settings.mode === "text") {
      // Text mode validation is handled by checking if textContent is not empty
      // when saving, but we don't block save if empty (user might want to clear)
    }

    return isValid
  }

  /**
   * Save settings
   */
  const handleSave = async () => {
    if (!validate()) {
      return
    }

    try {
      // Save system prompt settings
      await improvePromptSettingsStorage.setValue(settings)

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setFetchError(
        `Failed to save settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
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
          {/* Improvement Prompt Settings */}
          <div className="space-y-3">
            <label className="text-base font-semibold inline-block">
              {i18n.t("settings.promptImprover.improvementPromptSettings")}
            </label>

            <RadioGroup
              value={settings.mode}
              onValueChange={(value: ImprovePromptInputMethod) =>
                handleModeChange(value)
              }
              className="gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={ImprovePromptInputMethod.URL}
                  id="mode-url"
                />
                <label
                  htmlFor="mode-url"
                  className="text-sm font-normal cursor-pointer"
                >
                  {i18n.t("settings.promptImprover.modeUrl")}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={ImprovePromptInputMethod.Text}
                  id="mode-text"
                />
                <label
                  htmlFor="mode-text"
                  className="text-sm font-normal cursor-pointer"
                >
                  {i18n.t("settings.promptImprover.modeText")}
                </label>
              </div>
            </RadioGroup>

            {/* Conditional display area */}
            <div className="space-y-2">
              {settings.mode === "text" ? (
                <div className="space-y-2">
                  <label htmlFor="text-content" className="text-sm font-medium">
                    {i18n.t("settings.promptImprover.improvementPromptText")}
                  </label>
                  <Textarea
                    id="text-content"
                    value={settings.textContent}
                    onChange={(e) => handleTextContentChange(e.target.value)}
                    placeholder={i18n.t(
                      "settings.promptImprover.enterImprovementPrompt",
                    )}
                    rows={6}
                    className="max-h-60 font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <label
                      htmlFor="url-content"
                      className="text-sm font-medium"
                    >
                      {i18n.t("settings.promptImprover.promptUrl")}
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-4 stroke-neutral-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {i18n.t("tooltips.urlModeDescription")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="url-content"
                      type="url"
                      value={settings.urlContent}
                      onChange={(e) => handleUrlContentChange(e.target.value)}
                      placeholder={i18n.t(
                        "settings.promptImprover.enterPromptUrl",
                      )}
                      className={urlError ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchPrompt}
                      disabled={isFetching || !settings.urlContent.trim()}
                    >
                      {isFetching
                        ? i18n.t("settings.promptImprover.fetching")
                        : i18n.t("settings.promptImprover.fetchPrompt")}
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-sm text-destructive">{urlError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {DefaultUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSetDefaultUrl}
                        className="ml-auto text-xs h-auto py-1"
                      >
                        {i18n.t("settings.promptImprover.setDefault")}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Preview (URL mode only) */}
              {settings.mode === "url" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {i18n.t("settings.promptImprover.preview")}
                  </label>
                  <Textarea
                    value={previewPrompt}
                    readOnly
                    placeholder={i18n.t(
                      "settings.promptImprover.previewPlaceholder",
                    )}
                    rows={6}
                    className="bg-muted/50 font-mono text-xs md:text-xs max-h-60"
                  />
                </div>
              )}
            </div>

            {/* Fetch error display */}
            {fetchError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{fetchError}</span>
              </div>
            )}
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
