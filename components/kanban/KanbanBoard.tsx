import React, { useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

import KanbanColumn from './KanbanColumn';
import { Task, TaskStatus, User, Module } from '../../types';
import { updateTask, stopTimer } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';

interface KanbanBoardProps {
    tasks: Task[];
    projectId: string;
    onTaskClick: (task: Task) => void;
    moduleLookup: Record<string, Module>;
}

const KanbanBoard = ({ tasks, projectId, onTaskClick, moduleLookup }: KanbanBoardProps) => {
    const { currentUser } = useAuth();
    const [dndError, setDndError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const tasksByColumn = useMemo(() => {
        const initialColumns: Record<TaskStatus, Task[]> = { todo: [], inprogress: [], done: [] };
        
        return tasks.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialColumns);

    }, [tasks]);

    const blockedStatusLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        const tasksById = new Map(tasks.map(t => [t.id, t]));

        tasks.forEach(task => {
            const blockingDeps = task.dependencies?.filter(d => d.type === 'blocked_by');
            if (blockingDeps && blockingDeps.length > 0) {
                lookup[task.id] = blockingDeps.some(dep => {
                    const dependencyTask = tasksById.get(dep.taskId);
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
            const taskId = active.id as string;
            const newStatus = over.data.current?.sortable.containerId || over.id as TaskStatus;
            const task = tasks.find(t => t.id === taskId);

            if (!task) return;
            if (task.status === newStatus) return;

            const isBlocked = blockedStatusLookup[taskId];

            if (isBlocked && (newStatus === 'inprogress' || newStatus === 'done')) {
                setDndError(`A tarefa "${task.title}" não pode ser iniciada pois está bloqueada por outras tarefas.`);
                return;
            }

            try {
                if (newStatus === 'done' && currentUser?.activeTimer?.taskId === taskId) {
                    await stopTimer();
                }
                
                await updateTask(projectId, taskId, { status: newStatus });
            
            } catch (err: any) {
                console.error("Failed to update task status:", err);
                setDndError(err.message || "Não foi possível salvar a movimentação da tarefa. Verifique sua conexão e tente novamente.");
            }
        }
    };

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
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <KanbanColumn
                        id="todo"
                        title="A Fazer"
                        tasks={tasksByColumn.todo || []}
                        onTaskClick={onTaskClick}
                        blockedStatusLookup={blockedStatusLookup}
                        moduleLookup={moduleLookup}
                        currentUser={currentUser}
                    />
                    <KanbanColumn
                        id="inprogress"
                        title="Em Andamento"
                        tasks={tasksByColumn.inprogress || []}
                        onTaskClick={onTaskClick}
                        blockedStatusLookup={blockedStatusLookup}
                        moduleLookup={moduleLookup}
                        currentUser={currentUser}
                    />
                    <KanbanColumn
                        id="done"
                        title="Concluído"
                        tasks={tasksByColumn.done || []}
                        onTaskClick={onTaskClick}
                        blockedStatusLookup={blockedStatusLookup}
                        moduleLookup={moduleLookup}
                        currentUser={currentUser}
                    />
                </div>
            </DndContext>
        </>
    );
};

export default KanbanBoard;