
import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  colorClass?: string;
  heightClass?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, colorClass = 'bg-brand-500', heightClass = 'h-1.5' }) => {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full ${heightClass} overflow-hidden`}>
      <div
        className={`rounded-full transition-all duration-500 ${colorClass} ${heightClass}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
