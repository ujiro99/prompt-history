import React, { useState, useCallback, useMemo, useEffect } from "react"
import { History, Star } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Menubar, MenubarContent, MenubarMenu } from "@/components/ui/menubar"
import { MenuTrigger } from "./MenuTrigger"
import { useCaretNode } from "@/hooks/useCaretNode"
import { useContainer } from "@/hooks/useContainer"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import { PromptPreview } from "./PromptPreview"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import { EditDialog } from "@/components/inputMenu/controller/EditDialog"
import { VariableInputDialog } from "@/components/inputMenu/controller/VariableInputDialog"
import { BridgeArea } from "@/components/BridgeArea"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { SaveMode } from "@/types/prompt"
import { MENU, TestIds } from "@/components/const"
import { PromptList } from "@/components/inputMenu/PromptList"
import { GenerationMenu } from "./GenerationMenu"
import { SettingsMenu } from "./SettingsMenu"
import { isEmpty } from "@/lib/utils"
import type { Prompt, SaveDialogData } from "@/types/prompt"
import { i18n } from "#imports"

const serviceFacade = PromptServiceFacade.getInstance()

type Props = {
  targetElm: Element | null
  prompts: Prompt[]
  pinnedPrompts: Prompt[]
  saveEnabled: boolean
}

type HoveredItem = {
  promptId: string
  element: HTMLElement
  menuType: "history" | "pinned"
} | null

const noFocus = (e: Event) => e.preventDefault()

export function InputPopup(props: Props): React.ReactElement {
  const { targetElm } = props
  if (targetElm == null) return <></>

  const popupPlacement = serviceFacade.getPopupPlacement()

  return (
    <Popover open={true}>
      <PopoverAnchor virtualRef={{ current: targetElm }} />
      <PopoverContent
        className="p-0 border-0 shadow-none"
        side={"top"}
        sideOffset={popupPlacement.sideOffset}
        align={"end"}
        alignOffset={popupPlacement.alignOffset}
        onOpenAutoFocus={noFocus}
        data-testid={TestIds.inputPopup.popup}
      >
        <InputMenu {...props} />
      </PopoverContent>
    </Popover>
  )
}

