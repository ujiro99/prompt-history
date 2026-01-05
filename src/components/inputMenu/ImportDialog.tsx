import React, { useState, useRef, useCallback } from "react"
import {
  CheckCircle,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  FileText,
  Loader2,
  Upload,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollAreaWithGradient } from "@/components/shared/ScrollAreaWithGradient"
import { useContainer } from "@/hooks/useContainer"
import { promptImportService } from "@/services/importExport"
import type { ImportResult } from "@/services/importExport/types"
import { TestIds } from "@/components/const"
import { ImportError } from "@/services/importExport/ImportError"
import { i18n } from "#imports"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: (result: ImportResult) => void
}

enum ImportState {
  Idle = "idle",
  Checking = "checking",
  Importing = "importing",
  Success = "success",
  Error = "error",
}

export function ImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportDialogProps): React.ReactElement {
  const { container } = useContainer()
  const [state, setState] = useState<ImportState>(ImportState.Idle)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const missingPressetIds = new Set(
    result?.missingPresets?.map((info) => info.presetId) ?? [],
  )
  const handleReset = useCallback(() => {
    setState(ImportState.Idle)
    setError(null)
    setResult(null)
    setSelectedFile(null)
    setIsDragging(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onOpenChange(false)
  }, [handleReset, onOpenChange])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const checkFile = useCallback(async (file: File) => {
    setSelectedFile(file)
    setState(ImportState.Checking)
    setError(null)

    try {
      const importResult = await promptImportService.checkCSVFile(file)
      setResult(importResult)
    } catch (err) {
      const errorMessage =
        err instanceof ImportError
          ? err.message
          : err instanceof Error
            ? err.message
            : i18n.t("importDialog.error.unknown")
      setError(errorMessage)
      setState(ImportState.Error)
    }
  }, [])

  const importFile = useCallback(async () => {
    if (!selectedFile) return
    setState(ImportState.Importing)
    setError(null)

    try {
      const importResult = await promptImportService.processFile(selectedFile)
      setResult(importResult)
      setState(ImportState.Success)
      onImportComplete?.(importResult)
    } catch (err) {
      const errorMessage =
        err instanceof ImportError
          ? err.message
          : err instanceof Error
            ? err.message
            : i18n.t("importDialog.error.unknown")
      setError(errorMessage)
      setState(ImportState.Error)
    }
  }, [onImportComplete, selectedFile])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      await checkFile(file)
    },
    [checkFile],
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      if (state !== ImportState.Idle) return

      const file = event.dataTransfer.files?.[0]
      if (!file) return

      // Check if the file is a CSV
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError(i18n.t("importDialog.error.selectCsv"))
        setState(ImportState.Error)
        return
      }

      await checkFile(file)
    },
    [checkFile, state],
  )

  const getStatusIcon = () => {
    switch (state) {
      case ImportState.Checking:
        return <CircleCheckBig className="text-neutral-700" size={20} />
      case ImportState.Importing:
        return <Loader2 className="animate-spin" size={20} />
      case ImportState.Success:
        return <CheckCircle className="text-green-600" size={20} />
      case ImportState.Error:
        return <CircleX className="text-red-700" size={20} />
      default:
        return <Upload size={20} />
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case ImportState.Success:
        return "text-green-600"
      case ImportState.Error:
        return "text-red-700"
      default:
        return "text-neutral-600"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        data-testid={TestIds.import.dialog}
        container={container}
        onWheel={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            {i18n.t("importDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {i18n.t("importDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            data-testid={TestIds.import.fileInput}
            aria-label={i18n.t("importDialog.selectFileLabel")}
            aria-hidden={true}
          />

          {/* File selection area */}
          {(state === ImportState.Idle || state === ImportState.Error) && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                state === ImportState.Idle
                  ? "border-neutral-300 hover:border-neutral-400"
                  : "border-neutral-200",
                isDragging &&
                  state === ImportState.Idle &&
                  "border-blue-400 bg-blue-50",
              )}
              role="region"
              aria-label="ファイル選択エリア"
              aria-describedby="file-status-text"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                {getStatusIcon()}
                <div className="space-y-2">
                  <p
                    id="file-status-text"
                    className={cn("font-medium", getStatusColor())}
                  >
                    {state === ImportState.Idle && (
                      <span>{i18n.t("importDialog.status.idle")}</span>
                    )}
                    {state === ImportState.Error && (
                      <span>{i18n.t("importDialog.status.errorPrompt")}</span>
                    )}
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-neutral-500 flex items-center justify-center gap-1">
                      <FileText size={14} />
                      {selectedFile.name}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleFileSelect}
                  variant="outline"
                  size="sm"
                  data-testid={TestIds.import.selectButton}
                  aria-describedby="file-status-text"
                  aria-label={i18n.t("importDialog.selectFileLabel")}
                >
                  {i18n.t("importDialog.selectFile")}
                </Button>
              </div>
            </div>
          )}

          {/* Checking */}
          {state === ImportState.Checking && result == null && (
            <div
              className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 space-y-2"
              role="status"
              aria-label={i18n.t("importDialog.status.checking")}
            >
              <h4
                className="font-medium text-neutral-800 flex flex-col items-center gap-2"
                id="file-status-text"
              >
                <Loader2 className="animate-spin" size={20} />
                {i18n.t("importDialog.status.checking")}
              </h4>
              {selectedFile && (
                <p className="text-sm text-neutral-500 flex items-center justify-center gap-1">
                  <FileText size={14} />
                  {selectedFile.name}
                </p>
              )}
              <div className="text-sm text-center space-y-1">
                <p>{i18n.t("importDialog.status.checkingDescription")}</p>
              </div>
            </div>
          )}

          {/* Checking result */}
          {state === ImportState.Checking && result && (
            <div
              className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 space-y-2"
              role="status"
              aria-label={i18n.t("importDialog.status.checkOk")}
            >
              <h4
                className="font-medium text-neutral-800 flex flex-col items-center gap-2"
                id="file-status-text"
              >
                {getStatusIcon()}
                {i18n.t("importDialog.status.checkOk")}
              </h4>
              {selectedFile && (
                <p className="text-sm text-neutral-500 flex items-center justify-center gap-1">
                  <FileText size={14} />
                  {selectedFile.name}
                </p>
              )}
              <div className="text-sm text-center space-y-1">
                {result.imported > 0 ? (
                  <p
                    className="text-green-700"
                    data-testid={TestIds.import.ui.willImport}
                  >
                    {i18n.t("importDialog.result.willImport", [
                      result.imported,
                    ])}
                  </p>
                ) : (
                  <p data-testid={TestIds.import.ui.noPrompts}>
                    {i18n.t("importDialog.result.noPrompts")}
                  </p>
                )}
                {result.duplicates > 0 && (
                  <p data-testid={TestIds.import.ui.duplicate}>
                    {i18n.t("importDialog.result.hasDuplicates", [
                      result.duplicates,
                    ])}
                  </p>
                )}
                {result.missingPresets && result.missingPresets.length > 0 && (
                  <p
                    className="text-yellow-600"
                    data-testid={TestIds.import.ui.missingPresets}
                  >
                    <CircleAlert className="inline mb-1 mr-1 size-4" />
                    {i18n.t("importDialog.result.hasMissingPresets", [
                      missingPressetIds.size,
                    ])}
                  </p>
                )}

                {result.imported > 0 && (
                  <div className="mt-4 mb-2 flex justify-center">
                    <Button
                      onClick={importFile}
                      size="sm"
                      data-testid={TestIds.import.executeButton}
                      aria-describedby="file-status-text"
                      aria-label={i18n.t("importDialog.executeLabel")}
                    >
                      {i18n.t("importDialog.execute")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success result */}
          {state === ImportState.Success && result && (
            <div
              className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-2"
              role="status"
              aria-label={i18n.t("importDialog.status.importResult")}
            >
              <h4
                className="font-medium text-neutral-800 flex flex-col items-center gap-2"
                id="file-status-text"
              >
                {getStatusIcon()}
                {i18n.t("importDialog.status.importResult")}
              </h4>
              {selectedFile && (
                <p className="text-sm text-neutral-500 flex items-center justify-center gap-1">
                  <FileText size={14} />
                  {selectedFile.name}
                </p>
              )}
              <div className="text-sm text-center text-green-700 space-y-1">
                <p data-testid={TestIds.import.ui.imported}>
                  {i18n.t("importDialog.result.imported", [result.imported])}
                </p>
                {result.duplicates > 0 && (
                  <p data-testid={TestIds.import.ui.duplicate}>
                    {i18n.t("importDialog.result.skippedDuplicates", [
                      result.duplicates,
                    ])}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Varidation result */}
          {/* Missing presets warning */}
          {result &&
            result.missingPresets &&
            result.missingPresets.length > 0 && (
              <div
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                role="alert"
                aria-label={i18n.t("variablePresets.importWarning.title")}
              >
                <h4 className="text-base text-yellow-700 mb-2">
                  <CircleAlert className="inline mb-1 mr-1 size-4" />
                  {state === ImportState.Success
                    ? i18n.t("variablePresets.importWarning.convertedToText", [
                        result.missingPresets.length,
                      ])
                    : i18n.t(
                        "variablePresets.importWarning.check.convertedToText",
                        [result.missingPresets.length],
                      )}
                </h4>
                <ScrollAreaWithGradient
                  className="max-h-40"
                  indicatorVisible={false}
                  gradientHeight={"1.5rem"}
                  style={
                    {
                      "--ph-gradient-background": "#fefce8",
                    } as React.CSSProperties
                  }
                >
                  <ul className="space-y-1 pl-1">
                    {result.missingPresets.map((info, index) => (
                      <li
                        key={`${info.promptName}-${info.variableName}-${index}`}
                        className="text-xs text-yellow-700 list-disc list-inside"
                      >
                        {i18n.t(
                          "variablePresets.importWarning.affectedVariable",
                          [info.promptName, info.variableName],
                        )}
                      </li>
                    ))}
                  </ul>
                </ScrollAreaWithGradient>
              </div>
            )}

          {/* Error message */}
          {state === ImportState.Error && error && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              role="alert"
              aria-label={i18n.t("importDialog.status.errorTitle")}
            >
              <h4 className="font-medium text-red-700 mb-2">
                {i18n.t("importDialog.status.errorTitle")}
              </h4>
              <ScrollAreaWithGradient className="max-h-100">
                <p
                  className="text-sm text-red-700 whitespace-pre-line"
                  data-testid={TestIds.import.ui.errors}
                >
                  {error}
                </p>
              </ScrollAreaWithGradient>
            </div>
          )}
        </div>

        <DialogFooter>
          {state === ImportState.Importing ? (
            <Button
              disabled
              aria-label={i18n.t("importDialog.status.importing")}
              aria-describedby="file-status-text"
            >
              <Loader2 className="animate-spin mr-2" size={16} />
              {i18n.t("importDialog.status.importing")}
            </Button>
          ) : (
            <div className="flex gap-2">
              {(state === ImportState.Checking ||
                state === ImportState.Success) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid={TestIds.import.resetButton}
                  aria-label={i18n.t("importDialog.selectAnotherFile")}
                >
                  {i18n.t("importDialog.selectAnotherFile")}
                </Button>
              )}
              <Button
                onClick={handleClose}
                data-testid={TestIds.import.closeButton}
                aria-label={
                  state === ImportState.Success
                    ? i18n.t("importDialog.close")
                    : i18n.t("importDialog.cancel")
                }
              >
                {state === ImportState.Success
                  ? i18n.t("importDialog.close")
                  : i18n.t("importDialog.cancel")}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
