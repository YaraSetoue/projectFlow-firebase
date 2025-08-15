import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { createFeature, updateFeature } from '../../services/firestoreService';
import { Feature, Module, Entity, UserFlow, TestCase } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, Trash2, Database, Check, ChevronDown, X, GripVertical, PlusCircle } from 'lucide-react';
import Popover from '../ui/Popover';

interface CreateEditFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  feature: Feature | null;
  modules: Module[];
  entities: Entity[];
}

const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} className={`px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${isActive ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'}`} aria-selected={isActive} role="tab">
        {children}
    </button>
);

const ProjectContext = React.createContext<{ entities: Entity[] }>({ entities: [] });
const useProjectContext = () => React.useContext(ProjectContext);

const SortableUserFlowItem = ({ flow, onUpdate, onRemove, isFocused, onFocusLost }: { flow: UserFlow; onUpdate: (flow: UserFlow) => void; onRemove: () => void; isFocused: boolean; onFocusLost: () => void; }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: flow.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const [isEntityPopoverOpen, setIsEntityPopoverOpen] = useState(false);
    const { entities } = useProjectContext();
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [flow.description]);
    
    useEffect(() => {
        if (isFocused && textAreaRef.current) {
            textAreaRef.current.focus();
            onFocusLost();
        }
    }, [isFocused, onFocusLost]);

    const selectedEntities = useMemo(() => {
        const selectedIds = new Set(flow.relatedEntityIds || []);
        return entities.filter(entity => selectedIds.has(entity.id));
    }, [flow.relatedEntityIds, entities]);

    const handleEntityToggle = (entityId: string) => {
        const currentIds = flow.relatedEntityIds || [];
        const newIds = currentIds.includes(entityId) ? currentIds.filter(id => id !== entityId) : [...currentIds, entityId];
        onUpdate({ ...flow, relatedEntityIds: newIds });
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex gap-2 items-start">
            <div className="flex flex-col items-center gap-1">
                <button type="button" {...listeners} className="cursor-grab p-1"><GripVertical size={16} className="text-slate-400" /></button>
                <span className="font-bold text-lg text-slate-400 dark:text-slate-500">{flow.step}</span>
            </div>
            <div className="flex-grow space-y-2">
                <Textarea ref={textAreaRef} placeholder="Descreva o passo do fluxo..." value={flow.description} onChange={e => onUpdate({ ...flow, description: e.target.value })} rows={1} className="resize-none" />
                 <Popover isOpen={isEntityPopoverOpen} onClose={() => setIsEntityPopoverOpen(false)} trigger={
                    <Button type="button" variant="outline" className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-1 px-2" onClick={() => setIsEntityPopoverOpen(true)}>
                        <div className="flex flex-wrap gap-1">
                            {selectedEntities.length > 0 ? selectedEntities.map(entity => (
                                <span key={entity.id} className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                                    {entity.name}
                                    <button type="button" className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20" onClick={(e) => { e.stopPropagation(); handleEntityToggle(entity.id); }}><X size={12} /></button>
                                </span>
                            )) : <span className="text-slate-500">Entidades manipuladas...</span>}
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0 ml-2" />
                    </Button>
                }>
                    <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {entities.length > 0 ? entities.map(entity => (
                            <div key={entity.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { handleEntityToggle(entity.id); setIsEntityPopoverOpen(false); }}>
                                <span className="flex items-center gap-2"><Database size={14} /><span className="truncate">{entity.name}</span></span>
                                {(flow.relatedEntityIds || []).includes(entity.id) && <Check className="h-4 w-4 text-brand-500" />}
                            </div>
                        )) : <div className="p-2 text-sm text-center text-slate-500">Nenhuma entidade criada.</div>}
                    </div>
                </Popover>
            </div>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50"><Trash2 size={16} /></Button>
        </div>
    );
};

const SortableTestCaseItem = ({ testCase, onUpdate, onRemove, index, isFocused, onFocusLost }: { testCase: TestCase; onUpdate: (tc: TestCase) => void; onRemove: () => void; index: number; isFocused: boolean; onFocusLost: () => void; }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: testCase.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const descriptionTextAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isFocused && descriptionTextAreaRef.current) {
            descriptionTextAreaRef.current.focus();
            onFocusLost();
        }
    }, [isFocused, onFocusLost]);
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 flex items-start gap-2">
            <button type="button" {...listeners} className="cursor-grab p-1 mt-1"><GripVertical size={16} className="text-slate-400" /></button>
            <div className="flex-grow space-y-2">
                <Textarea ref={descriptionTextAreaRef} placeholder="Descrição do caso de teste..." value={testCase.description} onChange={e => onUpdate({ ...testCase, description: e.target.value })} rows={2} />
                <Textarea placeholder="Resultado esperado..." value={testCase.expectedResult} onChange={e => onUpdate({ ...testCase, expectedResult: e.target.value })} rows={2} />
            </div>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50"><Trash2 size={16} /></Button>
        </div>
    );
};

