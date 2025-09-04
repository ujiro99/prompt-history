import { useState, useEffect } from "react"
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
  }, [notification])

  const dismissNotification = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // アニメーション終了を待つ
  }

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
        return "ℹ️"
    }
  }

  const getTypeClass = (type: NotificationData["type"]): string => {
    switch (type) {
      case "success":
        return "notification-success"
      case "error":
        return "notification-error"
      case "warning":
        return "notification-warning"
      case "info":
      default:
        return "notification-info"
    }
  }

  return (
    <div
      className={`notification-container ${isAnimating ? "notification-show" : "notification-hide"}`}
    >
      <div className={`notification ${getTypeClass(notification.type)}`}>
        <div className="notification-content">
          <span className="notification-icon">
            {getIcon(notification.type)}
          </span>
          <span className="notification-message">{notification.message}</span>
        </div>
        <button
          className="notification-dismiss"
          onClick={dismissNotification}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      <style>{`
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10001;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          pointer-events: none;
        }

        .notification-show {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
        }

        .notification-hide {
          transform: translateX(100%);
          opacity: 0;
        }

        .notification {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 300px;
          max-width: 400px;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .notification-icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .notification-message {
          font-size: 14px;
          font-weight: 500;
          word-break: break-word;
          line-height: 1.4;
        }

        .notification-dismiss {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.15s ease;
          flex-shrink: 0;
          margin-left: 8px;
          opacity: 0.7;
        }

        .notification-dismiss:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.1);
        }

        /* 通知タイプ別スタイル */
        .notification-success {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
        }

        .notification-error {
          background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
          color: #991b1b;
        }

        .notification-warning {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #92400e;
        }

        .notification-info {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1e40af;
        }

        /* ダークモード対応 */
        @media (prefers-color-scheme: dark) {
          .notification {
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .notification-success {
            background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
            color: #6ee7b7;
          }

          .notification-error {
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            color: #fca5a5;
          }

          .notification-warning {
            background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
            color: #fbbf24;
          }

          .notification-info {
            background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
            color: #93c5fd;
          }

          .notification-dismiss:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }

        /* モバイル対応 */
        @media (max-width: 640px) {
          .notification-container {
            top: 10px;
            right: 10px;
            left: 10px;
          }

          .notification {
            min-width: auto;
            max-width: none;
          }
        }
      `}</style>
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
    <div className="notification-manager">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="notification-wrapper"
          style={{ top: `${20 + index * 80}px` }}
        >
          <Notification
            notification={notification}
            onDismiss={() => onDismiss(index)}
          />
        </div>
      ))}

      <style>{`
        .notification-manager {
          position: relative;
        }

        .notification-wrapper {
          position: fixed;
          right: 20px;
          z-index: 10001;
        }

        /* モバイル対応 */
        @media (max-width: 640px) {
          .notification-wrapper {
            right: 10px;
            left: 10px;
          }
        }
      `}</style>
    </div>
  )
}
