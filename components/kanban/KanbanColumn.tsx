import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, User, Module, TaskCategory } from '../../types';
import SortableTaskItem from './SortableTaskItem';

interface KanbanColumnProps {
    id: string;
    title: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    blockedStatusLookup: Record<string, boolean>;
    moduleLookup: Record<string, Module>;
    categoryLookup: Record<string, TaskCategory>;
    currentUser: User | null;
    isSubColumn?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, tasks, onTaskClick, blockedStatusLookup, moduleLookup, categoryLookup, currentUser, isSubColumn = false }) => {
    const { setNodeRef } = useDroppable({ id });
    
    const columnClasses = isSubColumn
        ? "flex flex-col h-full"
        : "bg-slate-100/50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full";

    const headerClasses = isSubColumn
        ? "text-md font-semibold text-slate-700 dark:text-slate-200 mb-4 px-2"
        : "text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 px-2";

    const containerClasses = isSubColumn
        ? "flex-grow space-y-4 min-h-[100px]"
        : "flex-grow space-y-4 min-h-[100px]";

    return (
        <div ref={setNodeRef} className={columnClasses}>
            <h2 className={headerClasses}>{title} <span className="text-sm text-slate-500">({tasks.length})</span></h2>
            <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className={containerClasses}>
                    {tasks.map(task => (
                        <SortableTaskItem 
                            key={task.id} 
                            id={task.id} 
                            task={task} 
                            onTaskClick={onTaskClick} 
                            blockedStatusLookup={blockedStatusLookup}
                            moduleLookup={moduleLookup}
                            categoryLookup={categoryLookup}
                            currentUser={currentUser}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

export default KanbanColumn;