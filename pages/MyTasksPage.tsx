

import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, collectionGroup, query, where, getDocs, getDoc, doc, orderBy } from '@firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/config';
import { Task, Project, Member, User, Module, Entity } from '../types';
import { Loader2, CheckSquare } from 'lucide-react';
import TaskCard from '../components/kanban/TaskCard';
import TaskDetailModal from '../components/modals/TaskDetailModal';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';

const MyTasksPage = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectsMap, setProjectsMap] = useState<Record<string, Project>>({});
    
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedProjectMembers, setSelectedProjectMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    // We need all tasks for dependency lookups in the modal - Scoped to project for performance
    const allTasksForProjectQuery = useMemo(() => 
        selectedTask ? query(collection(db, 'projects', selectedTask.projectId, 'tasks')) : null,
    [selectedTask]);
    const { data: allTasksForDependencies } = useFirestoreQuery<Task>(allTasksForProjectQuery);
    
    const projectModulesQuery = useMemo(() => 
        selectedTask ? query(collection(db, 'projects', selectedTask.projectId, 'modules'), orderBy('name', 'asc')) : null,
    [selectedTask]);
    const { data: projectModules } = useFirestoreQuery<Module>(projectModulesQuery);
    
    const projectEntitiesQuery = useMemo(() => 
        selectedTask ? query(collection(db, 'projects', selectedTask.projectId, 'entities'), orderBy('name', 'asc')) : null,
    [selectedTask]);
    const { data: projectEntities } = useFirestoreQuery<Entity>(projectEntitiesQuery);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const fetchTasksAndProjects = async () => {
            setLoading(true);
            try {
                const tasksQuery = query(
                    collectionGroup(db, 'tasks'), 
                    where('assignee.uid', '==', currentUser.uid),
                    where('status', '!=', 'done')
                );
                const querySnapshot = await getDocs(tasksQuery);
                const userTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                setTasks(userTasks);

                // Fetch unique project details
                const projectIds: string[] = [...new Set(userTasks.map(t => t.projectId))];
                const projectsData: Record<string, Project> = {};
                const fetchPromises = projectIds.map(async (projectId) => {
                    if (!projectsMap[projectId]) { // Avoid re-fetching
                        const projectDoc = await getDoc(doc(db, 'projects', projectId));
                        if (projectDoc.exists()) {
                            projectsData[projectId] = { id: projectDoc.id, ...projectDoc.data() } as Project;
                        }
                    }
                });
                await Promise.all(fetchPromises);
                setProjectsMap(prev => ({ ...prev, ...projectsData }));
            } catch (error) {
                console.error("Error fetching my tasks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasksAndProjects();
    }, [currentUser]);
    
    // When a task is selected, we need to load its project context for the modal
    useEffect(() => {
        if (!selectedTask) return;

        const fetchModalData = async () => {
            setMembersLoading(true);
            const project = projectsMap[selectedTask.projectId];
            if (!project || !project.memberUids) {
                setSelectedProjectMembers([]);
                setMembersLoading(false);
                return;
            }

            try {
                const uids = project.memberUids;
                const usersRef = collection(db, 'users');
                const usersData: User[] = [];

                for (let i = 0; i < uids.length; i += 30) {
                    const chunk = uids.slice(i, i + 30);
                    const q = query(usersRef, where('uid', 'in', chunk));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(doc => usersData.push(doc.data() as User));
                }

                const combined = usersData.map(user => ({
                    ...user,
                    role: project.members[user.uid]
                })).filter(member => member.role);
                
                setSelectedProjectMembers(combined as Member[]);
            } catch (e) {
                console.error("Failed to fetch member details for modal", e);
            } finally {
                setMembersLoading(false);
            }
        };
        
        fetchModalData();

    }, [selectedTask, projectsMap]);

    const tasksByProject = useMemo(() => {
        return tasks.reduce((acc, task) => {
            const project = projectsMap[task.projectId];
            if (project) {
                if (!acc[project.id]) {
                    acc[project.id] = { project, tasks: [] };
                }
                acc[project.id].tasks.push(task);
            }
            return acc;
        }, {} as Record<string, { project: Project, tasks: Task[] }>);
    }, [tasks, projectsMap]);
    
    const moduleLookup = useMemo(() => {
        const lookup: Record<string, Module> = {};
        if (projectModules) {
            projectModules.forEach(module => {
                lookup[module.id] = module;
            });
        }
        return lookup;
    }, [projectModules]);


    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
        }

        if (tasks.length === 0) {
            return (
                <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                    <CheckSquare className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhuma tarefa atribuída</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                        Você não tem tarefas ativas atribuídas a você. Verifique novamente mais tarde!
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {Object.values(tasksByProject).map(({ project, tasks: projectTasks }) => (
                    <div key={project.id}>
                        <Link to={`/project/${project.id}`}>
                           <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 hover:text-brand-500 transition-colors">
                                {project.name}
                            </h2>
                        </Link>
                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            {...{
                                variants: {
                                    hidden: { opacity: 0 },
                                    show: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.05 }
                                    }
                                },
                                initial: "hidden",
                                animate: "show"
                            } as any}
                        >
                            {projectTasks.map(task => (
                                <motion.div key={task.id} {...{variants: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} as any}>
                                    <TaskCard 
                                        task={task}
                                        onClick={() => setSelectedTask(task)}
                                        currentUser={currentUser}
                                        moduleInfo={task.moduleId ? moduleLookup[task.moduleId] : undefined}
                                        isBlocked={false} // This page does not compute blocked status.
                                        dragHandleListeners={{}} // No DnD on this page
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <CheckSquare /> Minhas Tarefas
                </h1>
            </div>

            {renderContent()}

            {selectedTask && projectsMap[selectedTask.projectId] && !membersLoading && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    taskId={selectedTask.id}
                    projectId={selectedTask.projectId}
                    project={projectsMap[selectedTask.projectId]}
                    projectMembers={selectedProjectMembers}
                    allTasks={allTasksForDependencies || []}
                    modules={projectModules || []}
                    entities={projectEntities || []}
                />
            )}
        </motion.div>
    );
};

export default MyTasksPage;