import React, { useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

import KanbanColumn from './KanbanColumn';
import { Task, TaskStatus, User, Module, TaskCategory } from '../../types';
import { updateTask, stopTimer } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';

interface KanbanBoardProps {
    tasks: Task[];
    projectId: string;
    onTaskClick: (task: Task) => void;
    moduleLookup: Record<string, Module>;
    taskCategories: TaskCategory[];
}

const KanbanBoard = ({ tasks, projectId, onTaskClick, moduleLookup, taskCategories }: KanbanBoardProps) => {
    const { currentUser } = useAuth();
    const [dndError, setDndError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const categoriesMap = useMemo(() => new Map(taskCategories.map(c => [c.id, c])), [taskCategories]);

    const tasksByColumn = useMemo(() => {
        const initialColumns: {
            todo: Task[];
            executing: Task[];
            testing: Task[];
            approved: Task[];
            done: Task[];
        } = { todo: [], executing: [], testing: [], approved: [], done: [] };
        
        return tasks.reduce((acc, task) => {
            if (task.status === 'todo') {
                acc.todo.push(task);
            } else if (task.status === 'done') {
                acc.done.push(task);
            } else if (task.status === 'inprogress') {
                switch(task.subStatus) {
                    case 'executing':
                        acc.executing.push(task);
                        break;
                    case 'testing':
                        acc.testing.push(task);
                        break;
                    case 'approved':
                        acc.approved.push(task);
                        break;
                    default:
                        // Fallback for older tasks without subStatus
                        acc.executing.push(task);
                        break;
                }
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
        console.log("Drag End Event:", event);
        console.log("Item Ativo (arrastado):", active.id);
        console.log("Contêiner Destino (soltado):", over?.id);

        if (over && active.id !== over.id) {
            const taskId = active.id as string;
            const newColumnId = over.id as 'todo' | 'executing' | 'testing' | 'approved' | 'done';
            
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const taskCategory = categoriesMap.get(task.categoryId);
            
            // Validation for testing/approved columns
            if ((newColumnId === 'testing' || newColumnId === 'approved') && !taskCategory?.requiresTesting) {
                setDndError(`A tarefa "${task.title}" não pode ser movida para esta coluna porque sua categoria não requer testes.`);
                return;
            }

            // Validation for blocked tasks
            const isBlocked = blockedStatusLookup[taskId];
            if (isBlocked && newColumnId !== 'todo') {
                 setDndError(`A tarefa "${task.title}" não pode ser iniciada pois está bloqueada por outras tarefas.`);
                return;
            }

            let newStatus: TaskStatus = 'inprogress';
            let newSubStatus: Task['subStatus'] = null;

            switch(newColumnId) {
                case 'todo':
                    newStatus = 'todo';
                    newSubStatus = null;
                    break;
                case 'executing':
                    newStatus = 'inprogress';
                    newSubStatus = 'executing';
                    break;
                case 'testing':
                    newStatus = 'inprogress';
                    newSubStatus = 'testing';
                    break;
                case 'approved':
                    newStatus = 'inprogress';
                    newSubStatus = 'approved';
                    break;
                case 'done':
                    newStatus = 'done';
                    newSubStatus = null;
                    break;
            }
            
            // Prevent redundant updates
            if (task.status === newStatus && task.subStatus === newSubStatus) return;

            try {
                if (newStatus === 'done' && currentUser?.activeTimer?.taskId === taskId) {
                    await stopTimer();
                }
                
                await updateTask(projectId, taskId, { status: newStatus, subStatus: newSubStatus });
            
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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 h-full">
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
                        id="executing"
                        title="Executando"
                        tasks={tasksByColumn.executing || []}
                        onTaskClick={onTaskClick}
                        blockedStatusLookup={blockedStatusLookup}
                        moduleLookup={moduleLookup}
                        currentUser={currentUser}
                    />
                     <KanbanColumn
                        id="testing"
                        title="Em Teste"
                        tasks={tasksByColumn.testing || []}
                        onTaskClick={onTaskClick}
                        blockedStatusLookup={blockedStatusLookup}
                        moduleLookup={moduleLookup}
                        currentUser={currentUser}
                    />
                     <KanbanColumn
                        id="approved"
                        title="Aprovado"
                        tasks={tasksByColumn.approved || []}
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