export function InputMenu(props: Props): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MENU>(MENU.None)
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [saveDialogData, setSaveDialogData] = useState<SaveDialogData | null>(
    null,
  )
  const [historySideFlipped, setHistorySideFlipped] = useState(false)
  const [pinnedSideFlipped, setPinnedSideFlipped] = useState(false)

  // PromptList lock status
  const [listLocked, setListLocked] = useState<boolean>(false)

  // For positioning BridgeArea
  const [historyAnchorElm, setHistoryAnchorElm] =
    useState<HTMLButtonElement | null>(null)
  const [historyContentElm, setHistoryContentElm] =
    useState<HTMLDivElement | null>(null)
  const [pinnedAnchorElm, setPinnedAnchorElm] =
    useState<HTMLButtonElement | null>(null)
  const [pinnedContentElm, setPinnedContentElm] =
    useState<HTMLDivElement | null>(null)

  const { nodeAtCaret } = useCaretNode()
  const { container } = useContainer()
  const {
    variableInputData,
    insertPrompt,
    handleVariableSubmit,
    clearVariableInputData,
  } = usePromptExecution({ nodeAtCaret })

  const handleMenuEnter = (val: MENU) => {
    if (listLocked) return
    setSelectedMenu(val)
  }

  const handleMenuChange = (val: string) => {
    if (listLocked) return
    setHoveredItem(null) // Reset preview when menu changes.
    setSelectedMenu(val as MENU)
  }

  const handleItemHover = useCallback(
    (
      promptId: string | null,
      element: HTMLElement | null,
      menuType: "history" | "pinned",
    ) => {
      if (promptId == null || element == null) {
        setHoveredItem(null)
        return
      }
      setHoveredItem({ promptId, element, menuType })
    },
    [],
  )

  const handleItemClick = useCallback(
    async (promptId: string) => {
      // Clear hoveredItem when item is clicked
      setHoveredItem(null)

      // Insert prompt (with variable check)
      await insertPrompt(promptId)
    },
    [insertPrompt],
  )

  const handlePreviewLeave = useCallback(() => {
    // Close preview when mouse leaves
    setHoveredItem(null)
  }, [])

  /**
   * Delete prompt process
   */
  const handleDeletePrompt = async (promptId: string) => {
    try {
      await serviceFacade.deletePrompt(promptId)
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  /**
   * Toggle pin process
   */
  const handleTogglePin = async (promptId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await serviceFacade.pinPrompt(promptId)
      } else {
        await serviceFacade.unpinPrompt(promptId)
      }
    } catch (error) {
      console.error("Pin toggle failed:", error)
    }
  }

  /**
   * Confirm AI-generated template
   */
  const handleConfirmTemplate = useCallback(async (promptId: string) => {
    try {
      const prompt = await serviceFacade.getPrompt(promptId)
      if (prompt.isAIGenerated && prompt.aiMetadata) {
        // Update aiMetadata.confirmed to true
        const updates: Partial<Prompt> = {
          aiMetadata: {
            ...prompt.aiMetadata,
            confirmed: true,
          },
        }
        await serviceFacade.updatePrompt(promptId, updates)
      }
    } catch (error) {
      console.error("Template confirmation failed:", error)
    }
  }, [])

  const handleInteractOutside = useCallback(() => {
    setSelectedMenu(MENU.None)
    setListLocked(false)
  }, [])

  /**
   * Open save dialog
   */
  const openEditDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      ...prompt,
      saveMode: SaveMode.Overwrite,
    })
    setEditId(promptId)
  }

  /**
   * Open dialog to copy prompt
   */
  const openCopyDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      ...prompt,
      name: `${i18n.t("messages.copyPrefix")} ${prompt.name}`,
      saveMode: SaveMode.Copy,
    })
    setEditId("")
  }

  /**
   * Update prompt & pin it.
   */
  const handleEditPrompt = async (saveData: SaveDialogData) => {
    try {
      if (
        isEmpty(editId) ||
        saveData.saveMode === SaveMode.New ||
        saveData.saveMode === SaveMode.Copy
      ) {
        await serviceFacade.savePromptManually(saveData)
      } else {
        await serviceFacade.updatePrompt(editId!, saveData)
      }
    } catch (error) {
      console.error("Save failed:", error)
    }
  }

  const hoveredPrompt = useMemo(() => {
    if (!hoveredItem) return null
    const prompts =
      hoveredItem.menuType === "history" ? props.prompts : props.pinnedPrompts
    return prompts.find((p) => p.id === hoveredItem.promptId) || null
  }, [hoveredItem, props.prompts, props.pinnedPrompts])

  const removePrompt = useMemo(() => {
    if (!removeId) return null
    return props.prompts.find((p) => p.id === removeId) || null
  }, [removeId, props.prompts])

  return (
    <div className="relative">
      <Menubar
        value={selectedMenu}
        className="gap-0.5 shadow-xs rounded-lg"
        onValueChange={handleMenuChange}
      >
        {/* History Menu */}
        <MenubarMenu value={MENU.History}>
          <MenuTrigger
            ref={setHistoryAnchorElm}
            onMouseEnter={() => handleMenuEnter(MENU.History)}
            data-testid={TestIds.inputPopup.historyTrigger}
          >
            <History size={16} className="stroke-neutral-600" />
          </MenuTrigger>
          <MenubarContent
            className="p-0"
            side={historySideFlipped && listLocked ? "bottom" : "top"}
            onSideFlip={(side) => setHistorySideFlipped(side !== "top")}
            onInteractOutside={handleInteractOutside}
            ref={setHistoryContentElm}
            data-testid={TestIds.inputPopup.historyList}
            container={container}
            onWheel={(e) => e.stopPropagation()}
          >
            <PromptList
              menuType="history"
              prompts={props.prompts}
              sideFlipped={historySideFlipped}
              onClick={handleItemClick}
              onHover={handleItemHover}
              onEdit={openEditDialog}
              onRemove={setRemoveId}
              onCopy={openCopyDialog}
              onTogglePin={handleTogglePin}
              onLockChange={setListLocked}
              onConfirmTemplate={handleConfirmTemplate}
            />
            {historyAnchorElm && historyContentElm && (
              <BridgeArea
                fromElm={historyAnchorElm}
                toElm={historyContentElm}
                isHorizontal={false}
              />
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Pinned Menu */}
        <MenubarMenu value={MENU.Pinned}>
          <MenuTrigger
            ref={setPinnedAnchorElm}
            onMouseEnter={() => handleMenuEnter(MENU.Pinned)}
            data-testid={TestIds.inputPopup.pinnedTrigger}
          >
            <Star size={16} className="stroke-neutral-600" />
          </MenuTrigger>
          <MenubarContent
            className="p-0"
            side={pinnedSideFlipped && listLocked ? "bottom" : "top"}
            onSideFlip={(side) => setPinnedSideFlipped(side !== "top")}
            onInteractOutside={handleInteractOutside}
            ref={setPinnedContentElm}
            data-testid={TestIds.inputPopup.pinnedList}
            container={container}
            onWheel={(e) => e.stopPropagation()}
          >
            <PromptList
              menuType="pinned"
              prompts={props.pinnedPrompts}
              sideFlipped={pinnedSideFlipped}
              onClick={handleItemClick}
              onHover={handleItemHover}
              onEdit={openEditDialog}
              onRemove={setRemoveId}
              onCopy={openCopyDialog}
              onTogglePin={handleTogglePin}
              onLockChange={setListLocked}
              onConfirmTemplate={handleConfirmTemplate}
            />
            {pinnedAnchorElm && pinnedContentElm && (
              <BridgeArea
                fromElm={pinnedAnchorElm}
                toElm={pinnedContentElm}
                isHorizontal={false}
              />
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Prompt Generation Menu */}
        <GenerationMenu
          onMouseEnter={() => handleMenuEnter(MENU.Improve)}
          saveEnabled={props.saveEnabled}
          onInteractOutside={handleInteractOutside}
        />

        {/* Settings Menu */}
        <SettingsMenu
          onMouseEnter={() => handleMenuEnter(MENU.Settings)}
          onInteractOutside={handleInteractOutside}
        />
      </Menubar>

      {/* PromptPreview */}
      {hoveredPrompt && hoveredItem?.element && (
        <PromptPreviewWrapper
          open={!isEmpty(selectedMenu) && hoveredItem.element != null}
          prompt={hoveredPrompt}
          anchorElement={hoveredItem.element}
          onMouseLeave={handlePreviewLeave}
        />
      )}

      {/* Edit Prompt Dialog */}
      {saveDialogData && (
        <EditDialog
          open={editId !== null}
          onOpenChange={(val) => setEditId(val ? editId : null)}
          initialName={saveDialogData.name}
          initialContent={saveDialogData.content}
          initialVariables={saveDialogData.variables}
          initialUseCase={saveDialogData.useCase}
          initialCategoryId={saveDialogData.categoryId}
          initialExcludeFromOrganizer={saveDialogData.excludeFromOrganizer}
          displayMode={saveDialogData.saveMode}
          onSave={handleEditPrompt}
          isAIGenerated={saveDialogData.isAIGenerated}
        />
      )}

      {/* Remove Prompt Dialog */}
      <RemoveDialog
        open={removeId !== null}
        onOpenChange={(val) => setRemoveId(val ? removeId : null)}
        description={i18n.t("dialogs.delete.message")}
        onRemove={() => handleDeletePrompt(removeId!)}
      >
        <span className="text-base break-all">{removePrompt?.name}</span>
      </RemoveDialog>

      {/* Variable Input Dialog */}
      {variableInputData && (
        <VariableInputDialog
          open={variableInputData !== null}
          onOpenChange={(open) => {
            if (!open) clearVariableInputData()
          }}
          variables={variableInputData.variables}
          content={variableInputData.content}
          onSubmit={handleVariableSubmit}
        />
      )}
    </div>
  )
}

type PromptDetailWrapperProps = {
  open: boolean
  prompt: Prompt
  anchorElement: HTMLElement
  onMouseLeave: () => void
}

const PromptPreviewWrapper = (props: PromptDetailWrapperProps) => {
  const { open, prompt, anchorElement, onMouseLeave } = props
  const [promptChanged, setPromptChanged] = useState(false)

  useEffect(() => {
    if (prompt.id) {
      setPromptChanged(true)
      setTimeout(() => setPromptChanged(false))
    }
  }, [prompt.id])

  return (
    <div onMouseLeave={onMouseLeave}>
      <PromptPreview
        open={open && !promptChanged}
        anchorElm={anchorElement}
        prompt={prompt}
      />
    </div>
  )
}
PromptPreviewWrapper.displayName = "PromptPreviewWrapper"
