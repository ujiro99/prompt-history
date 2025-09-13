import { useState, useEffect } from "react"
import { PromptServiceFacade } from "../services/promptServiceFacade"
import { NotificationManager } from "./Notification"
import { InputPopup } from "./inputMenu/InputPopup"
import { AutoCompletePopup } from "./autoComplete/AutoCompletePopup"
import { isEmpty } from "@/lib/utils"
import type { Prompt, NotificationData, PromptError } from "../types/prompt"

// Singleton instance for compatibility
const serviceFacade = PromptServiceFacade.getInstance()

/**
 * Main widget for prompt history management
 */
export const PromptHistoryWidget: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [pinnedPrompts, setPinnedPrompts] = useState<Prompt[]>([])
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [promptContent, setPromptContent] = useState<string>("")

  /**
   * Initialization process
   */
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        await serviceFacade.initialize()

        if (mounted) {
          // Load initial data
          loadPrompts()
          setTargetElement(serviceFacade.getTextInput())
          setIsInitializing(false)
        }
      } catch (error) {
        if (mounted) {
          setInitError(
            error instanceof Error ? error.message : "Initialization failed",
          )
          setIsInitializing(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      serviceFacade.destroy()
    }
  }, [])

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const handlePromptChange = (_prompt: Prompt) => {
      loadPrompts() // Update prompt list
    }

    const handlePinChange = () => {
      loadPrompts() // Update prompt list
    }

    const handleNotification = (notification: NotificationData) => {
      addNotification(notification)
    }

    const handleError = (error: PromptError) => {
      console.error("SessionManager error:", error)
    }

    const handleContentChange = (content: string) => {
      setPromptContent(content)
    }

    // Register callbacks
    serviceFacade.onPromptChange(handlePromptChange)
    serviceFacade.onPinChange(handlePinChange)
    serviceFacade.onNotification(handleNotification)
    serviceFacade.onError(handleError)
    serviceFacade.onContentChange(handleContentChange)
  }, [])

  /**
   * Load prompt list
   */
  const loadPrompts = async () => {
    try {
      const [allPrompts, pinned] = await Promise.all([
        serviceFacade.getPrompts(),
        serviceFacade.getPinnedPrompts(),
      ])

      setPrompts(allPrompts)
      setPinnedPrompts(pinned)
    } catch (error) {
      console.error("Failed to load prompts:", error)
      addNotification({
        type: "error",
        message: "Failed to load prompts",
        duration: 3000,
      })
    }
  }

  /**
   * Add notification
   */
  const addNotification = (notification: NotificationData) => {
    setNotifications((prev) => [...prev, notification])
  }

  /**
   * Remove notification
   */
  const removeNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index))
  }

  // Display during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-gray-500 dark:text-gray-300 text-sm">
          Loading...
        </div>
      </div>
    )
  }

  // Display initialization error
  if (initError) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200">
        <div className="flex items-center gap-2 text-sm">
          <span>❌</span>
          <span>Failed to initialize: {initError}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <InputPopup
        targetElm={targetElement}
        prompts={prompts}
        pinnedPrompts={pinnedPrompts}
        saveEnabled={!isEmpty(promptContent)}
      />

      {/* Notification system */}
      <NotificationManager
        notifications={notifications}
        onDismiss={removeNotification}
      />

      {/* AutoComplete functionality */}
      {serviceFacade.getDomManager() && (
        <AutoCompletePopup
          domManager={serviceFacade.getDomManager()!}
          prompts={prompts}
        />
      )}
    </>
  )
}
