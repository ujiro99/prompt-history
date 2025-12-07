import { useState, useEffect } from "react"
import { AlertCircle, Info, RefreshCw } from "lucide-react"
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
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { ApiKeyWarningBanner } from "@/components/shared/ApiKeyWarningBanner"
import { useContainer } from "@/hooks/useContainer"
import { useAiModel } from "@/hooks/useAiModel"
import { useLazyStorage } from "@/hooks/useLazyStorage"
import { improvePromptSettingsStorage } from "@/services/storage/definitions"
import { improvePromptCacheService } from "@/services/storage/improvePromptCache"
import { ImprovePromptInputMethod } from "@/types/prompt"
import { i18n } from "#imports"
import { sleep } from "@/lib/utils"
import { stopPropagation } from "@/utils/dom"
import type { ImprovePromptSettings } from "@/types/prompt"

/**
 * Props for PromptImproverSettingsDialog
 */
interface PromptImproverSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClickModelSettings: () => void
}

// Default URL from environment variable
const DefaultUrl = import.meta.env.WXT_IMPROVE_PROMPT_URL || ""

/**
 * Prompt Improver Settings Dialog Component
 */
export const PromptImproverSettingsDialog: React.FC<
  PromptImproverSettingsDialogProps
> = ({ open, onOpenChange, onClickModelSettings }) => {
  const { container } = useContainer()
  const { genaiApiKey } = useAiModel()

  const {
    value: settings,
    setValue: _setSettings,
    isLoading,
    isSaving,
  } = useLazyStorage(improvePromptSettingsStorage, {
    debounceDelay: 400,
    artificialSetDelay: 600,
  })

  // Preview and fetch states
  const [previewPrompt, setPreviewPrompt] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Validation states
  const [urlError, setUrlError] = useState<string | null>(null)

  // API key state
  const hasApiKey = !!genaiApiKey

  /**
   * Initialize settings on load
   */
  useEffect(() => {
    if (isLoading) {
      const initSettings = async () => {
        try {
          if (!settings) return
          // Load preview based on mode
          if (settings.mode === "text" && settings.textContent) {
            setPreviewPrompt(settings.textContent)
          } else if (settings.mode === "url" && settings.urlContent) {
            // Try to fetch from URL for preview
            await fetchPromptFromUrl(settings.urlContent, true)
          }
        } catch (error) {
          console.error("Failed to load settings:", error)
        }
      }
      initSettings()
    }
  }, [isLoading, settings])

  /**
   * Validate inputs
   */
  const validate = (newSettings: ImprovePromptSettings): boolean => {
    let isValid = true
    if (!newSettings) return false
    // Validate based on mode
    if (newSettings.mode === "url") {
      if (!newSettings.urlContent.trim()) {
        setUrlError(i18n.t("errors.urlRequired"))
        isValid = false
      } else {
        try {
          new URL(newSettings.urlContent)
          setUrlError(null)
        } catch {
          setUrlError(i18n.t("errors.invalidUrl"))
          isValid = false
        }
      }
    } else if (newSettings.mode === "text") {
      // Text mode validation is handled by checking if textContent is not empty
      // when saving, but we don't block save if empty (user might want to clear)
    }

    return isValid
  }

  const setSettings = (
    updater: (prev: ImprovePromptSettings) => ImprovePromptSettings,
  ) => {
    _setSettings((prevVal: ImprovePromptSettings | null) => {
      if (!prevVal) return prevVal
      const newVal = updater(prevVal)
      validate(newVal)
      return newVal
    })
  }

  /**
   * Handle mode change
   */
  const handleModeChange = (mode: ImprovePromptInputMethod) => {
    setSettings((prev) => ({
      ...prev,
      mode,
    }))

    // Update preview when mode changes
    if (mode === "text" && settings?.textContent) {
      setPreviewPrompt(settings.textContent)
    } else if (mode === "url" && settings?.urlContent) {
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
  }

  /**
   * Set default URL
   */
  const handleSetDefaultUrl = () => {
    setSettings((prev) => ({
      ...prev,
      urlContent: DefaultUrl,
    }))
    setUrlError(null)
  }

  /**
   * Fetch prompt from URL
   */
  const handleFetchPrompt = async () => {
    if (!settings) return
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

  // Don't render until settings are loaded
  if (isLoading || !settings) return null

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
          <div className="space-y-4">
            <FieldSet>
              <FieldGroup>
                <FieldLabel>
                  {i18n.t("settings.promptImprover.improvementPromptSettings")}
                </FieldLabel>
                <RadioGroup
                  value={settings.mode}
                  onValueChange={(value: ImprovePromptInputMethod) =>
                    handleModeChange(value)
                  }
                  className="gap-2 flex flex-row"
                >
                  <FieldLabel htmlFor="mode-url" className="transition">
                    <Field orientation="horizontal">
                      <RadioGroupItem
                        value={ImprovePromptInputMethod.URL}
                        id="mode-url"
                      />
                      <FieldContent>
                        <FieldTitle>
                          {i18n.t("settings.promptImprover.modeUrl")}
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="mode-text" className="transition">
                    <Field orientation="horizontal">
                      <RadioGroupItem
                        value={ImprovePromptInputMethod.Text}
                        id="mode-text"
                      />
                      <FieldContent>
                        <FieldTitle>
                          {i18n.t("settings.promptImprover.modeText")}
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </FieldGroup>
            </FieldSet>

            <Separator />

            {/* Conditional display area */}
            <FieldSet className="min-h-45 gap-4">
              {settings.mode === "text" ? (
                <Field>
                  <FieldLabel htmlFor="text-content">
                    {i18n.t("settings.promptImprover.improvementPromptText")}
                  </FieldLabel>
                  <Textarea
                    id="text-content"
                    value={settings.textContent}
                    onChange={(e) => handleTextContentChange(e.target.value)}
                    placeholder={i18n.t(
                      "settings.promptImprover.enterImprovementPrompt",
                    )}
                    rows={6}
                    className="min-h-30 max-h-60 font-mono"
                  />
                </Field>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    <FieldLabel htmlFor="url-content">
                      {i18n.t("settings.promptImprover.promptUrl")}
                    </FieldLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-4 stroke-neutral-500" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {i18n.t("tooltips.urlModeDescription")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
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
                      {DefaultUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSetDefaultUrl}
                          className="w-auto text-xs h-auto px-2 py-1.5 absolute -right-1 -top-8"
                        >
                          {i18n.t("settings.promptImprover.setDefault")}
                        </Button>
                      )}
                    </div>
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
                </div>
              )}

              {/* Preview (URL mode only) */}
              {settings.mode === "url" && (
                <div className="space-y-3">
                  <FieldLabel htmlFor="preview-improvement-prompt">
                    {i18n.t("settings.promptImprover.preview")}
                  </FieldLabel>
                  <Textarea
                    id="preview-improvement-prompt"
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
            </FieldSet>

            {/* Fetch error display */}
            {fetchError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{fetchError}</span>
              </div>
            )}
          </div>

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
            onClick={handleCancel}
            disabled={isSaving || !!urlError}
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
