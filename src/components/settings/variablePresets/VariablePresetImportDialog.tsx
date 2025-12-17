import { useState, useCallback } from "react"
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
import type { VariablePreset } from "@/types/prompt"
import { importVariablePresets } from "@/services/storage/variablePresetStorage"
import { i18n } from "#imports"

/**
 * Props for VariablePresetImportDialog
 */
interface VariablePresetImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presets: VariablePreset[]
  fileInputEvent: React.ChangeEvent<HTMLInputElement> | null
  onImportComplete: () => Promise<void>
}

type ImportDialogMode = "select" | "error" | "success"

interface ImportDialogState {
  mode: ImportDialogMode
  fileText?: string
  errorMessage?: string
  successMessage?: string
  importedPresets?: VariablePreset[]
}

/**
 * Variable Preset Import Dialog Component
 * Handles the import flow with mode selection and preview
 */
export const VariablePresetImportDialog: React.FC<
  VariablePresetImportDialogProps
> = ({ open, onOpenChange, presets, fileInputEvent, onImportComplete }) => {
  const { container } = useContainer()
  const [dialogState, setDialogState] = useState<ImportDialogState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  /**
   * Process file input when dialog opens
   */
  const processFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()

        // Validate JSON format
        let importedPresets: VariablePreset[]
        try {
          importedPresets = JSON.parse(text)
          if (!Array.isArray(importedPresets)) {
            throw new Error("Expected an array")
          }
        } catch {
          setDialogState({
            mode: "error",
            errorMessage: i18n.t("variablePresets.importDialog.invalidFile"),
          })
          return
        }

        // Show import mode selection dialog
        setDialogState({
          mode: "select",
          fileText: text,
          importedPresets,
        })
      } catch (error) {
        console.error("Failed to read import file:", error)
        setDialogState({
          mode: "error",
          errorMessage: i18n.t("variablePresets.importDialog.error"),
        })
      }
    },
    [],
  )

  /**
   * Handle import mode selection
   */
  const handleImportConfirmed = useCallback(
    async (mode: "merge" | "replace") => {
      if (!dialogState || !dialogState.fileText) return

      const { fileText } = dialogState

      try {
        setIsSaving(true)
        const count = await importVariablePresets(fileText, mode)
        await onImportComplete()

        setDialogState({
          mode: "success",
          successMessage: i18n.t("variablePresets.importDialog.imported", [
            count,
          ]),
        })
      } catch (error) {
        console.error("Failed to import presets:", error)
        setDialogState({
          mode: "error",
          errorMessage: i18n.t("variablePresets.importDialog.error"),
        })
      } finally {
        setIsSaving(false)
      }
    },
    [dialogState, onImportComplete],
  )

  /**
   * Handle dialog close
   */
  const handleClose = useCallback(() => {
    if (fileInputEvent) {
      fileInputEvent.target.value = ""
    }
    setDialogState(null)
    onOpenChange(false)
  }, [fileInputEvent, onOpenChange])

  /**
   * Process file when dialog opens
   */
  if (open && !dialogState && fileInputEvent) {
    processFileInput(fileInputEvent)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent container={container} className="sm:max-w-xl">
        {dialogState?.mode === "select" &&
          (() => {
            const importedPresets = dialogState.importedPresets || []
            const existingIds = new Set(presets.map((p) => p.id))
            const newCount = importedPresets.filter(
              (p) => !existingIds.has(p.id),
            ).length
            const overwriteCount = importedPresets.filter((p) =>
              existingIds.has(p.id),
            ).length
            const mergeTotal = presets.length + newCount
            const replaceTotal = importedPresets.length

            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {i18n.t("variablePresets.importDialog.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {i18n.t("variablePresets.importDialog.selectMode")}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                  <div className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors">
                    <Button
                      onClick={() => handleImportConfirmed("merge")}
                      disabled={isSaving}
                      variant="ghost"
                      className="w-full h-auto flex flex-col items-start gap-2 p-0"
                    >
                      <div className="font-semibold text-base">
                        {i18n.t("variablePresets.importDialog.add")}
                      </div>
                      <div className="text-sm text-muted-foreground text-left space-y-1">
                        <div className="break-all whitespace-normal">
                          {i18n.t(
                            "variablePresets.importDialog.addDescription",
                          )}
                        </div>
                        <div className="text-xs space-y-0.5 mt-2">
                          <div>
                            {i18n.t(
                              "variablePresets.importDialog.currentCount",
                              [presets.length],
                            )}
                          </div>
                          <div>
                            <span>
                              {i18n.t(
                                "variablePresets.importDialog.importCount",
                                [importedPresets.length],
                              )}
                            </span>
                            {overwriteCount > 0 && (
                              <span className="ml-2">
                                {i18n.t(
                                  "variablePresets.importDialog.overwriteCount",
                                  [overwriteCount],
                                )}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold">
                            {i18n.t("variablePresets.importDialog.totalAfter", [
                              mergeTotal,
                            ])}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors">
                    <Button
                      onClick={() => handleImportConfirmed("replace")}
                      disabled={isSaving}
                      variant="ghost"
                      className="w-full h-auto flex flex-col items-start gap-2 p-0"
                    >
                      <div className="font-semibold text-base">
                        {i18n.t("variablePresets.importDialog.replaceAll")}
                      </div>
                      <div className="text-sm text-muted-foreground text-left space-y-1">
                        <div className="break-all whitespace-normal">
                          {i18n.t(
                            "variablePresets.importDialog.replaceDescription",
                          )}
                        </div>
                        <div className="text-xs space-y-0.5 mt-2">
                          <div>
                            {i18n.t(
                              "variablePresets.importDialog.currentCount",
                              [presets.length],
                            )}
                          </div>
                          <div>
                            {i18n.t(
                              "variablePresets.importDialog.importCount",
                              [importedPresets.length],
                            )}
                          </div>
                          <div className="font-semibold">
                            {i18n.t("variablePresets.importDialog.totalAfter", [
                              replaceTotal,
                            ])}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleClose}
                    disabled={isSaving}
                    variant="secondary"
                  >
                    {i18n.t("buttons.cancel")}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        {dialogState?.mode === "error" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {i18n.t("variablePresets.importDialog.errorTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-destructive">
                {dialogState.errorMessage}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{i18n.t("buttons.close")}</Button>
            </DialogFooter>
          </>
        )}
        {dialogState?.mode === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {i18n.t("variablePresets.importDialog.successTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm">{dialogState.successMessage}</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{i18n.t("buttons.close")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
