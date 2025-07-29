import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy } from '@firebase/firestore';
import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Module, Feature, Entity } from '../types';
import { PlusCircle, Loader2, Shapes, ChevronDown } from 'lucide-react';

import Button from '../components/ui/Button';
import CreateEditFeatureModal from '../components/modals/CreateEditFeatureModal';
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
            <Shapes className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhuma Funcionalidade Criada</h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md">
                Descreva os casos de uso do seu sistema criando funcionalidades e vinculando-as a tarefas.
            </p>
            <Button onClick={onOpenModal}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeira Funcionalidade
            </Button>
        </motion.div>
    );
};

const FeatureCard = ({ feature, onEdit }: { feature: Feature, onEdit: (feature: Feature) => void }) => {
    return (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{feature.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{feature.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(feature)}>Editar</Button>
            </div>
        </div>
    );
};


const ModuleAccordion = ({ module, features, onEditFeature }: { module: Module, features: Feature[], onEditFeature: (feature: Feature) => void }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
            >
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{module.name}</h3>
                <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            {features.map(feature => (
                                <FeatureCard key={feature.id} feature={feature} onEdit={onEditFeature} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const FeaturesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const { project } = useProject();
    const { currentUser } = useAuth();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

    const userRole = project && currentUser ? project.members[currentUser.uid] : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';

    const modulesQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')), 
        [projectId]
    );
    const { data: modules, loading: modulesLoading, error: modulesError } = useFirestoreQuery<Module>(modulesQuery);

    const featuresQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'features'), orderBy('createdAt', 'desc')), 
        [projectId]
    );
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);

    const entitiesQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'entities'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: entities, loading: entitiesLoading, error: entitiesError } = useFirestoreQuery<Entity>(entitiesQuery);

    const featuresByModule = useMemo(() => {
        if (!features) return {};
        return features.reduce((acc, feature) => {
            (acc[feature.moduleId] = acc[feature.moduleId] || []).push(feature);
            return acc;
        }, {} as Record<string, Feature[]>);
    }, [features]);

    const handleOpenCreateModal = () => {
        setEditingFeature(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (feature: Feature) => {
        setEditingFeature(feature);
        setModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingFeature(null);
    };

    const loading = modulesLoading || featuresLoading || entitiesLoading;
    const error = modulesError || featuresError || entitiesError;

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
                  <Shapes /> Funcionalidades
                </h1>
                <Button 
                    onClick={handleOpenCreateModal}
                    disabled={!isEditor}
                    title={!isEditor ? "Apenas editores ou proprietários podem criar funcionalidades." : ""}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Funcionalidade
                </Button>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
                ) : error ? (
                    <ConnectionErrorState error={error} context="funcionalidades" />
                ) : features && features.length > 0 && modules ? (
                    modules.map(module => (
                        (featuresByModule[module.id] && featuresByModule[module.id].length > 0) &&
                        <ModuleAccordion 
                            key={module.id}
                            module={module}
                            features={featuresByModule[module.id]}
                            onEditFeature={handleOpenEditModal}
                        />
                    ))
                ) : (
                    <AnimatePresence>
                        <EmptyState onOpenModal={handleOpenCreateModal} />
                    </AnimatePresence>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <CreateEditFeatureModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        projectId={projectId}
                        feature={editingFeature}
                        modules={modules || []}
                        entities={entities || []}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FeaturesPage;