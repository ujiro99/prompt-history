import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Download, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import { useContainer } from "@/hooks/useContainer"
import { VariablePresetList } from "./VariablePresetList"
import { VariablePresetEditor } from "./VariablePresetEditor"
import type { Prompt, VariablePreset } from "@/types/prompt"
import {
  getVariablePresets,
  saveVariablePreset,
  deleteVariablePreset,
  duplicateVariablePreset,
  findPromptsByPresetId,
  exportVariablePresets,
  importVariablePresets,
} from "@/services/storage/variablePresetStorage"
import { generatePromptId } from "@/utils/idGenerator"
import { stopPropagation } from "@/utils/dom"
import { i18n } from "#imports"

/**
 * Props for VariablePresetDialog
 */
interface VariablePresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Variable Preset Dialog Component
 * Main dialog for managing variable presets with two-column layout
 */
export const VariablePresetDialog: React.FC<VariablePresetDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { container } = useContainer()
  const [presets, setPresets] = useState<VariablePreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<VariablePreset | null>(
    null,
  )

  // For saving state control
  const [isSaving, setIsSaving] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // For validation state control
  const [hasValidationErrors, setHasValidationErrors] = useState(false)

  // For remove dialog
  const [removePresetId, setRemovePresetId] = useState<string | null>(null)
  const [affectedPrompts, setAffectedPrompts] = useState<Prompt[] | null>(null)

  /**
   * Load all presets from storage
   */
  const loadPresets = useCallback(async () => {
    try {
      const loadedPresets = await getVariablePresets()
      setPresets(loadedPresets)
    } catch (error) {
      console.error("Failed to load presets:", error)
    }
  }, [])

  /**
   * Load presets when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadPresets()
    }
  }, [open, loadPresets])

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const startSaving = useCallback(() => {
    // Clear any pending debounced saves
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setIsSaving(true)
  }, [])

  const stopSaving = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current)
      delayTimerRef.current = null
    }
    // Artificial delay to avoid flicker
    delayTimerRef.current = setTimeout(() => {
      setIsSaving(false)
    }, 600)
  }, [])

  /**
   * Common save preset logic
   */
  const savePresetInternal = useCallback(
    async (preset: VariablePreset) => {
      try {
        await saveVariablePreset(preset)
        await loadPresets()
        setSelectedPreset(preset)
      } catch (error) {
        console.error("Failed to save preset:", error)
        throw error
      }
    },
    [loadPresets],
  )

  /**
   * Save preset immediately (without debounce)
   */
  const savePresetImmediate = useCallback(
    async (preset: VariablePreset) => {
      startSaving()
      try {
        await savePresetInternal(preset)
      } finally {
        stopSaving()
      }
    },
    [savePresetInternal, startSaving, stopSaving],
  )

  /**
   * Handle preset selection
   */
  const handleSelectPreset = useCallback((preset: VariablePreset) => {
    setSelectedPreset(preset)
  }, [])

  /**
   * Handle add new preset
   */
  const handleAddPreset = useCallback(async () => {
    const newPreset: VariablePreset = {
      id: generatePromptId(),
      name: "",
      type: "text",
      description: "",
      textContent: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await savePresetImmediate(newPreset)
  }, [savePresetImmediate])

  /**
   * Handle preset change (auto-save with debounce)
   */
  const handlePresetChange = useCallback(
    (updatedPreset: VariablePreset) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // Set new timer for debounced save
      debounceTimerRef.current = setTimeout(async () => {
        setIsSaving(true) // debounced
        try {
          await savePresetInternal(updatedPreset)
        } catch (error) {
          console.error("Failed to save preset:", error)
        } finally {
          stopSaving()
          debounceTimerRef.current = null
        }
      }, 400)
    },
    [savePresetInternal, stopSaving],
  )

  /**
   * Handle validation state change from editor
   */
  const handleValidationChange = useCallback((hasErrors: boolean) => {
    setHasValidationErrors(hasErrors)
  }, [])

  /**
   * Handle duplicate preset
   */
  const handleDuplicatePreset = useCallback(async () => {
    if (!selectedPreset) return
    startSaving()

    try {
      const duplicated = await duplicateVariablePreset(selectedPreset.id)
      await loadPresets()
      setSelectedPreset(duplicated)
    } catch (error) {
      console.error("Failed to duplicate preset:", error)
    } finally {
      stopSaving()
    }
  }, [selectedPreset, loadPresets, startSaving, stopSaving])

  /**
   * Handle delete preset
   */
  const handleOnDelete = useCallback(async () => {
    if (!selectedPreset) return

    try {
      // Find affected prompts
      const affectedPrompts = await findPromptsByPresetId(selectedPreset.id)

      // Show confirmation
      setAffectedPrompts(affectedPrompts)
      setRemovePresetId(selectedPreset.id)
    } catch (error) {
      console.error("Failed to delete preset:", error)
    }
  }, [selectedPreset])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!removePresetId) return

    try {
      startSaving()

      // Delete preset (this will also convert affected prompts to text type)
      await deleteVariablePreset(removePresetId)

      // Reload presets and clear selection
      await loadPresets()
      setSelectedPreset(null)
    } catch (error) {
      console.error("Failed to delete preset:", error)
    } finally {
      stopSaving()
    }
  }, [removePresetId, loadPresets, startSaving, stopSaving])

  /**
   * Handle export all presets
   */
  const handleExport = useCallback(async () => {
    try {
      if (presets.length === 0) {
        return
      }

      const presetIds = presets.map((p) => p.id)
      const jsonData = await exportVariablePresets(presetIds)

      // Create download link
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `variable-presets-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export presets:", error)
      alert(i18n.t("variablePresets.exportDialog.error"))
    }
  }, [presets])

  /**
   * Handle import presets
   */
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()

        // Validate JSON format
        try {
          JSON.parse(text)
        } catch {
          alert(i18n.t("variablePresets.importDialog.invalidFile"))
          return
        }

        // Ask for import mode
        const merge = confirm(
          i18n.t("variablePresets.importDialog.mergeDescription") +
            "\n\n" +
            i18n.t("variablePresets.importDialog.merge") +
            ": OK\n" +
            i18n.t("variablePresets.importDialog.replace") +
            ": Cancel",
        )
        const mode = merge ? "merge" : "replace"

        startSaving()
        const count = await importVariablePresets(text, mode)
        await loadPresets()

        alert(i18n.t("variablePresets.importDialog.imported", [count]))
      } catch (error) {
        console.error("Failed to import presets:", error)
        alert(i18n.t("variablePresets.importDialog.error"))
      } finally {
        stopSaving()
        // Reset file input
        event.target.value = ""
      }
    },
    [loadPresets, startSaving, stopSaving],
  )

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Prevent propagation to avoid unwanted side effects on AI service input
    event.persist()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  const handleSavButtonClick = useCallback(async () => {
    if (selectedPreset) {
      await savePresetImmediate(selectedPreset)
    }
    onOpenChange(false)
  }, [selectedPreset, savePresetImmediate, onOpenChange])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          container={container}
          className="w-full sm:max-w-4xl h-[80vh] flex flex-col"
          onKeyDown={handleKeyDown}
          {...stopPropagation()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{i18n.t("variablePresets.title")}</DialogTitle>
                <DialogDescription>
                  {i18n.t("variablePresets.description")}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={presets.length === 0 || isSaving}
                  title={i18n.t("variablePresets.export")}
                >
                  <Download className="size-4" />
                </Button>
                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    title={i18n.t("variablePresets.import")}
                    asChild
                  >
                    <span>
                      <Upload className="size-4" />
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </DialogHeader>

          {/* Two-column layout */}
          <div className="grid grid-cols-3 gap-2 py-2 flex-1 min-h-0">
            {/* Left column: Preset list */}
            <div className="col-span-1 flex flex-col min-h-0">
              <VariablePresetList
                presets={presets}
                selectedId={selectedPreset?.id || null}
                onSelect={handleSelectPreset}
                onAdd={handleAddPreset}
              />
            </div>

            {/* Right column: Preset editor */}
            <div className="col-span-2 flex flex-col border-l min-h-0">
              <VariablePresetEditor
                preset={selectedPreset}
                allPresets={presets}
                onChange={handlePresetChange}
                onDuplicate={handleDuplicatePreset}
                onDelete={handleOnDelete}
                onValidationChange={handleValidationChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSavButtonClick}
              disabled={isSaving || hasValidationErrors}
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
      {/* Remove Preset Dialog */}
      <RemoveDialog
        open={removePresetId !== null}
        onOpenChange={(val) => setRemovePresetId(val ? removePresetId : null)}
        title={i18n.t("variablePresets.deleteConfirm.title")}
        description={i18n.t("variablePresets.deleteConfirm.message")}
        onRemove={() => handleDeleteConfirmed()}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-base break-all">{selectedPreset?.name}</span>
          {affectedPrompts && affectedPrompts.length > 0 && (
            <div>
              <p className="text-sm">
                {i18n.t("variablePresets.deleteConfirm.affectedPrompts", [
                  affectedPrompts.length,
                ])}
              </p>
              <ul className="list-disc text-xs break-all mt-2 max-h-40 overflow-y-auto border p-2 pl-6 rounded bg-muted">
                {affectedPrompts.map((prompt) => (
                  <li key={prompt.id}>{prompt.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </RemoveDialog>
    </>
  )
}
