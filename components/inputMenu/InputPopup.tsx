import React, { useState, useRef, useCallback, useMemo } from "react"
import { History, Star, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useCaretNode } from "@/hooks/useCaretNode"
import { PromptPreview } from "./PromptPreview"
import { MenuItem } from "./MenuItem"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import { EditDialog } from "@/components/inputMenu/controller/EditDialog"
import { BridgeArea } from "@/components/BridgeArea"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { SaveMode } from "@/types/prompt"
import type { Prompt, SaveDialogData } from "@/types/prompt"
import { cn, isEmpty } from "@/lib/utils"

const serviceFacade = PromptServiceFacade.getInstance()

enum MENU {
  None = "None",
  History = "History",
  Pinned = "Pinned",
  Save = "Save",
}

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
        className="p-0 border-0"
        side={"top"}
        sideOffset={popupPlacement.sideOffset}
        align={"end"}
        alignOffset={popupPlacement.alignOffset}
        onOpenAutoFocus={noFocus}
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
  const historyAnchorRef = useRef<HTMLButtonElement>(null)
  const historyContentRef = useRef<HTMLDivElement>(null)
  const pinnedAnchorRef = useRef<HTMLButtonElement>(null)
  const pinnedContentRef = useRef<HTMLDivElement>(null)

  const { nodeAtCaret } = useCaretNode()

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
      }, 100)
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
      name: `Copy of ${prompt.name}`,
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

  const reversePrompts = useMemo(() => {
    return [...props.prompts].reverse()
  }, [props.prompts])

  const reversePinnedPrompts = useMemo(() => {
    return [...props.pinnedPrompts].reverse()
  }, [props.pinnedPrompts])

  return (
    <div className="relative">
      <Menubar
        value={selectedMenu}
        className="gap-0.5"
        onValueChange={(v) => setSelectedMenu(v as MENU)}
      >
        {/* History Menu */}
        <MenubarMenu value={MENU.History}>
          <MenuTrigger
            ref={historyAnchorRef}
            onMouseEnter={() => handleMenuEnter(MENU.History)}
          >
            <History size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent side="top" ref={historyContentRef}>
            {props.prompts.length > 0 ? (
              <ScrollArea
                className={cn(
                  "min-w-[220px]",
                  props.prompts.length > 8 && "h-80",
                )}
              >
                {reversePrompts.map((prompt) => (
                  <MenuItem
                    menuType="history"
                    value={prompt.id}
                    key={prompt.id}
                    isPinned={prompt.isPinned}
                    onHover={handleItemHover}
                    onLeave={handleItemLeave}
                    onClick={handleItemClick}
                    onEdit={openEditDialog}
                    onRemove={setRemoveId}
                    onCopy={openCopyDialog}
                    onTogglePin={handleTogglePin}
                  >
                    {prompt.name}
                  </MenuItem>
                ))}
              </ScrollArea>
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">
                Prompts will be displayed when you send them
              </div>
            )}
            {historyAnchorRef.current && historyContentRef.current && (
              <BridgeArea
                fromElm={historyAnchorRef.current}
                toElm={historyContentRef.current}
                isHorizontal={false}
              />
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Pinned Menu */}
        <MenubarMenu value={MENU.Pinned}>
          <MenuTrigger
            onMouseEnter={() => handleMenuEnter(MENU.Pinned)}
            ref={pinnedAnchorRef}
          >
            <Star size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent side="top" ref={pinnedContentRef}>
            {props.pinnedPrompts.length > 0 ? (
              <ScrollArea
                className={cn(
                  "min-w-[220px]",
                  props.pinnedPrompts.length > 8 && "h-80",
                )}
              >
                {reversePinnedPrompts.map((prompt) => (
                  <MenuItem
                    menuType="pinned"
                    value={prompt.id}
                    key={prompt.id}
                    isPinned={prompt.isPinned}
                    onHover={handleItemHover}
                    onLeave={handleItemLeave}
                    onClick={handleItemClick}
                    onEdit={openEditDialog}
                    onRemove={setRemoveId}
                    onCopy={openCopyDialog}
                    onTogglePin={handleTogglePin}
                  >
                    {prompt.name}
                  </MenuItem>
                ))}
              </ScrollArea>
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500 min-w-[220px]">
                Will be displayed when you star or manually save
              </div>
            )}
            {pinnedAnchorRef.current && pinnedContentRef.current && (
              <BridgeArea
                fromElm={pinnedAnchorRef.current}
                toElm={pinnedContentRef.current}
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
          >
            <Save size={16} className="stroke-gray-600" />
          </MenuTrigger>
        </MenubarMenu>
      </Menubar>

      {/* PromptPreview Overlay */}
      {hoveredPrompt && hoveredItem && (
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
        description={`Are you sure you want to remove? This action cannot be undone.`}
        onRemove={() => handleDeletePrompt(removeId!)}
      >
        <span className="text-base truncate">{removePrompt?.name}</span>
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
