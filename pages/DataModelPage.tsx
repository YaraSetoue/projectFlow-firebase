import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, getDocs, where } from '@firebase/firestore';
import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Entity, Relationship, Module, Task, Member, User, Feature } from '../types';
import { PlusCircle, Loader2, Database, Share2 } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';

import Button from '../components/ui/Button';
import EntityCard from '../components/EntityCard';
import RelationshipCard from '../components/RelationshipCard';
import CreateEditEntityModal from '../components/modals/CreateEditEntityModal';
import CreateRelationshipModal from '../components/modals/CreateRelationshipModal';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import TaskDetailModal from '../components/modals/TaskDetailModal';

const EmptyState = ({ onOpenEntityModal }: { onOpenEntityModal: () => void }) => {
    return (
        <motion.div 
            {...{
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
            } as any}
            className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm"
        >
            <Database className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Defina seu Modelo de Dados</h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md">
                Comece definindo as entidades principais do seu sistema, como 'Usuário', 'Produto' ou 'Postagem'.
            </p>
            <Button onClick={onOpenEntityModal}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeira Entidade
            </Button>
        </motion.div>
    );
};

const DataModelPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const taskIdFromUrl = searchParams.get('task');

    const { project } = useProject();
    const { currentUser } = useAuth();

    const [isEntityModalOpen, setEntityModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
    const [isRelationshipModalOpen, setRelationshipModalOpen] = useState(false);
    
    // State for the Task Detail Modal
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [projectMembers, setProjectMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);

    const userRole = project && currentUser ? project.members[currentUser.uid] : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';
    const isOwner = userRole === 'owner';

    const entitiesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'entities'), orderBy('name', 'asc')), [projectId]);
    const { data: entities, loading: entitiesLoading, error: entitiesError } = useFirestoreQuery<Entity>(entitiesQuery);

    const relationshipsQuery = useMemo(() => query(collection(db, 'projects', projectId, 'relationships'), orderBy('createdAt', 'desc')), [projectId]);
    const { data: relationships, loading: relationshipsLoading, error: relationshipsError } = useFirestoreQuery<Relationship>(relationshipsQuery);
    
    const modulesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')), [projectId]);
    const { data: modules, loading: modulesLoading, error: modulesError } = useFirestoreQuery<Module>(modulesQuery);

    const tasksQuery = useMemo(() => query(collection(db, 'projects', projectId, 'tasks')), [projectId]);
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);
    
    const featuresQuery = useMemo(() => query(collection(db, 'projects', projectId, 'features'), orderBy('name', 'asc')), [projectId]);
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);


    // Effect to open task modal from URL
    useEffect(() => {
        if (taskIdFromUrl && tasks && !selectedTask) {
            const taskToOpen = tasks.find(t => t.id === taskIdFromUrl);
            if (taskToOpen) {
                setSelectedTask(taskToOpen);
            }
        }
    }, [taskIdFromUrl, tasks, selectedTask]);
    
    // Effect to fetch members when task modal is open
    useEffect(() => {
        if (!selectedTask || !project?.memberUids || project.memberUids.length === 0) {
            setProjectMembers([]);
            if(selectedTask) setMembersLoading(false);
            return;
        }
        const fetchMembers = async () => {
            setMembersLoading(true);
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
                const combined = usersData.map(user => ({ ...user, role: project.members[user.uid] })).filter(m => m.role);
                setProjectMembers(combined as Member[]);
            } catch (e) { console.error("Failed to fetch member details", e); } 
            finally { setMembersLoading(false); }
        };
        fetchMembers();
    }, [selectedTask, project]);

    const entityMap = useMemo(() => new Map(entities?.map(e => [e.id, e.name])), [entities]);

    const handleOpenCreateEntity = () => {
        setEditingEntity(null);
        setEntityModalOpen(true);
    };

    const handleOpenEditEntity = (entity: Entity) => {
        setEditingEntity(entity);
        setEntityModalOpen(true);
    };

    const handleCloseEntityModal = () => {
        setEntityModalOpen(false);
        setEditingEntity(null);
    };
    
    const handleCloseTaskModal = () => {
        setSelectedTask(null);
        setSearchParams({}, { replace: true });
    };

    const loading = entitiesLoading || relationshipsLoading || modulesLoading || tasksLoading || featuresLoading;
    const error = entitiesError || relationshipsError || modulesError || tasksError || featuresError;

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
                  <Database /> Modelo de Dados
                </h1>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => setRelationshipModalOpen(true)} 
                        variant="outline" 
                        disabled={!entities || entities.length < 1 || !isOwner}
                        title={!isOwner ? "Apenas o proprietário do projeto pode adicionar relações." : ""}
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        Nova Relação
                    </Button>
                    <Button 
                        onClick={handleOpenCreateEntity}
                        disabled={!isEditor}
                        title={!isEditor ? "Apenas editores ou proprietários podem adicionar entidades." : ""}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Entidade
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
            ) : error ? (
                <ConnectionErrorState error={error} context="modelo de dados" />
            ) : entities && entities.length > 0 ? (
                <div className="space-y-12">
                    <section>
                        <motion.div 
                            {...{ variants: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } }}, initial: "hidden", animate: "show" } as any}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {entities.map(entity => (
                                <EntityCard 
                                    key={entity.id} 
                                    entity={entity}
                                    allFeatures={features || []}
                                    onEdit={() => handleOpenEditEntity(entity)}
                                    isEditor={isEditor}
                                />
                            ))}
                        </motion.div>
                    </section>
                    
                    {relationships && relationships.length > 0 && (
                         <section>
                            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3"><Share2 /> Relações entre Entidades</h2>
                             <motion.div 
                                {...{ variants: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } }}, initial: "hidden", animate: "show" } as any}
                                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                            >
                                {relationships.map(rel => (
                                    <RelationshipCard key={rel.id} relationship={rel} entityMap={entityMap} isOwner={isOwner} />
                                ))}
                            </motion.div>
                        </section>
                    )}
                </div>
            ) : (
                <AnimatePresence><EmptyState onOpenEntityModal={handleOpenCreateEntity} /></AnimatePresence>
            )}

            <AnimatePresence>
                {isEntityModalOpen && (
                    <CreateEditEntityModal 
                        isOpen={isEntityModalOpen}
                        onClose={handleCloseEntityModal}
                        projectId={projectId}
                        entity={editingEntity}
                        modules={modules || []}
                        allFeatures={features || []}
                    />
                )}
                {isRelationshipModalOpen && (
                    <CreateRelationshipModal 
                        isOpen={isRelationshipModalOpen}
                        onClose={() => setRelationshipModalOpen(false)}
                        projectId={projectId}
                        entities={entities || []}
                    />
                )}
                {selectedTask && !membersLoading && project && (
                     <TaskDetailModal
                        isOpen={!!selectedTask}
                        onClose={handleCloseTaskModal}
                        onNavigateToTask={setSelectedTask}
                        taskId={selectedTask.id}
                        projectId={projectId}
                        project={project}
                        projectMembers={projectMembers}
                        allTasks={tasks || []}
                        modules={modules || []}
                        entities={entities || []}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default DataModelPage;