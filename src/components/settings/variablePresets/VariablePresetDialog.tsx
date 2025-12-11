import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

    try {
      await saveVariablePreset(newPreset)
      await loadPresets()
      setSelectedPreset(newPreset)
    } catch (error) {
      console.error("Failed to add preset:", error)
    }
  }, [loadPresets])

  /**
   * Handle preset change (auto-save with debounce)
   */
  const handlePresetChange = useCallback(
    async (updatedPreset: VariablePreset) => {
      try {
        await saveVariablePreset(updatedPreset)
        await loadPresets()
        setSelectedPreset(updatedPreset)
      } catch (error) {
        console.error("Failed to save preset:", error)
      }
    },
    [loadPresets],
  )

  /**
   * Handle duplicate preset
   */
  const handleDuplicatePreset = useCallback(async () => {
    if (!selectedPreset) return

    try {
      const duplicated = await duplicateVariablePreset(selectedPreset.id)
      await loadPresets()
      setSelectedPreset(duplicated)
    } catch (error) {
      console.error("Failed to duplicate preset:", error)
    }
  }, [selectedPreset, loadPresets])

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

      // Delete preset (this will also convert affected prompts to text type)
      await deleteVariablePreset(selectedPreset.id)

      // Reload presets and clear selection
      await loadPresets()
      setSelectedPreset(null)
    } catch (error) {
      console.error("Failed to delete preset:", error)
    }
  }, [selectedPreset, loadPresets])

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
          className="w-full sm:max-w-6xl h-[80vh] flex flex-col"
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
          <div className="grid grid-cols-3 gap-6 py-2 flex-1 min-h-0">
            {/* Left column: Preset list */}
            <div className="col-span-1 flex flex-col">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
