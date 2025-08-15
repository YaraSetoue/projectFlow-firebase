

import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy, where } from '@firebase/firestore';
import { PlusCircle, Settings, Loader2, LayoutGrid, List, ChevronDown, Check, FlaskConical } from 'lucide-react';
import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Task, Member, Module, Entity, TaskStatus, Feature, TaskCategory } from '../types';
import KanbanBoard from '../components/kanban/KanbanBoard';
import TaskListView from '../components/views/TaskListView';
import Button from '../components/ui/Button';
import Popover from '../components/ui/Popover';
import CreateTaskModal from '../components/modals/CreateTaskModal';
import TaskDetailModal from '../components/modals/TaskDetailModal';
import ProjectSettingsModal from '../components/modals/ProjectSettingsModal';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';

const ViewSwitcher = ({ viewMode, setViewMode }: { viewMode: 'board' | 'list', setViewMode: (mode: 'board' | 'list') => void }) => (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
        <Button
            onClick={() => setViewMode('board')}
            variant={viewMode === 'board' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 ${viewMode === 'board' ? 'text-white' : 'text-slate-500'}`}
        >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Quadro
        </Button>
        <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={`px-3 ${viewMode === 'list' ? 'text-white' : 'text-slate-500'}`}
        >
            <List className="h-4 w-4 mr-2" />
            Lista
        </Button>
    </div>
);

type SortKey = 'title' | 'assignee' | 'status' | 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const useTaskSorter = (tasks: Task[], members: Member[]) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

    const sortedTasks = useMemo(() => {
        let sortableTasks = [...tasks];
        
        const memberMap = new Map(members.map(m => [m.uid, m.displayName || '']));

        sortableTasks.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'assignee') {
                aValue = a.assignee ? memberMap.get(a.assignee.uid) || '' : '';
                bValue = b.assignee ? memberMap.get(b.assignee.uid) || '' : '';
            } else if (sortConfig.key === 'dueDate' || sortConfig.key === 'createdAt') {
                aValue = a[sortConfig.key]?.toMillis() || -Infinity;
                bValue = b[sortConfig.key]?.toMillis() || -Infinity;
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }
            
            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortableTasks;
    }, [tasks, sortConfig, members]);
    
    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    return { sortedTasks, requestSort, sortConfig };
};


const ProjectDetailPage = () => {
    const { project } = useProject();
    const { currentUser } = useAuth();
    const projectId = project?.id;
    
    if (!projectId) {
        return <div>Projeto não encontrado.</div>;
    }

    const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Popover states
    const [isModuleFilterOpen, setIsModuleFilterOpen] = useState(false);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedModuleId = searchParams.get('module') || 'all';
    const taskIdFromUrl = searchParams.get('task');

    const userRole = project && currentUser ? project.members[currentUser.uid]?.role : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';
    
    // This query fetches all tasks for the project and is used for dependency lookups
    const allTasksForProjectQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'tasks')),
        [projectId]
    );
    const { data: allTasksForDependencies } = useFirestoreQuery<Task>(allTasksForProjectQuery);

    // This query fetches the tasks to be displayed, applying filters if needed.
    const tasksQuery = useMemo(() => {
        const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
    
        // For a specific module, filter by it. This requires a composite index.
        if (selectedModuleId && selectedModuleId !== 'all' && selectedModuleId !== 'none') {
            return query(tasksCollectionRef, where('moduleId', '==', selectedModuleId), orderBy('createdAt', 'asc'));
        }
        
        // For 'all' or 'none' filters, fetch all tasks and sort. 'none' is filtered on the client.
        return query(tasksCollectionRef, orderBy('createdAt', 'asc'));
    }, [projectId, selectedModuleId]);
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);
    
    const modulesQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: modules, loading: modulesLoading } = useFirestoreQuery<Module>(modulesQuery);

    const entitiesQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'entities'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: entities, loading: entitiesLoading } = useFirestoreQuery<Entity>(entitiesQuery);
    
    const featuresQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'features'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: features, loading: featuresLoading } = useFirestoreQuery<Feature>(featuresQuery);

    const categoriesQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'taskCategories'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: categories, loading: categoriesLoading } = useFirestoreQuery<TaskCategory>(categoriesQuery);

    const projectMembers = useMemo(() => {
        if (!project?.members) return [];
        return Object.values(project.members);
    }, [project]);

    // Effect to open task modal from URL
    useEffect(() => {
        if (taskIdFromUrl && allTasksForDependencies && !selectedTask) {
            const taskToOpen = allTasksForDependencies.find(t => t.id === taskIdFromUrl);
            if (taskToOpen) {
                setSelectedTask(taskToOpen);
                // Clean up URL to avoid re-opening on close
                searchParams.delete('task');
                setSearchParams(searchParams, { replace: true });
            }
        }
    }, [taskIdFromUrl, allTasksForDependencies, selectedTask, setSearchParams, searchParams]);
    
    const handleCloseTaskModal = () => {
        setSelectedTask(null);
        // Clean up URL if modal was opened via URL
        if (searchParams.get('task')) {
            searchParams.delete('task');
            setSearchParams(searchParams, { replace: true });
        }
    };

    const moduleFilteredTasks = useMemo(() => {
        if (!tasks) return [];
        
        // The 'none' case is the only one needing client-side filtering,
        // as the query fetches all tasks when 'none' is selected.
        if (selectedModuleId === 'none') {
            return tasks.filter(task => !task.moduleId);
        }

        // For 'all' and specific module filters, the data is already filtered and sorted
        // by the Firestore query. No further action needed.
        return tasks;
    }, [tasks, selectedModuleId]);

    const filteredTasks = useMemo(() => {
        if (!moduleFilteredTasks) return [];

        if (statusFilter === 'all') {
            return moduleFilteredTasks;
        }

        return moduleFilteredTasks.filter(task => task.status === statusFilter);
    }, [moduleFilteredTasks, statusFilter]);

    const moduleLookup = useMemo(() => {
        const lookup: Record<string, Module> = {};
        if (modules) {
            modules.forEach(module => {
                lookup[module.id] = module;
            });
        }
        return lookup;
    }, [modules]);
    
    const moduleFilterOptions = useMemo(() => [
        { id: 'all', name: 'Todos os Módulos' },
        { id: 'none', name: 'Tarefas sem Módulo' },
        ...(modules || [])
    ], [modules]);

    const statusFilterOptions = [
        { id: 'all', name: 'Todos os Status' },
        { id: 'todo', name: 'A Fazer' },
        { id: 'inprogress', name: 'Em Progresso' },
        { id: 'ready_for_qa', name: 'Pronto para QA' },
        { id: 'in_testing', name: 'Em Teste' },
        { id: 'approved', name: 'Aprovado' },
        { id: 'done', name: 'Concluído' },
    ];
    
    const selectedModuleName = useMemo(() => {
        return moduleFilterOptions.find(opt => opt.id === selectedModuleId)?.name || 'Todos os Módulos';
    }, [selectedModuleId, moduleFilterOptions]);

    const selectedStatusName = useMemo(() => {
        return statusFilterOptions.find(opt => opt.id === statusFilter)?.name || 'Todos os Status';
    }, [statusFilter]);

    // State and logic for TaskListView
    const { sortedTasks, requestSort, sortConfig } = useTaskSorter(filteredTasks, projectMembers);
    
    const loading = tasksLoading || modulesLoading || entitiesLoading || featuresLoading || categoriesLoading;

    // Check for tasks in 'in_testing' state to show the link
    const tasksInTestingCount = useMemo(() => {
        if (!tasks) return 0;
        return tasks.filter(task => task.status === 'in_testing').length;
    }, [tasks]);

    return (
        <motion.div
            {...{
                initial: { opacity: 0 },
                animate: { opacity: 1 },
            } as any}
            className="flex flex-col h-full"
        >
             <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 lg:p-8 border-b border-slate-200 dark:border-slate-800">
                 <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        Tarefas
                    </h1>
                     <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                     {tasksInTestingCount > 0 && (
                         <Link to={`/project/${projectId}/testing`} className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                            <FlaskConical size={16} />
                            {tasksInTestingCount} tarefa{tasksInTestingCount > 1 ? 's' : ''} em teste
                         </Link>
                     )}
                </div>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <Popover
                            isOpen={isModuleFilterOpen}
                            onClose={() => setIsModuleFilterOpen(false)}
                            trigger={
                                <Button type="button" variant="outline" className="w-full sm:w-48 justify-between text-left font-normal" onClick={() => setIsModuleFilterOpen(true)} disabled={modulesLoading}>
                                    <span className="truncate">{selectedModuleName}</span>
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                </Button>
                            }>
                             <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {moduleFilterOptions.map(opt => (
                                    <div key={opt.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setSearchParams({ module: opt.id }); setIsModuleFilterOpen(false); }}>
                                        <span className="truncate">{opt.name}</span>
                                        {selectedModuleId === opt.id && <Check className="h-4 w-4 text-brand-500" />}
                                    </div>
                                ))}
                            </div>
                        </Popover>
                        
                         <Popover
                            isOpen={isStatusFilterOpen}
                            onClose={() => setIsStatusFilterOpen(false)}
                            trigger={
                                <Button type="button" variant="outline" className="w-full sm:w-48 justify-between text-left font-normal" onClick={() => setIsStatusFilterOpen(true)} disabled={loading}>
                                    <span className="truncate">{selectedStatusName}</span>
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                </Button>
                            }>
                             <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {statusFilterOptions.map(opt => (
                                    <div key={opt.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setStatusFilter(opt.id as any); setIsStatusFilterOpen(false); }}>
                                        <span className="truncate">{opt.name}</span>
                                        {statusFilter === opt.id && <Check className="h-4 w-4 text-brand-500" />}
                                    </div>
                                ))}
                            </div>
                        </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => setCreateTaskModalOpen(true)} 
                            size="sm"
                            className="flex-1"
                            disabled={!isEditor}
                            title={!isEditor ? "Apenas editores ou proprietários podem criar tarefas." : ""}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
                        </Button>
                        <Button 
                            onClick={() => setSettingsModalOpen(true)} 
                            variant="outline" 
                            size="icon" 
                            aria-label="Configurações do Projeto"
                            disabled={!isEditor}
                            title={!isEditor ? "Apenas editores ou proprietários podem alterar as configurações." : ""}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow">
                 {loading ? (
                    <div className="flex justify-center items-center py-10 px-4 sm:px-6 lg:px-8"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
                 ) : tasksError ? (
                    <div className="p-4 sm:p-6 lg:p-8"><ConnectionErrorState error={tasksError} context="tarefas do projeto" /></div>
                 ) : viewMode === 'board' ? (
                     <div className="px-4 sm:px-6 lg:px-8 py-6 h-full"><KanbanBoard tasks={filteredTasks} projectId={projectId} onTaskClick={setSelectedTask} moduleLookup={moduleLookup} taskCategories={categories || []} /></div>
                ) : (
                    sortedTasks.length > 0 ? (
                        <div className="pt-6 px-4 sm:px-6 lg:p-8 pb-8">
                            <TaskListView 
                                tasks={sortedTasks}
                                onTaskClick={setSelectedTask} 
                                moduleLookup={moduleLookup}
                                projectMembers={projectMembers}
                                isEditor={isEditor}
                                currentUser={currentUser}
                                sortConfig={sortConfig}
                                requestSort={requestSort}
                            />
                        </div>
                    ) : (
                         <p className="text-center text-slate-500 py-10 px-4 sm:px-6 lg:p-8">Nenhuma tarefa encontrada para os filtros selecionados.</p>
                    )
                )}
            </main>

            
            {isCreateTaskModalOpen && (
                <CreateTaskModal
                    isOpen={isCreateTaskModalOpen}
                    onClose={() => setCreateTaskModalOpen(false)}
                    projectId={projectId}
                    projectName={project.name}
                    projectMembers={projectMembers}
                    modules={modules || []}
                    features={features || []}
                    categories={categories || []}
                />
            )}
            
            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={handleCloseTaskModal}
                    onNavigateToTask={setSelectedTask}
                    taskId={selectedTask.id}
                    projectId={projectId}
                    project={project}
                    projectMembers={projectMembers}
                    allTasks={allTasksForDependencies || []}
                    modules={modules || []}
                    entities={entities || []}
                    categories={categories || []}
                />
            )}

            {isSettingsModalOpen && (
                <ProjectSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setSettingsModalOpen(false)}
                    project={project}
                />
            )}
        </motion.div>
    );
};

export default ProjectDetailPage;