const CreateEditFeatureModal: React.FC<CreateEditFeatureModalProps> = ({ isOpen, onClose, projectId, feature, modules, entities }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [userFlows, setUserFlows] = useState<UserFlow[]>([]);
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'flows' | 'tests'>('general');
    const [isModulePopoverOpen, setIsModulePopoverOpen] = useState(false);
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    
    const isEditing = feature !== null;

    useEffect(() => {
        if (feature) {
            setName(feature.name);
            setDescription(feature.description);
            setModuleId(feature.moduleId);
            setUserFlows(feature.userFlows || []);
            setTestCases(feature.testCases || []);
        } else {
            setName('');
            setDescription('');
            setModuleId(modules.length > 0 ? modules[0].id : '');
            setUserFlows([]);
            setTestCases([]);
        }
        setError('');
        setActiveTab('general');
    }, [feature, isOpen, modules]);

    const handleUpdateFlow = (updatedFlow: UserFlow) => setUserFlows(flows => flows.map(flow => flow.id === updatedFlow.id ? updatedFlow : flow));
    const handleAddFlow = () => {
        const newId = crypto.randomUUID();
        setUserFlows(flows => [...flows, { id: newId, step: flows.length + 1, description: '', relatedEntityIds: [] }]);
        setFocusedItemId(newId);
    };
    const handleRemoveFlow = (id: string) => setUserFlows(flows => flows.filter(flow => flow.id !== id).map((flow, index) => ({ ...flow, step: index + 1 })));

    const handleAddTestCase = () => {
        const newId = crypto.randomUUID();
        setTestCases(tcs => [...tcs, { id: newId, description: '', expectedResult: '', status: 'pending' }]);
        setFocusedItemId(newId);
    };
    const handleUpdateTestCase = (updatedCase: TestCase) => setTestCases(tcs => tcs.map(tc => tc.id === updatedCase.id ? updatedCase : tc));
    const handleRemoveTestCase = (id: string) => setTestCases(tcs => tcs.filter(tc => tc.id !== id));

    const handleUserFlowDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setUserFlows(items => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex).map((flow, index) => ({ ...flow, step: index + 1 }));
            });
        }
    };
    
    const handleTestCaseDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setTestCases(items => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !moduleId) {
            setError('Nome e Módulo são obrigatórios.');
            setActiveTab('general');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const featureData = { name, description, moduleId, userFlows, testCases };
            if (isEditing) {
                await updateFeature(projectId, feature.id, featureData);
            } else {
                await createFeature(projectId, featureData);
            }
            onClose();
        } catch (err: any) {
            console.error("Failed to save feature:", err);
            setError(err.message || 'Falha ao salvar a funcionalidade.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editar Funcionalidade: ${feature?.name}` : 'Criar Nova Funcionalidade'} widthClass="max-w-3xl">
            <ProjectContext.Provider value={{ entities }}>
                <form onSubmit={handleSubmit} className="flex flex-col min-h-[60vh]">
                    <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-4" role="tablist">
                        <TabButton isActive={activeTab === 'general'} onClick={() => setActiveTab('general')}>Geral</TabButton>
                        <TabButton isActive={activeTab === 'flows'} onClick={() => setActiveTab('flows')}>Fluxo do Usuário</TabButton>
                        <TabButton isActive={activeTab === 'tests'} onClick={() => setActiveTab('tests')}>Casos de Teste</TabButton>
                    </div>

                    <div className="py-6 flex-grow">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} {...{initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.2 }} as any}>
                                {activeTab === 'general' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="featureName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Funcionalidade</label>
                                            <Input id="featureName" value={name} onChange={e => setName(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label htmlFor="moduleId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Módulo</label>
                                            <Popover isOpen={isModulePopoverOpen} onClose={() => setIsModulePopoverOpen(false)} trigger={
                                                <Button type="button" variant="outline" className="w-full justify-between text-left font-normal" onClick={() => setIsModulePopoverOpen(true)}>
                                                    <span className="truncate">{modules.find(m => m.id === moduleId)?.name || 'Selecione...'}</span>
                                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            }>
                                                <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {modules.map(mod => (
                                                        <div key={mod.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setModuleId(mod.id); setIsModulePopoverOpen(false); }}>
                                                            <span className="truncate">{mod.name}</span>
                                                            {moduleId === mod.id && <Check className="h-4 w-4 text-brand-500"/>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </Popover>
                                        </div>
                                        <div>
                                            <label htmlFor="featureDesc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                                            <Textarea id="featureDesc" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'flows' && (
                                    <div className="space-y-4">
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUserFlowDragEnd}>
                                                <SortableContext items={userFlows} strategy={verticalListSortingStrategy}>
                                                    {userFlows.map((flow) => <SortableUserFlowItem key={flow.id} flow={flow} onUpdate={handleUpdateFlow} onRemove={() => handleRemoveFlow(flow.id)} isFocused={flow.id === focusedItemId} onFocusLost={() => setFocusedItemId(null)} />)}
                                                </SortableContext>
                                            </DndContext>
                                        </div>
                                        <Button type="button" variant="outline" className="w-full" onClick={handleAddFlow}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Adicionar Passo
                                        </Button>
                                    </div>
                                )}
                                {activeTab === 'tests' && (
                                    <div className="space-y-4">
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTestCaseDragEnd}>
                                                <SortableContext items={testCases} strategy={verticalListSortingStrategy}>
                                                    {testCases.map((tc, index) => <SortableTestCaseItem key={tc.id} testCase={tc} index={index} onUpdate={handleUpdateTestCase} onRemove={() => handleRemoveTestCase(tc.id)} isFocused={tc.id === focusedItemId} onFocusLost={() => setFocusedItemId(null)} />)}
                                                </SortableContext>
                                            </DndContext>
                                        </div>
                                        <Button type="button" variant="outline" className="w-full" onClick={handleAddTestCase}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Adicionar Caso de Teste
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-col gap-4 mt-auto pt-4 -mx-6 -mb-6 px-6 pb-6 border-t border-slate-200 dark:border-slate-700">
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Salvar Alterações' : 'Criar Funcionalidade'}
                            </Button>
                        </div>
                    </div>
                </form>
            </ProjectContext.Provider>
        </Modal>
    );
};

export default CreateEditFeatureModal;