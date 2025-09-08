import React, { useState, useRef, useCallback, useMemo } from "react"
import { History, Star, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "./ui/popover"
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { PromptPreview } from "./PromptPreview"
import { MenuItem } from "./MenuItem"
import { RemoveDialog } from "@/components/RemoveDialog"
import { EditDialog } from "@/components/EditDialog"
import { PromptServiceFacade } from "../services/promptServiceFacade"
import type { Prompt, SaveDialogData } from "../types/prompt"
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

  return (
    <Popover open={true}>
      <PopoverAnchor virtualRef={{ current: targetElm }} />
      <PopoverContent
        className="z-auto p-0 border-0"
        side={"top"}
        align={"end"}
        sideOffset={8}
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

  const handleItemClick = useCallback((promptId: string) => {
    // Clear hoveredItem immediately when item is clicked
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredItem(null)

    try {
      serviceFacade.executePrompt(promptId)
    } catch (error) {
      console.error("Execute failed:", error)
    }
  }, [])

  /**
   * Update prompt & pin it.
   */
  const handleEditPrompt = async (saveData: SaveDialogData) => {
    try {
      await serviceFacade.updatePrompt(editId!, saveData)
      await serviceFacade.pinPrompt(editId!)
    } catch (error) {
      console.error("Save failed:", error)
    }
  }

  /**
   * プロンプト削除処理
   */
  const handleDeletePrompt = async (promptId: string) => {
    try {
      await serviceFacade.deletePrompt(promptId)
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  /**
   * ピン留めトグル処理
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
   * 保存ダイアログを開く
   */
  const openEditDialogNew = async () => {
    const data = await serviceFacade.prepareSaveDialogData()
    setSaveDialogData({
      name: data.initialName ?? "",
      content: data.initialContent,
      saveMode: data.isOverwriteAvailable ? "overwrite" : "new",
    })
  }

  /**
   * 保存ダイアログを開く
   */
  const openEditDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      name: prompt.name,
      content: prompt.content,
      saveMode: "overwrite",
    })
    setEditId(promptId)
  }

  const hoveredPrompt = useMemo(() => {
    if (!hoveredItem) return null
    const prompts =
      hoveredItem.menuType === "history" ? props.prompts : props.pinnedPrompts
    return prompts.find((p) => p.id === hoveredItem.promptId) || null
  }, [hoveredItem, props.prompts, props.pinnedPrompts])

  return (
    <div className="relative">
      <Menubar
        value={selectedMenu}
        className="gap-0.5"
        onValueChange={(v) => setSelectedMenu(v as MENU)}
      >
        {/* History Menu */}
        <MenubarMenu value={MENU.History}>
          <MenuTrigger onMouseEnter={() => handleMenuEnter(MENU.History)}>
            <History size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent
            className="max-h-80 min-w-[220px] overflow-y-auto"
            side="top"
          >
            {props.prompts.length > 0 ? (
              props.prompts.map((prompt) => (
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
                  onTogglePin={handleTogglePin}
                >
                  {prompt.name}
                </MenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">
                プロンプトを送信すると表示されます
              </div>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Pinned Menu */}
        <MenubarMenu value={MENU.Pinned}>
          <MenuTrigger onMouseEnter={() => handleMenuEnter(MENU.Pinned)}>
            <Star size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent side="top">
            {props.pinnedPrompts.length > 0 ? (
              props.pinnedPrompts.map((prompt) => (
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
                  onTogglePin={handleTogglePin}
                >
                  {prompt.name}
                </MenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500 min-w-[220px]">
                Starをつけるか手動保存すると表示されます
              </div>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Save Menu */}
        <MenubarMenu value={MENU.Save}>
          <MenuTrigger onClick={openEditDialogNew}>
            <Save size={16} className="stroke-gray-600" />
          </MenuTrigger>
        </MenubarMenu>
      </Menubar>

      {/* PromptDetail Overlay */}
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
          isOverwriteAvailable={saveDialogData.saveMode === "overwrite"}
          onSave={handleEditPrompt}
        />
      )}

      <RemoveDialog
        open={removeId !== null}
        onOpenChange={(val) => setRemoveId(val ? removeId : null)}
        description={`Are you sure you want to remove? This action cannot be undone.`}
        onRemove={() => handleDeletePrompt(removeId!)}
      >
        <span className="text-base truncate"></span>
      </RemoveDialog>
    </div>
  )
}

function MenuTrigger(props: {
  onMouseEnter?: () => void
  onClick?: () => void
  children: React.ReactNode
}): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-gray-700 cursor-pointer",
      )}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onClick}
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
