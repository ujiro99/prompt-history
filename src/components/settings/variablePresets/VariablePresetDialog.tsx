import { useState, useEffect, useCallback, useRef } from "react"
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
import { useContainer } from "@/hooks/useContainer"
import { VariablePresetList } from "./VariablePresetList"
import { VariablePresetEditor } from "./VariablePresetEditor"
import type { VariablePreset } from "@/types/prompt"
import {
  getVariablePresets,
  saveVariablePreset,
  deleteVariablePreset,
  duplicateVariablePreset,
  findPromptsByPresetId,
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
      type: "textarea",
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
      // Update local state immediately for responsive UI
      setSelectedPreset(updatedPreset)

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
  const handleDeletePreset = useCallback(async () => {
    if (!selectedPreset) return

    try {
      // Find affected prompts
      const affectedPrompts = await findPromptsByPresetId(selectedPreset.id)

      // Build confirmation message
      let message = i18n.t("variablePresets.deleteConfirm.message")
      if (affectedPrompts.length > 0) {
        message = i18n.t(
          "variablePresets.deleteConfirm.affectedPrompts",
          affectedPrompts.length,
        )
        message +=
          "\n\n" +
          i18n.t("variablePresets.deleteConfirm.affectedPromptsList") +
          ":\n"
        message += affectedPrompts.map((p) => `- ${p.name}`).join("\n")
      }

      // Show confirmation
      if (!window.confirm(message)) {
        return
      }

      startSaving()
      // Delete preset (this will also convert affected prompts to text type)
      await deleteVariablePreset(selectedPreset.id)

      // Reload presets and clear selection
      await loadPresets()
      setSelectedPreset(null)
    } catch (error) {
      console.error("Failed to delete preset:", error)
    } finally {
      stopSaving()
    }
  }, [selectedPreset, loadPresets, startSaving, stopSaving])

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Prevent propagation to avoid unwanted side effects on AI service input
    event.persist()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

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
              />
            </div>

            {/* Right column: Preset editor */}
            <div className="col-span-2 flex flex-col border-l min-h-0">
              <VariablePresetEditor
                preset={selectedPreset}
                onChange={handlePresetChange}
                onDuplicate={handleDuplicatePreset}
                onDelete={handleDeletePreset}
              />
            </div>
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
    </>
  )
}
