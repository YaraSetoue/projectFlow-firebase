import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Task, User, Module } from '../../types';

interface SortableTaskItemProps {
    id: string;
    task: Task;
    onTaskClick: (task: Task) => void;
    blockedStatusLookup: Record<string, boolean>;
    moduleLookup: Record<string, Module>;
    currentUser: User | null;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ id, task, onTaskClick, blockedStatusLookup, moduleLookup, currentUser }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id, data: { type: 'Task', task }});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto'
    };

    const isBlocked = blockedStatusLookup[task.id] || false;
    const moduleInfo = task.moduleId ? moduleLookup[task.moduleId] : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <TaskCard 
                task={task} 
                onClick={() => onTaskClick(task)} 
                isDragging={isDragging} 
                isBlocked={isBlocked} 
                moduleInfo={moduleInfo}
                dragHandleListeners={listeners}
                currentUser={currentUser}
            />
        </div>
    );
};

export default SortableTaskItem;