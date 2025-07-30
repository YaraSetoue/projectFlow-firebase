import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, User, Module } from '../../types';
import SortableTaskItem from './SortableTaskItem';

interface KanbanColumnProps {
    id: string;
    title: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    blockedStatusLookup: Record<string, boolean>;
    moduleLookup: Record<string, Module>;
    currentUser: User | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, tasks, onTaskClick, blockedStatusLookup, moduleLookup, currentUser }) => {
    const { setNodeRef } = useDroppable({ id });
    
    return (
        <div ref={setNodeRef} className="bg-slate-100/50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 px-2">{title} <span className="text-sm text-slate-500">({tasks.length})</span></h2>
            <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-grow space-y-4 min-h-[100px]">
                    {tasks.map(task => (
                        <SortableTaskItem 
                            key={task.id} 
                            id={task.id} 
                            task={task} 
                            onTaskClick={onTaskClick} 
                            blockedStatusLookup={blockedStatusLookup}
                            moduleLookup={moduleLookup}
                            currentUser={currentUser}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

export default KanbanColumn;