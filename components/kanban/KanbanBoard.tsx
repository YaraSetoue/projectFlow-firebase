import React, { useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

import KanbanColumn from './KanbanColumn';
import { Task, TaskStatus, User, Module, TaskCategory, SubStatus } from '../../types';
import { updateTask, stopTimer } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';

interface KanbanBoardProps {
    tasks: Task[];
    projectId: string;
    onTaskClick: (task: Task) => void;
    categories: TaskCategory[];
    moduleLookup: Record<string, Module>;
    categoryLookup: Record<string, TaskCategory>;
}

const COLUMN_MAP = {
    todo: { title: 'A Fazer' },
    executing: { title: 'Executando' },
    testing: { title: 'Teste' },
    approved: { title: 'Aprovado' },
    done: { title: 'Concluído' },
};

const KanbanBoard = ({ tasks, projectId, onTaskClick, categories, moduleLookup, categoryLookup }: KanbanBoardProps) => {
    const { currentUser } = useAuth();
    const [dndError, setDndError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const tasksByColumn = useMemo(() => {
        const initialColumns: Record<string, Task[]> = { todo: [], executing: [], testing: [], approved: [], done: [] };
        
        return tasks.reduce((acc, task) => {
            let columnId: string = task.status;
            if (task.status === 'inprogress') {
                columnId = task.subStatus || 'executing';
            }
            if (acc[columnId]) {
                acc[columnId].push(task);
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
            const destColumn = over.data.current?.sortable.containerId || over.id;
            const task = tasks.find(t => t.id === taskId);

            if (!task) return;

            const isBlocked = blockedStatusLookup[taskId];

            if (isBlocked && ['executing', 'testing', 'approved', 'done'].includes(destColumn)) {
                setDndError(`A tarefa "${task.title}" não pode ser iniciada pois está bloqueada por outras tarefas.`);
                return;
            }

            // QA workflow restriction check
            const category = categoryLookup[task.categoryId];
            if (category && !category.requiresTesting && (destColumn === 'testing' || destColumn === 'approved')) {
                setDndError(`Tarefas da categoria "${category.name}" não requerem teste ou aprovação.`);
                return;
            }

            let newStatus: TaskStatus;
            let newSubStatus: SubStatus | null = null;

            if (destColumn === 'todo' || destColumn === 'done') {
                newStatus = destColumn;
                newSubStatus = null;
            } else if (['executing', 'testing', 'approved'].includes(destColumn)) {
                newStatus = 'inprogress';
                newSubStatus = destColumn as SubStatus;
            } else {
                // Invalid drop column
                return;
            }

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
                 <div className="w-full overflow-x-auto pb-4">
                    <div className="flex gap-6 min-w-max h-full">
                        <div className="w-80 flex-shrink-0 h-full">
                             <KanbanColumn
                                id="todo"
                                title="A Fazer"
                                tasks={tasksByColumn.todo || []}
                                onTaskClick={onTaskClick}
                                blockedStatusLookup={blockedStatusLookup}
                                moduleLookup={moduleLookup}
                                categoryLookup={categoryLookup}
                                currentUser={currentUser}
                            />
                        </div>

                        <div className="flex-shrink-0 bg-slate-100/50 dark:bg-slate-900 rounded-lg p-4">
                             <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 px-2">Em Andamento</h2>
                             <div className="flex gap-6">
                                {(['executing', 'testing', 'approved'] as const).map((status) => (
                                    <div key={status} className="w-80 h-full">
                                        <KanbanColumn
                                            id={status}
                                            title={COLUMN_MAP[status].title}
                                            tasks={tasksByColumn[status] || []}
                                            onTaskClick={onTaskClick}
                                            blockedStatusLookup={blockedStatusLookup}
                                            moduleLookup={moduleLookup}
                                            categoryLookup={categoryLookup}
                                            currentUser={currentUser}
                                            isSubColumn={true}
                                        />
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="w-80 flex-shrink-0 h-full">
                             <KanbanColumn
                                id="done"
                                title="Concluído"
                                tasks={tasksByColumn.done || []}
                                onTaskClick={onTaskClick}
                                blockedStatusLookup={blockedStatusLookup}
                                moduleLookup={moduleLookup}
                                categoryLookup={categoryLookup}
                                currentUser={currentUser}
                            />
                        </div>
                    </div>
                 </div>
            </DndContext>
        </>
    );
};

export default KanbanBoard;