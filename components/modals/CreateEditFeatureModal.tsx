import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createFeature, updateFeature } from '../../services/firestoreService';
import { Feature, Module, Entity, UserFlow, TestCase } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, PlusCircle, Trash2, ArrowUp, ArrowDown, Database, Check, ChevronDown, X } from 'lucide-react';
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

const UserFlowEditor = ({ flow, onUpdate, onRemove, onMove, isFirst, isLast }: { flow: UserFlow, onUpdate: (flow: UserFlow) => void, onRemove: () => void, onMove: (direction: 'up' | 'down') => void, isFirst: boolean, isLast: boolean }) => {
    const [isEntityPopoverOpen, setIsEntityPopoverOpen] = useState(false);
    const { entities } = useProjectContext();
    
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
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex gap-3 items-start">
            <div className="flex flex-col items-center gap-1">
                <span className="font-bold text-lg text-slate-400 dark:text-slate-500">{flow.step}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('up')} disabled={isFirst}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('down')} disabled={isLast}><ArrowDown size={16} /></Button>
            </div>
            <div className="flex-grow space-y-2">
                <Textarea placeholder="Descreva o passo do fluxo..." value={flow.description} onChange={e => onUpdate({ ...flow, description: e.target.value })} rows={2} />
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
                            <div key={entity.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => handleEntityToggle(entity.id)}>
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

const ProjectContext = React.createContext<{ entities: Entity[] }>({ entities: [] });
const useProjectContext = () => React.useContext(ProjectContext);

const CreateEditFeatureModal: React.FC<CreateEditFeatureModalProps> = ({ isOpen, onClose, projectId, feature, modules, entities }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [userFlows, setUserFlows] = useState<UserFlow[]>([]);
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'flows' | 'tests'>('general');
    
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

    const handleUpdateFlow = (updatedFlow: UserFlow) => {
        setUserFlows(userFlows.map(flow => flow.id === updatedFlow.id ? updatedFlow : flow));
    };

    const handleAddFlow = () => {
        const newStep: UserFlow = { id: crypto.randomUUID(), step: userFlows.length + 1, description: '', relatedEntityIds: [] };
        setUserFlows([...userFlows, newStep]);
    };

    const handleRemoveFlow = (id: string) => {
        setUserFlows(userFlows.filter(flow => flow.id !== id).map((flow, index) => ({ ...flow, step: index + 1 })));
    };
    
    const handleMoveFlow = (index: number, direction: 'up' | 'down') => {
        const newFlows = [...userFlows];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFlows[index], newFlows[targetIndex]] = [newFlows[targetIndex], newFlows[index]];
        setUserFlows(newFlows.map((flow, i) => ({ ...flow, step: i + 1 })));
    };

    const handleAddTestCase = () => {
        const newCase: TestCase = { id: crypto.randomUUID(), description: '', expectedResult: '', status: 'pending' };
        setTestCases([...testCases, newCase]);
    };

    const handleUpdateTestCase = (updatedCase: TestCase) => {
        setTestCases(testCases.map(tc => tc.id === updatedCase.id ? updatedCase : tc));
    };
    
    const handleRemoveTestCase = (id: string) => {
        setTestCases(testCases.filter(tc => tc.id !== id));
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
                            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                {activeTab === 'general' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="featureName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Funcionalidade</label>
                                            <Input id="featureName" value={name} onChange={e => setName(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label htmlFor="moduleId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Módulo</label>
                                            <select id="moduleId" value={moduleId} onChange={e => setModuleId(e.target.value)} required className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                                                {modules.map(mod => <option key={mod.id} value={mod.id}>{mod.name}</option>)}
                                            </select>
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
                                            {userFlows.map((flow, index) => (
                                                <UserFlowEditor key={flow.id} flow={flow} onUpdate={handleUpdateFlow} onRemove={() => handleRemoveFlow(flow.id)} onMove={(dir) => handleMoveFlow(index, dir)} isFirst={index === 0} isLast={index === userFlows.length - 1} />
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" onClick={handleAddFlow} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Passo</Button>
                                    </div>
                                )}
                                {activeTab === 'tests' && (
                                    <div className="space-y-4">
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {testCases.map((tc, index) => (
                                                <div key={tc.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-sm font-medium">Caso de Teste #{index + 1}</label>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTestCase(tc.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50"><Trash2 size={16} /></Button>
                                                    </div>
                                                    <Textarea placeholder="Descrição do caso de teste..." value={tc.description} onChange={e => handleUpdateTestCase({ ...tc, description: e.target.value })} rows={2} />
                                                    <Textarea placeholder="Resultado esperado..." value={tc.expectedResult} onChange={e => handleUpdateTestCase({ ...tc, expectedResult: e.target.value })} rows={2} />
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" onClick={handleAddTestCase} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Caso de Teste</Button>
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