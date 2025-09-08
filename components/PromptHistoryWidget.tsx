import { useState, useEffect } from "react"
import { PromptServiceFacade } from "../services/promptServiceFacade"
import { InputPopup } from "./InputPopup"
import { NotificationManager } from "./Notification"

// Singleton instance for compatibility
const serviceFacade = PromptServiceFacade.getInstance()

import type { Prompt, NotificationData, PromptError } from "../types/prompt"

/**
 * Main widget for prompt history management
 */
export const PromptHistoryWidget: React.FC = () => {
  // State management
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [pinnedPrompts, setPinnedPrompts] = useState<Prompt[]>([])
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

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
    }
  }, [])

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const handlePromptSave = (_prompt: Prompt) => {
      loadPrompts() // Update prompt list
    }

    const handleNotification = (notification: NotificationData) => {
      addNotification(notification)
    }

    const handleError = (error: PromptError) => {
      console.error("SessionManager error:", error)
    }

    // Register callbacks
    serviceFacade.onPromptSave(handlePromptSave)
    serviceFacade.onNotification(handleNotification)
    serviceFacade.onError(handleError)

    // Cleanup is not automatic, manual implementation required
    return () => {
      // Note: Implement unsubscribe functionality here if available
    }
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
        saveEnabled={serviceFacade.getPromptContent() !== null}
      />

      {/* Notification system */}
      <NotificationManager
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </>
  )
}
