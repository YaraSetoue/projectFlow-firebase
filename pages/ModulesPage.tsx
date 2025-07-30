
import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy } from '@firebase/firestore';
import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Module, Task, Feature } from '../types';
import { PlusCircle, Loader2, Boxes } from 'lucide-react';

import Button from '../components/ui/Button';
import ModuleCard from '../components/ModuleCard';
import CreateEditModuleModal from '../components/modals/CreateEditModuleModal';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';

const EmptyState = ({ onOpenModal }: { onOpenModal: () => void }) => {
    return (
        <motion.div 
            {...{
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
            } as any}
            className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm"
        >
            <Boxes className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhum Módulo Ainda</h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md">
                Organize seu projeto agrupando tarefas e documentação relacionadas em módulos.
            </p>
            <Button onClick={onOpenModal}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeiro Módulo
            </Button>
        </motion.div>
    );
};

const ModulesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const { project } = useProject();
    const { currentUser } = useAuth();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);

    const userRole = project && currentUser ? project.members[currentUser.uid] : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';

    const modulesQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'modules'), orderBy('createdAt', 'desc')), 
        [projectId]
    );
    const { data: modules, loading: modulesLoading, error } = useFirestoreQuery<Module>(modulesQuery);
    
    const tasksQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'tasks')),
        [projectId]
    );
    const { data: tasks, loading: tasksLoading } = useFirestoreQuery<Task>(tasksQuery);

    const featuresQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'features')),
        [projectId]
    );
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);


    const handleOpenCreateModal = () => {
        setEditingModule(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (module: Module) => {
        setEditingModule(module);
        setModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingModule(null);
    };

    const handleModuleSaveSuccess = () => {
        handleCloseModal();
    };

    const loading = modulesLoading || tasksLoading || featuresLoading;
    const combinedError = error || featuresError;

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
                  <Boxes /> Módulos do Projeto
                </h1>
                <Button 
                    onClick={handleOpenCreateModal}
                    disabled={!isEditor}
                    title={!isEditor ? "Apenas editores ou proprietários podem criar módulos." : ""}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Módulo
                </Button>
            </div>

            <div>
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
                ) : combinedError ? (
                    <ConnectionErrorState error={combinedError} context="módulos" />
                ) : modules && modules.length > 0 ? (
                    <motion.div 
                        {...{
                            variants: {
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                              }
                            },
                            initial: "hidden",
                            animate: "show",
                        } as any}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {modules.map(module => {
                            const moduleTasks = tasks ? tasks.filter(t => t.moduleId === module.id) : [];
                            const moduleFeatures = features ? features.filter(f => f.moduleId === module.id) : [];

                            return (
                                <ModuleCard 
                                    key={module.id} 
                                    module={module} 
                                    projectId={projectId}
                                    tasks={moduleTasks}
                                    features={moduleFeatures}
                                    onEdit={() => handleOpenEditModal(module)}
                                    isEditor={isEditor}
                                />
                            );
                        })}
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        <EmptyState onOpenModal={handleOpenCreateModal} />
                    </AnimatePresence>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <CreateEditModuleModal 
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        projectId={projectId}
                        module={editingModule}
                        onSuccess={handleModuleSaveSuccess}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ModulesPage;
