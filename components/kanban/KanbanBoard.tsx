import React, { useMemo, useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

import KanbanColumn from './kanbanColumn';
import { Task, TaskStatus, User, Module, TaskCategory } from '../../types';
import { updateTask } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';

interface KanbanBoardProps {
    tasks: Task[];
    projectId: string;
    onTaskClick: (task: Task) => void;
    moduleLookup: Record<string, Module>;
    taskCategories: TaskCategory[];
}

const KanbanBoard = ({ tasks: tasksFromFirestore, projectId, onTaskClick, moduleLookup, taskCategories }: KanbanBoardProps) => {
    const { currentUser } = useAuth();
    const [dndError, setDndError] = useState<string | null>(null);
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    useEffect(() => {
      if (tasksFromFirestore) {
        setLocalTasks(tasksFromFirestore);
      }
    }, [tasksFromFirestore]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const categoriesMap = useMemo(() => new Map(taskCategories.map(c => [c.id, c])), [taskCategories]);

    const tasksByColumn = useMemo(() => {
        const initialColumns: Record<TaskStatus, Task[]> = { 
            todo: [], 
            inprogress: [], 
            ready_for_qa: [], 
            in_testing: [],
            approved: [],
            done: []
        };
        
        return localTasks.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialColumns);

    }, [localTasks]);

    const blockedStatusLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        const tasksById = new Map(localTasks.map(t => [t.id, t]));

        localTasks.forEach(task => {
            const blockingDeps = task.dependencies?.filter(d => d.type === 'blocked_by');
            if (blockingDeps && blockingDeps.length > 0) {
                lookup[task.id] = blockingDeps.some(dep => {
                    const dependencyTask = tasksById.get(dep.taskId);
                    return dependencyTask && dependencyTask.status !== 'done';
                });
            }
        });
        return lookup;
    }, [localTasks]);
    
    const handleDragStart = (event: DragStartEvent) => {
        setDndError(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!active || !over) return;
    
        const taskId = active.id as string;
        const task = localTasks.find(t => t.id === taskId);
        if (!task) return;
    
        const overId = over.id as string;
    
        // Determine the new status. If `overId` is a column ID, use it.
        // Otherwise, find the task we're dropping on and use its status.
        const newStatus = (Object.keys(tasksByColumn).includes(overId))
          ? overId as TaskStatus
          : localTasks.find(t => t.id === overId)?.status;
    
        if (!newStatus || task.status === newStatus) {
          return;
        }

        // Validation logic
        if (['in_testing', 'approved', 'done'].includes(newStatus) && !task.featureId) {
            setDndError("Apenas tarefas associadas a uma funcionalidade podem ser movidas para Teste, Aprovado ou Concluído.");
            return;
        }
        
        const isBlocked = blockedStatusLookup[taskId];
        if (isBlocked && newStatus !== 'todo') {
             setDndError(`A tarefa "${task.title}" não pode ser iniciada pois está bloqueada por outras tarefas.`);
            return;
        }

        // 1. Optimistic update on local state
        const updatedTasks = localTasks.map(t => 
            t.id === taskId ? { ...t, status: newStatus } : t
        );
        setLocalTasks(updatedTasks);

        // 2. Backend call in the background
        updateTask(projectId, taskId, { status: newStatus })
            .catch(error => {
                console.error("Falha ao atualizar a tarefa:", error);
                // On failure, revert local state to the original from Firestore
                setLocalTasks(tasksFromFirestore || []);
                setDndError("Não foi possível mover a tarefa. A alteração foi desfeita.");
            });
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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 h-full">
                    <KanbanColumn id="todo" title="A Fazer" tasks={tasksByColumn.todo} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                    <KanbanColumn id="inprogress" title="Em Progresso" tasks={tasksByColumn.inprogress} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                    <KanbanColumn id="ready_for_qa" title="Pronto para QA" tasks={tasksByColumn.ready_for_qa} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                    <KanbanColumn id="in_testing" title="Em Teste" tasks={tasksByColumn.in_testing} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                    <KanbanColumn id="approved" title="Aprovado" tasks={tasksByColumn.approved} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                    <KanbanColumn id="done" title="Concluído" tasks={tasksByColumn.done} onTaskClick={onTaskClick} blockedStatusLookup={blockedStatusLookup} moduleLookup={moduleLookup} currentUser={currentUser} />
                </div>
            </DndContext>
        </>
    );
};

export default KanbanBoard;