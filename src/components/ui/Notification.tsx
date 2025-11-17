import React, { useEffect } from 'react';
import './Notification.css';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

interface NotificationProps {
  notification: Notification | null;
  onClose: () => void;
  onClick?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  notification,
  onClose,
  onClick
}) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Автоматически закрывается через 5 секунд

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <div
      className={`notification notification--${notification.type} ${onClick ? 'notification--clickable' : ''}`}
      onClick={onClick}
    >
      <div className="notification__icon">{getIcon()}</div>
      <div className="notification__message">{notification.message}</div>
      <button
        className="notification__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✕
      </button>
    </div>
  );
};

