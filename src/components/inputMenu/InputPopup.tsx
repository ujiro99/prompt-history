import React, { useState, useRef, useCallback, useMemo } from "react"
import { History, Star, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useCaretNode } from "@/hooks/useCaretNode"
import { useContainer } from "@/hooks/useContainer"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import { PromptPreview } from "./PromptPreview"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import { EditDialog } from "@/components/inputMenu/controller/EditDialog"
import { PromptImproveDialog } from "@/components/inputMenu/controller/PromptImproveDialog"
import { VariableInputDialog } from "@/components/inputMenu/controller/VariableInputDialog"
import { BridgeArea } from "@/components/BridgeArea"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { SaveMode } from "@/types/prompt"
import { MENU, TestIds } from "@/components/const"
import { PromptList } from "@/components/inputMenu/PromptList"
import { SettingsMenu } from "./SettingsMenu"
import { cn, isEmpty } from "@/lib/utils"
import type { Prompt, SaveDialogData, ImprovePromptData } from "@/types/prompt"
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
  const hoverTimeoutRef = useRef<number | null>(null)
  const [saveDialogData, setSaveDialogData] = useState<SaveDialogData | null>(
    null,
  )
  const [improvePromptData, setImprovePromptData] =
    useState<ImprovePromptData | null>(null)
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
    setPrompt,
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
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (promptId == null || element == null) {
        setHoveredItem(null)
        return
      }
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredItem({ promptId, element, menuType })
      }, 50)
    },
    [],
  )

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
    async (promptId: string) => {
      // Clear hoveredItem immediately when item is clicked
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setHoveredItem(null)

      // Insert prompt (with variable check)
      await insertPrompt(promptId)
    },
    [insertPrompt],
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

  const handleInteractOutside = useCallback(() => {
    setSelectedMenu(MENU.None)
    setListLocked(false)
  }, [])

  /**
   * Open prompt-improve dialog
   */
  const openImproveDialog = async () => {
    if (!props.saveEnabled) return
    const content = serviceFacade.extractPromptContent()
    setImprovePromptData({
      content: content ?? "",
    })
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
      variables: prompt.variables,
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
      variables: prompt.variables,
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

        {/* Improve Menu */}
        <MenubarMenu value={MENU.Improve}>
          <Tooltip>
            <TooltipTrigger asChild>
              <MenuTrigger
                disabled={!props.saveEnabled}
                onClick={openImproveDialog}
                data-testid={TestIds.inputPopup.improveTrigger}
              >
                <Sparkles
                  size={16}
                  strokeWidth={1.75}
                  className="stroke-neutral-600"
                />
              </MenuTrigger>
            </TooltipTrigger>
            <TooltipContent
              className="bg-white dark:bg-neutral-800 text-xs text-foreground shadow-md py-2 border border-neutral-200 dark:border-neutral-700"
              sideOffset={10}
              align="start"
              noArrow={true}
            >
              {i18n.t("tooltips.improveMenu")}
            </TooltipContent>
          </Tooltip>
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
          initialVariables={saveDialogData.variables}
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

      {/* Prompt Improve Dialog */}
      {improvePromptData && (
        <PromptImproveDialog
          open={improvePromptData !== null}
          onOpenChange={() => setImprovePromptData(null)}
          initialData={improvePromptData}
          onInput={handleInputPrompt}
        />
      )}

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

function MenuTrigger(
  props: React.ComponentProps<typeof MenubarTrigger>,
): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-foreground cursor-pointer",
        props.disabled && "opacity-50",
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
