import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className={`bottom-sheet ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet__handle" />
        {title && (
          <div className="bottom-sheet__header">
            <h2 className="bottom-sheet__title">{title}</h2>
            <button className="bottom-sheet__close" onClick={onClose}>×</button>
          </div>
        )}
        <div className="bottom-sheet__content">
          {children}
        </div>
      </div>
    </div>
  );
};

