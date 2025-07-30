import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy, where } from '@firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FlaskConical, Loader2, XCircle } from 'lucide-react';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { Feature, Task, Module, Entity } from '../types';
import { updateFeature, reproveFeature } from '../services/firestoreService';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Button from '../components/ui/Button';
import CreateEditFeatureModal from '../components/modals/CreateEditFeatureModal';
import AlertDialog from '../components/ui/AlertDialog';

type FeatureStatus = 'in_development' | 'in_testing' | 'approved' | 'released';

// Feature Card Component for the Test Kanban
const FeatureTestCard = ({ feature, tasks, onReprove, onCardClick, isEditor }: { feature: Feature, tasks: Task[], onReprove: (featureId: string) => void, onCardClick: () => void, isEditor: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feature.id, data: { type: 'Feature' }, disabled: !isEditor });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
    };
    
    const relevantTasks = useMemo(() => tasks.filter(t => t.featureId === feature.id), [tasks, feature.id]);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm touch-none">
            <div onClick={onCardClick} className="cursor-pointer">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">{feature.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{feature.description}</p>
                {relevantTasks.length > 0 && (
                    <div className="mt-3">
                        <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">TAREFAS ({relevantTasks.length})</h5>
                        <ul className="text-sm list-disc list-inside text-slate-600 dark:text-slate-300 max-h-20 overflow-y-auto pr-2">
                           {relevantTasks.slice(0, 3).map(t => <li key={t.id} className="truncate">{t.title}</li>)}
                           {relevantTasks.length > 3 && <li className="text-xs italic text-slate-500">e mais {relevantTasks.length - 3}...</li>}
                        </ul>
                    </div>
                )}
            </div>
            {(feature.status === 'in_testing' || feature.status === 'approved') && isEditor && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="outline" size="sm" className="w-full text-red-500 border-red-500/50 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); onReprove(feature.id); }}>
                        <XCircle className="mr-2 h-4 w-4" /> Reprovar
                    </Button>
                </div>
            )}
        </div>
    );
};

// Kanban Column Component
const TestKanbanColumn = ({ id, title, features, tasks, onReprove, onFeatureClick, isEditor }: { id: string; title: string; features: Feature[]; tasks: Task[]; onReprove: (featureId: string) => void, onFeatureClick: (feature: Feature) => void, isEditor: boolean }) => {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className="bg-slate-100/50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 px-2">{title} <span className="text-sm text-slate-500">({features.length})</span></h3>
            <SortableContext id={id} items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-grow space-y-4 min-h-[100px] overflow-y-auto">
                    {features.map(feature => (
                        <FeatureTestCard key={feature.id} feature={feature} tasks={tasks} onReprove={onReprove} onCardClick={() => onFeatureClick(feature)} isEditor={isEditor} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

const TestingPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const { project } = useProject();
    const { currentUser } = useAuth();
    const userRole = project && currentUser ? project.members[currentUser.uid] : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';

    const [featureToReprove, setFeatureToReprove] = useState<Feature | null>(null);
    const [isReproving, setIsReproving] = useState(false);
    const [modalFeature, setModalFeature] = useState<Feature | null>(null);

    const featuresQuery = useMemo(() => query(collection(db, 'projects', projectId, 'features'), where('status', 'in', ['in_development', 'in_testing', 'approved', 'released'])), [projectId]);
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);

    const tasksQuery = useMemo(() => query(collection(db, 'projects', projectId, 'tasks')), [projectId]);
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);

    const modulesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')), [projectId]);
    const { data: modules, loading: modulesLoading, error: modulesError } = useFirestoreQuery<Module>(modulesQuery);

    const entitiesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'entities'), orderBy('name', 'asc')), [projectId]);
    const { data: entities, loading: entitiesLoading, error: entitiesError } = useFirestoreQuery<Entity>(entitiesQuery);


    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const featuresByStatus = useMemo(() => {
        const columns: Record<FeatureStatus, Feature[]> = { in_development: [], in_testing: [], approved: [], released: [] };
        return features?.reduce((acc, feature) => {
            if (acc[feature.status as FeatureStatus]) {
                acc[feature.status as FeatureStatus].push(feature);
            }
            return acc;
        }, columns) || columns;
    }, [features]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            if (!isEditor) return;
            const featureId = active.id as string;
            const newStatus = over.id as FeatureStatus;
            
            const feature = features?.find(f => f.id === featureId);
            if (!feature || feature.status === newStatus) return;
            
            if (newStatus === 'in_development') {
                handleReproveClick(featureId);
                return;
            }

            try {
                 await updateFeature(projectId, featureId, { status: newStatus });
            } catch (err) {
                console.error("Failed to update feature status:", err);
                alert("Falha ao mover a funcionalidade.");
            }
        }
    };

    const handleReproveClick = (featureId: string) => {
        const feature = features?.find(f => f.id === featureId);
        if (feature) setFeatureToReprove(feature);
    };

    const confirmReprove = async () => {
        if (!featureToReprove || !isEditor) return;
        setIsReproving(true);
        try {
            await reproveFeature(projectId, featureToReprove.id);
            setFeatureToReprove(null);
        } catch (error) {
            console.error("Failed to reprove feature", error);
            alert("Falha ao reprovar a funcionalidade.");
        } finally {
            setIsReproving(false);
        }
    };
    
    const loading = featuresLoading || tasksLoading || modulesLoading || entitiesLoading;
    const error = featuresError || tasksError || modulesError || entitiesError;
    
    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
    if (error) return <div className="p-8"><ConnectionErrorState error={error} context="página de testes" /></div>;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 lg:p-8 flex flex-col h-full"
        >
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3 mb-8">
                <FlaskConical /> Quadro de Testes
            </h1>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
                        <TestKanbanColumn id="in_development" title="Reprovado / Em Correção" features={featuresByStatus.in_development} tasks={tasks || []} onReprove={handleReproveClick} onFeatureClick={setModalFeature} isEditor={isEditor} />
                        <TestKanbanColumn id="in_testing" title="A Testar" features={featuresByStatus.in_testing} tasks={tasks || []} onReprove={handleReproveClick} onFeatureClick={setModalFeature} isEditor={isEditor} />
                        <TestKanbanColumn id="approved" title="Aprovado" features={featuresByStatus.approved} tasks={tasks || []} onReprove={handleReproveClick} onFeatureClick={setModalFeature} isEditor={isEditor} />
                        <TestKanbanColumn id="released" title="Liberado" features={featuresByStatus.released} tasks={tasks || []} onReprove={handleReproveClick} onFeatureClick={setModalFeature} isEditor={isEditor} />
                    </div>
                </div>
            </DndContext>

            {featureToReprove && (
                 <AlertDialog
                    isOpen={!!featureToReprove}
                    onClose={() => setFeatureToReprove(null)}
                    onConfirm={confirmReprove}
                    title={`Reprovar "${featureToReprove.name}"?`}
                    description="Isso moverá a funcionalidade de volta para 'Em Desenvolvimento' e reabrirá todas as suas tarefas concluídas. Você tem certeza?"
                    isConfirming={isReproving}
                />
            )}
            {modalFeature && (
                <CreateEditFeatureModal
                    isOpen={!!modalFeature}
                    onClose={() => setModalFeature(null)}
                    projectId={projectId}
                    feature={modalFeature}
                    modules={modules || []}
                    entities={entities || []}
                />
            )}
        </motion.div>
    );
};

export default TestingPage;