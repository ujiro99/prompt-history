import { useState, useEffect, useCallback } from "react"
import type { NotificationData } from "../types/prompt"

interface NotificationProps {
  notification: NotificationData | null
  onDismiss: () => void
}

/**
 * 通知コンポーネント
 */
export const Notification: React.FC<NotificationProps> = ({
  notification,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const dismissNotification = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 500) // アニメーション終了を待つ
  }, [onDismiss])

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsAnimating(true)

      // 自動消去タイマー
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          dismissNotification()
        }, notification.duration)

        return () => clearTimeout(timer)
      }
    } else {
      dismissNotification()
    }
  }, [notification, dismissNotification])

  if (!isVisible || !notification) {
    return null
  }

  const getIcon = (type: NotificationData["type"]): string => {
    switch (type) {
      case "success":
        return "✅"
      case "error":
        return "❌"
      case "warning":
        return "⚠️"
      case "info":
      default:
        return ""
    }
  }

  const getTypeClass = (type: NotificationData["type"]): string => {
    switch (type) {
      case "success":
        return "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-200"
      case "error":
        return "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-200"
      case "warning":
        return "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 text-yellow-800 dark:text-yellow-200"
      case "info":
      default:
        return "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
    }
  }

  return (
    <div
      className={`fixed top-5 right-5 sm:left-auto sm:w-auto left-2.5 w-[calc(100%-1.25rem)] z-[10001] transition-all duration-500 ease-out ${
        isAnimating
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-1/2 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`flex items-center justify-between min-w-[300px] sm:max-w-md max-w-none px-4 py-3 border rounded-lg shadow-xl ${getTypeClass(notification.type)}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 text-base">
            {getIcon(notification.type)}
          </span>
          <span className="text-sm break-words leading-5">
            {notification.message}
          </span>
        </div>
        <button
          className="bg-transparent border-0 text-lg cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded transition-all duration-150 flex-shrink-0 ml-2 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          onClick={dismissNotification}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}

/**
 * 複数通知管理コンポーネント
 */
interface NotificationManagerProps {
  notifications: NotificationData[]
  onDismiss: (index: number) => void
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="relative">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="fixed right-5 sm:left-auto sm:w-auto left-2.5 w-[calc(100%-1.25rem)] z-[10001]"
          style={{ top: `${20 + index * 80}px` }}
        >
          <Notification
            notification={notification}
            onDismiss={() => onDismiss(index)}
          />
        </div>
      ))}
    </div>
  )
}
