import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Check, Search } from 'lucide-react';
import Popover from './Popover';
import Button from './Button';
import Input from './Input';
import Badge from './Badge';

interface Item {
    id: string;
    [key: string]: any;
}

interface MultiSelectPopoverProps<T extends Item> {
    items: T[];
    selectedIds: string[];
    onSelectedIdsChange: (ids: string[]) => void;
    placeholder?: string;
    displayProperty: keyof T;
    disabled?: boolean;
}

const popoverVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15, ease: 'easeIn' } }
};

const MultiSelectPopover = <T extends Item>({
    items,
    selectedIds,
    onSelectedIdsChange,
    placeholder = "Selecione...",
    displayProperty,
    disabled = false
}: MultiSelectPopoverProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Reset search when popover closes
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleToggle = (id: string) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter(sid => sid !== id)
            : [...selectedIds, id];
        onSelectedIdsChange(newSelectedIds);
    };

    const selectedItems = useMemo(
        () => items.filter(item => selectedIds.includes(item.id)),
        [items, selectedIds]
    );

    const filteredItems = useMemo(
        () => items.filter(item =>
            typeof item[displayProperty] === 'string' &&
            (item[displayProperty] as string).toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [items, searchQuery, displayProperty]
    );

    return (
        <Popover isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full">
            <div className="relative">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left h-auto min-h-[40px] py-1 px-2"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap items-center gap-1">
                        {selectedItems.length > 0 ? (
                            selectedItems.map(item => (
                                <Badge key={item.id} className="bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 py-1">
                                    {item[displayProperty]}
                                    <button
                                        type="button"
                                        className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                                        onClick={(e) => { e.stopPropagation(); handleToggle(item.id); }}
                                    >
                                        <X size={12} />
                                    </button>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-slate-500">{placeholder}</span>
                        )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0 ml-2" />
                </Button>
            </div>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                      {...{
                        key: "popover-content",
                        initial: "hidden",
                        animate: "visible",
                        exit: "exit",
                        variants: popoverVariants,
                      } as any}
                      className="absolute top-full mt-2 z-50 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg"
                    >
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                           <div className="relative">
                               <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                               <Input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                    autoFocus
                                />
                           </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                                        onClick={() => handleToggle(item.id)}
                                    >
                                        <span className="truncate">{item[displayProperty]}</span>
                                        {selectedIds.includes(item.id) && <Check className="h-4 w-4 text-brand-500" />}
                                    </div>
                                ))
                            ) : (
                                <p className="p-2 text-center text-sm text-slate-500">Nenhum item encontrado.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Popover>
    );
};

export default MultiSelectPopover;