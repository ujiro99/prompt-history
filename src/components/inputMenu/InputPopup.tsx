import React, { useState, useRef, useCallback, useMemo } from "react"
import { History, Star, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useCaretNode } from "@/hooks/useCaretNode"
import { useContainer } from "@/hooks/useContainer"
import { PromptPreview } from "./PromptPreview"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import { EditDialog } from "@/components/inputMenu/controller/EditDialog"
import { BridgeArea } from "@/components/BridgeArea"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { SaveMode } from "@/types/prompt"
import { MENU, TestIds } from "@/components/const"
import { PromptList } from "@/components/inputMenu/PromptList"
import { SettingsMenu } from "./SettingsMenu"
import { cn, isEmpty } from "@/lib/utils"
import type { Prompt, SaveDialogData } from "@/types/prompt"

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
  const hoverTimeoutRef = useRef<number | null>(null)
  const [saveDialogData, setSaveDialogData] = useState<SaveDialogData | null>(
    null,
  )
  const [historySideFlipped, setHistorySideFlipped] = useState(false)
  const [pinnedSideFlipped, setPinnedSideFlipped] = useState(false)

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

  const handleMenuEnter = (val: MENU) => {
    setSelectedMenu(val)
  }

  const handleItemHover = useCallback(
    (
      promptId: string,
      element: HTMLElement,
      menuType: "history" | "pinned",
    ) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredItem({ promptId, element, menuType })
      }, 50)
    },
    [],
  )

  const handleItemLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredItem(null)
  }, [])

  const handleOverlayEnter = useCallback(() => {
    // Cancel timeout when mouse enters overlay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const handleOverlayLeave = useCallback(() => {
    // Close overlay when mouse leaves
    setHoveredItem(null)
  }, [])

  const handleItemClick = useCallback(
    (promptId: string) => {
      // Clear hoveredItem immediately when item is clicked
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setHoveredItem(null)

      try {
        serviceFacade.executePrompt(promptId, nodeAtCaret)
      } catch (error) {
        console.error("Execute failed:", error)
      }
    },
    [nodeAtCaret],
  )

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
   * Open dialog to save new prompt being entered
   */
  const openEditDialogNew = async () => {
    const data = await serviceFacade.prepareSaveDialogData()
    setSaveDialogData({
      name: data.initialName ?? "",
      content: data.initialContent,
      saveMode: data.isOverwriteAvailable ? SaveMode.Overwrite : SaveMode.New,
      isPinned: true,
    })
    setEditId("")
  }

  /**
   * Open save dialog
   */
  const openEditDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      name: prompt.name,
      content: prompt.content,
      saveMode: SaveMode.Overwrite,
      isPinned: prompt.isPinned,
    })
    setEditId(promptId)
  }

  /**
   * Open dialog to copy prompt
   */
  const openCopyDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      name: `${i18n.t("messages.copyPrefix")} ${prompt.name}`,
      content: prompt.content,
      saveMode: SaveMode.Copy,
      isPinned: prompt.isPinned,
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
        onValueChange={(v) => setSelectedMenu(v as MENU)}
      >
        {/* History Menu */}
        <MenubarMenu value={MENU.History}>
          <MenuTrigger
            ref={setHistoryAnchorElm}
            onMouseEnter={() => handleMenuEnter(MENU.History)}
            data-testid={TestIds.inputPopup.historyTrigger}
          >
            <History size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent
            side="top"
            className="p-0"
            onSideFlip={(side) => setHistorySideFlipped(side !== "top")}
            ref={setHistoryContentElm}
            data-testid={TestIds.inputPopup.historyList}
            container={container}
          >
            <PromptList
              menuType="history"
              prompts={props.prompts}
              sideFlipped={historySideFlipped}
              onClick={handleItemClick}
              onHover={handleItemHover}
              onLeave={handleItemLeave}
              onEdit={openEditDialog}
              onRemove={setRemoveId}
              onCopy={openCopyDialog}
              onTogglePin={handleTogglePin}
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
            <Star size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent
            side="top"
            className="p-0"
            onSideFlip={(side) => setPinnedSideFlipped(side !== "top")}
            ref={setPinnedContentElm}
            data-testid={TestIds.inputPopup.pinnedList}
            container={container}
          >
            <PromptList
              menuType="pinned"
              prompts={props.pinnedPrompts}
              sideFlipped={pinnedSideFlipped}
              onClick={handleItemClick}
              onHover={handleItemHover}
              onLeave={handleItemLeave}
              onEdit={openEditDialog}
              onRemove={setRemoveId}
              onCopy={openCopyDialog}
              onTogglePin={handleTogglePin}
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

        {/* Save Menu */}
        <MenubarMenu value={MENU.Save}>
          <MenuTrigger
            disabled={!props.saveEnabled}
            onClick={openEditDialogNew}
            data-testid={TestIds.inputPopup.editTrigger}
          >
            <Save size={16} className="stroke-gray-600" />
          </MenuTrigger>
        </MenubarMenu>

        {/* Settings Menu */}
        <SettingsMenu onMouseEnter={() => handleMenuEnter(MENU.Settings)} />
      </Menubar>

      {/* PromptPreview Overlay */}
      {hoveredPrompt && hoveredItem?.element && (
        <PromptPreviewWrapper
          open={!isEmpty(selectedMenu) && hoveredItem.element != null}
          prompt={hoveredPrompt}
          anchorElement={hoveredItem.element}
          onMouseEnter={handleOverlayEnter}
          onMouseLeave={handleOverlayLeave}
        />
      )}

      {/* Edit Prompt Dialog */}
      {saveDialogData && (
        <EditDialog
          open={editId !== null}
          onOpenChange={(val) => setEditId(val ? editId : null)}
          initialName={saveDialogData.name}
          initialContent={saveDialogData.content}
          displayMode={saveDialogData.saveMode}
          onSave={handleEditPrompt}
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
    </div>
  )
}

function MenuTrigger(
  props: React.ComponentProps<typeof MenubarTrigger>,
): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-gray-700 cursor-pointer",
        props.disabled && "opacity-50 pointer-events-none",
      )}
      {...props}
    >
      {props.children}
    </MenubarTrigger>
  )
}

type PromptDetailWrapperProps = {
  open: boolean
  prompt: Prompt
  anchorElement: HTMLElement
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const PromptPreviewWrapper = (props: PromptDetailWrapperProps) => {
  const { open, prompt, anchorElement, onMouseEnter, onMouseLeave } = props

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <PromptPreview open={open} anchorElm={anchorElement} prompt={prompt} />
    </div>
  )
}
PromptPreviewWrapper.displayName = "PromptPreviewWrapper"
