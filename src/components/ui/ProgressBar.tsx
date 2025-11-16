import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'default'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="progress-bar">
      {label && <div className="progress-bar__label">{label}</div>}
      <div className="progress-bar__container">
        <div
          className={`progress-bar__fill progress-bar__fill--${variant}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="progress-bar__value">{Math.round(percentage)}%</div>
      )}
    </div>
  );
};

