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
import { VariablePresetImportDialog } from "./VariablePresetImportDialog"
import type { Prompt, VariablePreset } from "@/types/prompt"
import {
  getVariablePresets,
  saveVariablePreset,
  deleteVariablePreset,
  duplicateVariablePreset,
  findPromptsByPresetId,
  exportVariablePresets,
  reorderVariablePresets,
} from "@/services/storage/variablePresetStorage"
import { generatePromptId } from "@/utils/idGenerator"
import { movePrev, moveNext } from "@/utils/array"
import { stopPropagation } from "@/utils/dom"
import { i18n } from "#imports"

/**
 * Props for VariablePresetDialog
 */
interface VariablePresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSelectedPresetId?: string | null
}

/**
 * Variable Preset Dialog Component
 * Main dialog for managing variable presets with two-column layout
 */
export const VariablePresetDialog: React.FC<VariablePresetDialogProps> = ({
  open,
  onOpenChange,
  initialSelectedPresetId,
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

  // For import dialog
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importFileInputEvent, setImportFileInputEvent] =
    useState<React.ChangeEvent<HTMLInputElement> | null>(null)

  /**
   * Load all presets from storage
   */
  const loadPresets = useCallback(async () => {
    try {
      const loadedPresets = await getVariablePresets()
      setPresets(loadedPresets)
      if (initialSelectedPresetId) {
        const preset = loadedPresets.find(
          (p) => p.id === initialSelectedPresetId,
        )
        setSelectedPreset(preset || null)
      }
    } catch (error) {
      console.error("Failed to load presets:", error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
   * Handle preset change (no display change)
   */
  const handleChangeBackground = useCallback(
    async (preset: VariablePreset) => {
      try {
        await saveVariablePreset(preset)
        await loadPresets()
      } catch (error) {
        console.error("Failed to save preset:", error)
        throw error
      }
    },
    [loadPresets],
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
      const csvData = await exportVariablePresets(presetIds)

      // Create download link
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `variable-presets-${new Date().toISOString().split("T")[0]}.csv`
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Open import dialog with file input event
      setImportFileInputEvent(event)
    },
    [],
  )

  /**
   * Handle import completion
   */
  const handleImportComplete = useCallback(async () => {
    await loadPresets()
  }, [loadPresets])

  /**
   * Handle reorder preset
   */
  const handleReorderPreset = useCallback(
    async (fromIndex: number, toIndex: number) => {
      let reorderedPresets = presets

      if (toIndex < fromIndex) {
        // Move up
        reorderedPresets = movePrev(presets, fromIndex)
      } else {
        // Move down
        reorderedPresets = moveNext(presets, fromIndex)
      }

      const newOrder = reorderedPresets.map((p) => p.id)

      startSaving()
      try {
        await reorderVariablePresets(newOrder)
        await loadPresets()
        // Selection follows the moved preset
      } catch (error) {
        console.error("Failed to reorder preset:", error)
      } finally {
        stopSaving()
      }
    },
    [presets, loadPresets, startSaving, stopSaving],
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
          tabIndex={undefined}
          onKeyDown={handleKeyDown}
          {...stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{i18n.t("variablePresets.title")}</DialogTitle>
            <DialogDescription>
              {i18n.t("variablePresets.description")}
            </DialogDescription>
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
                onReorder={handleReorderPreset}
              />
            </div>

            {/* Right column: Preset editor */}
            <div className="col-span-2 flex flex-col border-l min-h-0">
              <VariablePresetEditor
                preset={selectedPreset}
                allPresets={presets}
                onChange={handlePresetChange}
                onChangeBackground={handleChangeBackground}
                onDuplicate={handleDuplicatePreset}
                onDelete={handleOnDelete}
                onValidationChange={handleValidationChange}
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={presets.length === 0 || isSaving}
                title={i18n.t("variablePresets.export")}
              >
                <Download className="size-4" />
                {i18n.t("variablePresets.export")}
              </Button>
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isSaving}
                title={i18n.t("variablePresets.import")}
              >
                <Upload className="size-4" />
                {i18n.t("variablePresets.import")}
              </Button>
              <input
                id="variable-preset-import-input"
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
                ref={importInputRef}
              />
            </div>

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

      {/* Import Dialog */}
      <VariablePresetImportDialog
        open={importFileInputEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImportFileInputEvent(null)
          }
        }}
        presets={presets}
        fileInputEvent={importFileInputEvent}
        onImportComplete={handleImportComplete}
      />
    </>
  )
}
