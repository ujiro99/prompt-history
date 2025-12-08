/**
 * Organizer Preview Dialog Component
 * Two-column layout for previewing and editing template candidates
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { i18n } from "#imports"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Save, Trash, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useContainer } from "@/hooks/useContainer"
import { CategorySelector } from "./CategorySelector"
import { TemplateCandidateCard } from "./TemplateCandidateCard"
import { stopPropagation } from "@/utils/dom"
import { VariableSettingsSection } from "@/components/shared"
import { cn } from "@/lib/utils"
import type { TemplateCandidate } from "@/types/promptOrganizer"
import { StorageService } from "@/services/storage"
import { TestIds } from "@/components/const"

const TestId = TestIds.organizerPreviewDialog

interface OrganizerPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: TemplateCandidate[]
  onSave?: (templates: TemplateCandidate[]) => void
}

export const OrganizerPreviewDialog: React.FC<OrganizerPreviewDialogProps> = ({
  open,
  onOpenChange,
  templates,
  onSave,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [editedTemplates, setEditedTemplates] = useState([...templates])
  const [sourcePromptNames, setSourcePromptNames] = useState<
    Map<string, string>
  >(new Map())
  const { container } = useContainer()
  const selectedTemplate = editedTemplates[selectedIndex]
  const userAction = selectedTemplate?.userAction
  const userReviewedCount = editedTemplates.filter(
    (t) => t.userAction !== "pending",
  ).length
  const pendingCount = editedTemplates.filter(
    (t) => t.userAction === "pending",
  ).length
  const pendingIndexes = editedTemplates.reduce<number[]>((indexes, t, idx) => {
    if (t.userAction === "pending") {
      indexes.push(idx)
    }
    return indexes
  }, [])

  // For autoscroll
  const listItemRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const nextPendingIndex = useCallback(
    (currentIndex: number): number | null => {
      for (const idx of pendingIndexes) {
        if (idx > currentIndex) {
          return idx
        }
      }
      // If no next index, return the first pending index that is not the current index
      const idxs = pendingIndexes.filter((idx) => idx !== currentIndex)
      return idxs.length > 0 ? idxs[0] : null
    },
    [pendingIndexes],
  )

  /**
   * Update selected template
   */
  const updateTemplate = useCallback(
    (updates: Partial<TemplateCandidate>) => {
      const updated = [...editedTemplates]
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        ...updates,
      }
      setEditedTemplates(updated)
    },
    [editedTemplates, selectedIndex],
  )

  const handleVariableChange = useCallback(
    (vars: TemplateCandidate["variables"]) => {
      updateTemplate({ variables: vars })
    },
    [updateTemplate],
  )

  /**
   * Handle discard action
   */
  const handleDiscard = () => {
    updateTemplate({ userAction: "discard" })
    setSelectedIndex((prevIndex) => nextPendingIndex(prevIndex) ?? -1)
  }

  /**
   * Handle save action
   */
  const handleSave = () => {
    updateTemplate({ userAction: "save" })
    setSelectedIndex((prevIndex) => nextPendingIndex(prevIndex) ?? -1)
  }

  /**
   * Handle save and pin action
   */
  const handleSaveAndPin = () => {
    updateTemplate({ userAction: "save_and_pin" })
    setSelectedIndex((prevIndex) => nextPendingIndex(prevIndex) ?? -1)
  }

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onOpenChange(false)
  }

  /**
   * Handle complete and save all changes
   */
  const handleComplete = () => {
    onSave?.(editedTemplates)
    onOpenChange(false)
  }

  useEffect(() => {
    setEditedTemplates(templates)
    setSelectedIndex(0)
  }, [templates])

  useEffect(() => {
    // Auto-scroll to selected item in the list
    if (listItemRef.current) {
      listItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      })
    }
    // Auto-scroll content to top
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0 })
    }
  }, [selectedIndex])

  /**
   * Load source prompt names when selected template changes
   */
  useEffect(() => {
    if (!selectedTemplate) return

    const loadSourcePromptNames = async () => {
      const storage = StorageService.getInstance()
      const names = new Map<string, string>()

      try {
        // Fetch all prompts once instead of multiple getPrompt calls
        const allPrompts = await storage.getAllPrompts()
        const promptMap = new Map(allPrompts.map((p) => [p.id, p.name]))

        for (const promptId of selectedTemplate.aiMetadata.sourcePromptIds) {
          // Get name from the prompt map
          const promptName = promptMap.get(promptId)
          if (promptName) {
            names.set(promptId, promptName)
          } else {
            names.set(promptId, promptId) // Fallback to ID if prompt not found
          }
        }

        setSourcePromptNames(names)
      } catch (error) {
        console.error("Failed to load source prompt names:", error)
        // On error, fallback to using IDs
        for (const promptId of selectedTemplate.aiMetadata.sourcePromptIds) {
          names.set(promptId, promptId)
        }
        setSourcePromptNames(names)
      }
    }

    loadSourcePromptNames()
  }, [selectedTemplate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full sm:max-w-6xl max-h-[80vh] flex flex-col"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.preview.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.preview.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-2 py-2 flex-1 min-h-0">
          {/* Left Pane: Template List */}
          <div
            className="col-span-1 flex flex-col min-h-0 gap-2"
            data-testid={TestId.list}
          >
            <div className="text-sm font-semibold">
              {i18n.t("promptOrganizer.preview.promptList")}
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 p-0.5 pr-4">
                {editedTemplates.map((template, index) => (
                  <TemplateCandidateCard
                    key={template.id}
                    candidate={template}
                    onClick={() => setSelectedIndex(index)}
                    isSelected={index === selectedIndex}
                    ref={index === selectedIndex ? listItemRef : null}
                    className="scroll-my-2"
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Pane: Template Detail */}
          <div
            className="col-span-2 flex flex-col min-h-0 gap-4"
            data-testid={TestId.detail}
          >
            {!selectedTemplate ? (
              editedTemplates.length === 0 ? (
                <div className="flex items-center justify-center flex-1 min-h-100">
                  <p className="text-base text-center">
                    {i18n.t("promptOrganizer.preview.noTemplates")}
                  </p>
                </div>
              ) : pendingCount > 0 ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="text-center">
                    <p className="text-base">
                      {i18n.t("promptOrganizer.preview.selectionRequired")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-1 min-h-100">
                  <p className="text-base text-center">
                    {i18n
                      .t("promptOrganizer.preview.completeReview")
                      .split("\\n")
                      .map((part: string, i: number, arr: string[]) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <>
                              <br />
                            </>
                          )}
                        </span>
                      ))}
                  </p>
                </div>
              )
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0" viewportRef={contentRef}>
                  <div className="space-y-4 pl-2 pr-4 pb-2">
                    {/* Explanation */}
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {i18n.t("promptOrganizer.preview.explanation")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {i18n.t(
                          "promptOrganizer.preview.explanationDescription",
                        )}
                      </p>
                      <p className="font-serif text-sm px-4 py-3 border bg-muted/30 rounded-lg">
                        {selectedTemplate.clusterExplanation}
                      </p>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        {i18n.t("promptOrganizer.preview.title_label")}
                      </div>
                      <Input
                        value={selectedTemplate.title}
                        onChange={(e) =>
                          updateTemplate({ title: e.target.value })
                        }
                        maxLength={40}
                      />
                    </div>

                    {/* Use Case Input */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        {i18n.t("promptOrganizer.preview.useCase")}
                      </div>
                      <Input
                        value={selectedTemplate.useCase}
                        onChange={(e) =>
                          updateTemplate({ useCase: e.target.value })
                        }
                        maxLength={80}
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        {i18n.t("promptOrganizer.preview.category")}
                      </div>
                      <CategorySelector
                        value={selectedTemplate.categoryId}
                        onValueChange={(categoryId) =>
                          updateTemplate({ categoryId })
                        }
                      />
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        {i18n.t("promptOrganizer.preview.content")}
                      </div>
                      <Textarea
                        value={selectedTemplate.content}
                        onChange={(e) =>
                          updateTemplate({ content: e.target.value })
                        }
                        rows={8}
                        className="font-mono text-xs max-h-60"
                      />
                    </div>

                    {/* Variables List */}
                    <VariableSettingsSection
                      variables={selectedTemplate.variables}
                      onChange={handleVariableChange}
                      enableAutoDetection={true}
                      autoDetectOptions={{
                        promptId: selectedTemplate.id,
                        content: selectedTemplate.content,
                      }}
                      headerText={i18n.t("promptOrganizer.preview.variables")}
                      showHeader={selectedTemplate.variables.length > 0}
                    />

                    {/* Source Prompts */}
                    <section className="space-y-2">
                      <h3>
                        <span className="text-sm font-semibold">
                          {i18n.t("promptOrganizer.preview.sourcePrompts")} (
                          {selectedTemplate.aiMetadata.sourceCount})
                        </span>
                      </h3>
                      <div className="rounded-lg p-3 space-y-1 bg-muted/30 border border-neutral-200">
                        {selectedTemplate.aiMetadata.sourcePromptIds.map(
                          (id) => (
                            <div
                              key={id}
                              className="text-xs text-muted-foreground"
                            >
                              {sourcePromptNames.get(id) || id}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  </div>
                </ScrollArea>

                {/* Template Actions */}
                <div className="pt-2">
                  <p className="text-xs text-center mb-2 text-foreground/90">
                    {i18n.t("promptOrganizer.preview.savePromptQuestion")}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDiscard}
                      className={cn(
                        "group",
                        userAction === "discard"
                          ? [
                              "ring-2 ring-red-400 bg-red-50 text-red-900",
                              "hover:bg-red-100/80 hover:text-red-900",
                            ]
                          : "",
                      )}
                    >
                      <Trash
                        className={cn(
                          "size-4 stroke-neutral-500 fill-neutral-100 transition",
                          "group-hover:scale-120 group-hover:stroke-red-500 group-hover:fill-red-100 ",
                          userAction === "discard"
                            ? "stroke-red-600 fill-red-200"
                            : "",
                        )}
                      />
                      {i18n.t("promptOrganizer.buttons.discard")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      className={cn(
                        "group",
                        userAction === "save"
                          ? [
                              "ring-2 ring-green-400 bg-green-50 text-green-900",
                              "hover:bg-green-100/80 hover:text-green-900",
                            ]
                          : "",
                      )}
                    >
                      <Save
                        className={cn(
                          "size-4 stroke-neutral-500 fill-neutral-100 transition",
                          "group-hover:scale-120 group-hover:stroke-green-600 group-hover:fill-green-100",
                          userAction === "save"
                            ? "stroke-green-700 fill-green-200"
                            : "",
                        )}
                      />
                      {i18n.t("promptOrganizer.buttons.save")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSaveAndPin}
                      className={cn(
                        "group",
                        userAction === "save_and_pin"
                          ? [
                              "ring-2 ring-amber-400 bg-amber-50 text-amber-900",
                              "hover:bg-amber-100/80 hover:text-amber-900",
                            ]
                          : "",
                      )}
                    >
                      <Star
                        className={cn(
                          "size-4 stroke-neutral-500 fill-neutral-100 transition",
                          "group-hover:scale-120 group-hover:stroke-amber-500 group-hover:fill-amber-100",
                          userAction === "save_and_pin"
                            ? "stroke-amber-600 fill-amber-200"
                            : "",
                        )}
                      />
                      {i18n.t("promptOrganizer.buttons.saveAndPin")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel}>
            {i18n.t("common.cancel")}
          </Button>
          <Button onClick={handleComplete} disabled={userReviewedCount === 0}>
            {userReviewedCount > 0 ? (
              pendingCount === 0 ? (
                <>
                  {i18n.t("promptOrganizer.buttons.applyAll", [pendingCount])}
                </>
              ) : (
                <>{i18n.t("promptOrganizer.buttons.apply", [pendingCount])}</>
              )
            ) : (
              <>
                {i18n.t("promptOrganizer.buttons.notReviewed", [pendingCount])}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
