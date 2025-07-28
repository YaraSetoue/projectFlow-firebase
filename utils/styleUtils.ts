// utils/styleUtils.ts

export const MODULE_ICON_OPTIONS = [
    'module', 'bug', 'zap', 'book', 'file', 'code', 'users', 'database', 'shield', 'settings', 'message-square'
];

export const MODULE_COLOR_OPTIONS = [
    'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
];

// Map color names to Tailwind CSS classes
export const MODULE_COLOR_MAP: Record<string, { bg: string, text: string, border: string, badge: string }> = {
    gray:     { bg: 'bg-slate-500',    text: 'text-slate-500',    border: 'border-slate-500',    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    red:      { bg: 'bg-red-500',      text: 'text-red-500',      border: 'border-red-500',      badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
    orange:   { bg: 'bg-orange-500',   text: 'text-orange-500',   border: 'border-orange-500',   badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' },
    amber:    { bg: 'bg-amber-500',    text: 'text-amber-500',    border: 'border-amber-500',    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    yellow:   { bg: 'bg-yellow-500',   text: 'text-yellow-500',   border: 'border-yellow-500',   badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300' },
    lime:     { bg: 'bg-lime-500',     text: 'text-lime-500',     border: 'border-lime-500',     badge: 'bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300' },
    green:    { bg: 'bg-green-500',    text: 'text-green-500',    border: 'border-green-500',    badge: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' },
    emerald:  { bg: 'bg-emerald-500',  text: 'text-emerald-500',  border: 'border-emerald-500',  badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    teal:     { bg: 'bg-teal-500',     text: 'text-teal-500',     border: 'border-teal-500',     badge: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
    cyan:     { bg: 'bg-cyan-500',     text: 'text-cyan-500',     border: 'border-cyan-500',     badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' },
    sky:      { bg: 'bg-sky-500',      text: 'text-sky-500',      border: 'border-sky-500',      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
    blue:     { bg: 'bg-blue-500',     text: 'text-blue-500',     border: 'border-blue-500',     badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
    indigo:   { bg: 'bg-indigo-500',   text: 'text-indigo-500',   border: 'border-indigo-500',   badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
    violet:   { bg: 'bg-violet-500',   text: 'text-violet-500',   border: 'border-violet-500',   badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
    purple:   { bg: 'bg-purple-500',   text: 'text-purple-500',   border: 'border-purple-500',   badge: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
    fuchsia:  { bg: 'bg-fuchsia-500',  text: 'text-fuchsia-500',  border: 'border-fuchsia-500',  badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300' },
    pink:     { bg: 'bg-pink-500',     text: 'text-pink-500',     border: 'border-pink-500',     badge: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' },
    rose:     { bg: 'bg-rose-500',     text: 'text-rose-500',     border: 'border-rose-500',     badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
};
