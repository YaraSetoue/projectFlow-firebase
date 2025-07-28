import React, { useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

import KanbanColumn from './KanbanColumn';
import { Task, TaskStatus, User, Module } from '../../types';
import { updateTask, stopTimer } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import ConnectionErrorState from '../ui/ConnectionErrorState';

interface KanbanBoardProps {
    tasks: Task[];
    loading: boolean;
    projectId: string;
    onTaskClick: (task: Task) => void;
    error: Error | null;
    moduleLookup: Record<string, Module>;
}

const COLUMN_TITLES: Record<TaskStatus, string> = {
    todo: 'A Fazer',
    inprogress: 'Em Andamento',
    done: 'Concluído',
};

const KanbanBoard = ({ tasks, loading, projectId, onTaskClick, error, moduleLookup }: KanbanBoardProps) => {
    const { currentUser } = useAuth();
    const [dndError, setDndError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const tasksByStatus = useMemo(() => {
        const initialColumns: Record<TaskStatus, Task[]> = {
            todo: [],
            inprogress: [],
            done: [],
        };
        return tasks.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialColumns);
    }, [tasks]);

    const blockedStatusLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        tasks.forEach(task => {
            if (task.dependsOn && task.dependsOn.length > 0) {
                lookup[task.id] = task.dependsOn.some(depId => {
                    const dependencyTask = tasks.find(t => t.id === depId);
                    // A task is blocked if its dependency exists and is not 'done'
                    return dependencyTask && dependencyTask.status !== 'done';
                });
            }
        });
        return lookup;
    }, [tasks]);
    
    const handleDragStart = (event: DragStartEvent) => {
        setDndError(null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const activeContainer = active.data.current?.sortable.containerId;
            const overContainer = over.data.current?.sortable.containerId || over.id;
            
            if(activeContainer !== overContainer) {
                const taskId = active.id as string;
                const newStatus = overContainer as TaskStatus;
                const task = tasks.find(t => t.id === taskId);

                if (!task) return;

                const isBlocked = blockedStatusLookup[taskId];

                if (isBlocked && (newStatus === 'inprogress' || newStatus === 'done')) {
                    setDndError(`A tarefa "${task.title}" está bloqueada e não pode ser movida para esta coluna.`);
                    return; // Prevent the update
                }

                try {
                    // Check if moving to 'done' and the user's active timer is for this task
                    if (newStatus === 'done' && currentUser?.activeTimer?.taskId === taskId) {
                        await stopTimer();
                    }
                    
                    await updateTask(projectId, taskId, { status: newStatus });
                
                } catch (err: any) {
                    console.error("Failed to update task status:", err);
                    setDndError(err.message || "Não foi possível salvar a movimentação da tarefa. Verifique sua conexão e tente novamente.");
                }
            }
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
    }

    if (error) {
        return <ConnectionErrorState error={error} context="tarefas do projeto" />;
    }

    return (
        <>
            <AnimatePresence>
                {dndError && (
                    <motion.div
                        {...{
                            initial: { opacity: 0, y: -20 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, y: -20 },
                        } as any}
                        className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-md relative mb-4 flex justify-between items-center"
                        role="alert"
                    >
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            <span className="block sm:inline">{dndError}</span>
                        </div>
                        <button onClick={() => setDndError(null)} className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
                            <XCircle className="h-5 w-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(Object.keys(COLUMN_TITLES) as TaskStatus[]).map((status) => (
                        <KanbanColumn
                            key={status}
                            id={status}
                            title={COLUMN_TITLES[status]}
                            tasks={tasksByStatus[status]}
                            onTaskClick={onTaskClick}
                            blockedStatusLookup={blockedStatusLookup}
                            moduleLookup={moduleLookup}
                            currentUser={currentUser}
                        />
                    ))}
                </div>
            </DndContext>
        </>
    );
};

export default KanbanBoard;