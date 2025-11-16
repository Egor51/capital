import React from 'react';

type TagVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={`tag tag--${variant} ${className}`}>
      {children}
    </span>
  );
};

