import React, { useCallback, useState } from "react"
import { Sparkles, NotebookPen } from "lucide-react"
import {
  MenubarMenu,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar"
import { MenuTrigger } from "./MenuTrigger"
import { useCaretNode } from "@/hooks/useCaretNode"
import { useContainer } from "@/hooks/useContainer"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import { PromptImproveDialog } from "@/components/inputMenu/controller/PromptImproveDialog"
import { OrganizerExecuteDialog } from "@/components/promptOrganizer/OrganizerExecuteDialog"
import { OrganizerSummaryDialog } from "@/components/promptOrganizer/OrganizerSummaryDialog"
import { OrganizerPreviewDialog } from "@/components/promptOrganizer/OrganizerPreviewDialog"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"
import { MENU, TestIds } from "@/components/const"
import type { ImprovePromptData } from "@/types/prompt"
import type {
  PromptOrganizerResult,
  TemplateCandidate,
} from "@/types/promptOrganizer"
import { i18n } from "#imports"

const serviceFacade = PromptServiceFacade.getInstance()

type Props = {
  onMouseEnter: () => void
  saveEnabled: boolean
  onInteractOutside: () => void
}

export function GenerationMenu({
  onMouseEnter,
  saveEnabled,
  onInteractOutside,
}: Props): React.ReactElement {
  const { container } = useContainer()
  const { nodeAtCaret } = useCaretNode()
  const { setPrompt } = usePromptExecution({ nodeAtCaret })

  const [improvePromptData, setImprovePromptData] =
    useState<ImprovePromptData | null>(null)
  const [organizerExecuteOpen, setOrganizerExecuteOpen] = useState(false)
  const [organizerSummaryOpen, setOrganizerSummaryOpen] = useState(false)
  const [organizerPreviewOpen, setOrganizerPreviewOpen] = useState(false)
  const [organizerResult, setOrganizerResult] =
    useState<PromptOrganizerResult | null>(null)

  /**
   * Open prompt-improve dialog
   */
  const openImproveDialog = async () => {
    if (!saveEnabled) return
    const content = serviceFacade.extractPromptContent()
    setImprovePromptData({
      content: content ?? "",
    })
  }

  /**
   * Input improved prompt process
   */
  const handleInputPrompt = async (data: ImprovePromptData) => {
    try {
      await setPrompt(data.content)
    } catch (error) {
      console.error("Input improved prompt failed:", error)
    }
  }

  /**
   * Open organizer execute dialog
   */
  const openOrganizerExecuteDialog = useCallback(() => {
    setOrganizerExecuteOpen(true)
  }, [])

  /**
   * Execute prompt organization
   */
  const handleExecuteOrganization = useCallback(async () => {
    try {
      const { promptOrganizerSettingsStorage } = await import(
        "@/services/storage/definitions"
      )
      const settings = await promptOrganizerSettingsStorage.getValue()
      const result = await promptOrganizerService.executeOrganization(settings)
      setOrganizerResult(result)
      setOrganizerExecuteOpen(false)
      setOrganizerSummaryOpen(true)
    } catch (error) {
      console.error("Organization failed:", error)
      throw error
    }
  }, [])

  /**
   * Preview templates
   */
  const handlePreviewTemplates = useCallback(() => {
    setOrganizerSummaryOpen(false)
    setOrganizerPreviewOpen(true)
  }, [])

  /**
   * Save all templates
   */
  const handleSaveAllTemplates = useCallback(async () => {
    if (!organizerResult) return
    try {
      await promptOrganizerService.saveTemplates(organizerResult.templates)
      setOrganizerSummaryOpen(false)
      setOrganizerResult(null)
    } catch (error) {
      console.error("Save failed:", error)
    }
  }, [organizerResult])

  /**
   * Save templates from preview
   */
  const handleSaveTemplatesFromPreview = useCallback(
    async (templates: TemplateCandidate[]) => {
      try {
        await promptOrganizerService.saveTemplates(templates)
        setOrganizerPreviewOpen(false)
        setOrganizerResult(null)
      } catch (error) {
        console.error("Save failed:", error)
      }
    },
    [],
  )

  return (
    <MenubarMenu value={MENU.Improve}>
      <MenuTrigger
        onMouseEnter={onMouseEnter}
        data-testid={TestIds.inputPopup.improveTrigger}
      >
        <Sparkles size={16} strokeWidth={1.75} className="stroke-neutral-600" />
      </MenuTrigger>
      <MenubarContent
        side="top"
        container={container}
        onInteractOutside={onInteractOutside}
      >
        <MenubarItem onClick={openImproveDialog} disabled={!saveEnabled}>
          <Sparkles size={16} />
          {i18n.t("dialogs.promptImprove.title")}
        </MenubarItem>
        <MenubarItem onClick={openOrganizerExecuteDialog}>
          <NotebookPen size={16} />
          {i18n.t("promptOrganizer.title")}
        </MenubarItem>
      </MenubarContent>

      {/* Prompt Improve Dialog */}
      {improvePromptData && (
        <PromptImproveDialog
          open={improvePromptData !== null}
          onOpenChange={() => setImprovePromptData(null)}
          initialData={improvePromptData}
          onInput={handleInputPrompt}
        />
      )}

      {/* Organizer Execute Dialog */}
      <OrganizerExecuteDialog
        open={organizerExecuteOpen}
        onOpenChange={setOrganizerExecuteOpen}
        onExecute={handleExecuteOrganization}
      />

      {/* Organizer Summary Dialog */}
      <OrganizerSummaryDialog
        open={organizerSummaryOpen}
        onOpenChange={setOrganizerSummaryOpen}
        result={organizerResult}
        onPreview={handlePreviewTemplates}
        onSaveAll={handleSaveAllTemplates}
      />

      {/* Organizer Preview Dialog */}
      <OrganizerPreviewDialog
        open={organizerPreviewOpen}
        onOpenChange={setOrganizerPreviewOpen}
        templates={organizerResult?.templates || []}
        onSave={handleSaveTemplatesFromPreview}
      />
    </MenubarMenu>
  )
}
