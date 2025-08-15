

import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy, where, getDocs } from '@firebase/firestore';
import { FlaskConical, Loader2, ListChecks } from 'lucide-react';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { Feature, Task, Module, Entity, Member, User, TaskCategory, MemberRole } from '../types';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import FeatureTestItem from '../components/FeatureTestItem';
import TaskDetailModal from '../components/modals/TaskDetailModal';


const EmptyState = () => (
    <motion.div
        {...{
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
        } as any}
        className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm"
    >
        <ListChecks className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Fila de Testes Vazia</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
            Ótimo trabalho! Não há funcionalidades aguardando testes no momento.
        </p>
    </motion.div>
);

const TestingPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const { project } = useProject();
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const userRole = project && currentUser ? project.members[currentUser.uid] : undefined;
    const isEditor = userRole?.role === 'editor' || userRole?.role === 'owner';

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Queries
    const featuresQuery = useMemo(() => query(collection(db, 'projects', projectId, 'features'), where('status', '==', 'in_testing'), orderBy('createdAt', 'asc')), [projectId]);
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);

    const tasksQuery = useMemo(() => query(collection(db, 'projects', projectId, 'tasks')), [projectId]);
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);

    const modulesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')), [projectId]);
    const { data: modules, loading: modulesLoading, error: modulesError } = useFirestoreQuery<Module>(modulesQuery);
    
    // Data needed for TaskDetailModal
    const { data: allTasksForDependencies } = useFirestoreQuery<Task>(tasksQuery); // Re-use the tasks query
    
    const entitiesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'entities'), orderBy('name', 'asc')), [projectId]);
    const { data: entities, loading: entitiesLoading, error: entitiesError } = useFirestoreQuery<Entity>(entitiesQuery);
    
    const categoriesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'taskCategories'), orderBy('name', 'asc')), [projectId]);
    const { data: categories, loading: categoriesLoading, error: categoriesError } = useFirestoreQuery<TaskCategory>(categoriesQuery);

    const [projectMembers, setProjectMembers] = useState<Member[]>([]);
    
    // Effect to open task modal from URL, which is not directly used here but good practice to keep
    const taskIdFromUrl = searchParams.get('task');
     useEffect(() => {
        if (taskIdFromUrl && tasks && !selectedTask) {
            const taskToOpen = tasks.find(t => t.id === taskIdFromUrl);
            if (taskToOpen) {
                setSelectedTask(taskToOpen);
            }
        }
    }, [taskIdFromUrl, tasks, selectedTask]);

    const modulesMap = useMemo(() => {
        return new Map(modules?.map(m => [m.id, m]));
    }, [modules]);
    
    const loading = featuresLoading || tasksLoading || modulesLoading || entitiesLoading || categoriesLoading;
    const error = featuresError || tasksError || modulesError || entitiesError || categoriesError;

    // We only need to fetch members when a task is selected to open the modal.
    useEffect(() => {
        if (!selectedTask || !project.memberUids?.length) return;
        const fetchMembers = async () => {
            const usersRef = collection(db, 'users');
            const uids = project.memberUids;
            const usersData: User[] = [];
            for (let i = 0; i < uids.length; i += 30) {
                const chunk = uids.slice(i, i + 30);
                const q = query(usersRef, where('uid', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => usersData.push(doc.data() as User));
            }
            const detailedMembers = usersData.map(user => ({
                ...user,
                role: project.members[user.uid].role,
            })).filter(m => m.role);
            setProjectMembers(detailedMembers as Member[]);
        };
        fetchMembers();
    }, [selectedTask, project]);

    const handleCloseTaskModal = () => {
        setSelectedTask(null);
        searchParams.delete('task');
        setSearchParams(searchParams, { replace: true });
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
    if (error) return <div className="p-8"><ConnectionErrorState error={error} context="página de testes" /></div>;

    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3 mb-8">
                <FlaskConical /> Dashboard de Quality Assurance
            </h1>
            
            <div className="space-y-4">
                {features && features.length > 0 ? (
                    features.map(feature => (
                        <FeatureTestItem
                            key={feature.id}
                            feature={feature}
                            tasks={tasks?.filter(t => t.featureId === feature.id) || []}
                            module={feature.moduleId ? modulesMap.get(feature.moduleId) : undefined}
                            isEditor={isEditor}
                            projectId={projectId}
                        />
                    ))
                ) : (
                    <EmptyState />
                )}
            </div>

            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={handleCloseTaskModal}
                    onNavigateToTask={setSelectedTask} // Allow navigation between tasks from modal
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
        </motion.div>
    );
};

export default TestingPage;
