import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className }) => {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ${className || ''}`}
        >
            {children}
        </div>
    );
};

export default Badge;