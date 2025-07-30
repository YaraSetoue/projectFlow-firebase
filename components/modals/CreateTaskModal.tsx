import React, { useState, useMemo } from 'react';
import { Timestamp } from '@firebase/firestore';
import { createTask } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { UserSummary, Module, Member, Feature, Task } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, ChevronDown, UserCircle, Check } from 'lucide-react';
import Popover from '../ui/Popover';
import Avatar from '../ui/Avatar';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectMembers: Member[];
  modules: Module[];
  features: Feature[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, projectId, projectName, projectMembers, modules, features }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<UserSummary | null>(null);
  const [featureId, setFeatureId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Popover states
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isFeaturePopoverOpen, setIsFeaturePopoverOpen] = useState(false);
  
  const groupedFeatures = useMemo(() => {
    if (!features || !modules) return [];
    
    const featuresByModule = features.reduce((acc, feature) => {
        (acc[feature.moduleId] = acc[feature.moduleId] || []).push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    return modules.map(module => ({
        moduleName: module.name,
        moduleId: module.id,
        features: featuresByModule[module.id] || []
    })).filter(group => group.features.length > 0);
  }, [features, modules]);

  const resetForm = () => {
      setTitle('');
      setDescription('');
      setAssignee(null);
      setFeatureId('');
      setDueDate('');
      setError('');
      setIsLoading(false);
      setIsAssigneeOpen(false);
      setIsFeaturePopoverOpen(false);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("O título da tarefa é obrigatório.");
      return;
    }
    if (!currentUser || !projectId) {
      setError("Erro de autenticação ou ID do projeto ausente. Tente recarregar a página.");
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    try {
      const taskPayload: { [key: string]: any } = {
        title: title,
        description: description,
      };
  
      if (assignee) {
        taskPayload.assignee = assignee;
      }
      if (featureId) {
        taskPayload.featureId = featureId;
        const feature = features.find(f => f.id === featureId);
        if (feature) {
          taskPayload.moduleId = feature.moduleId;
        }
      }
      if (dueDate) {
        taskPayload.dueDate = Timestamp.fromDate(new Date(`${dueDate}T00:00:00`));
      }
  
      await createTask(
          projectId, 
          projectName, 
          taskPayload as Partial<Pick<Task, 'title' | 'description' | 'assignee' | 'featureId' | 'dueDate' | 'moduleId'>>
      );
      
      handleClose();
  
    } catch (error: any) {
      console.error("Failed to create task:", error);
      setError(error.message || "Ocorreu um erro inesperado ao criar a tarefa.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFeatureName = useMemo(() => features.find(f => f.id === featureId)?.name, [features, featureId]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Nova Tarefa">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="taskTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título da Tarefa
                </label>
                <Input
                    id="taskTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Desenhar a nova página de destino"
                    required
                    disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição (Opcional)
                </label>
                <Textarea
                    id="taskDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adicione mais detalhes sobre a tarefa"
                    rows={4}
                    disabled={isLoading}
                />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Atribuir a
                    </label>
                    <Popover
                        isOpen={isAssigneeOpen}
                        onClose={() => setIsAssigneeOpen(false)}
                        trigger={
                            <Button type="button" variant="outline" className="w-full justify-between text-left h-auto py-2" onClick={() => setIsAssigneeOpen(!isAssigneeOpen)} disabled={isLoading}>
                                <span className="flex items-center gap-2">
                                    {assignee ? <Avatar user={assignee} size="sm" /> : <UserCircle className="h-6 w-6 text-slate-400" />}
                                    <span className="truncate">{assignee ? assignee.displayName : 'Não atribuído'}</span>
                                </span>
                                <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            </Button>
                        }
                    >
                        <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            <div
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                                onClick={() => { setAssignee(null); setIsAssigneeOpen(false); }}
                            >
                                <span className="flex items-center gap-2">
                                    <UserCircle className="h-6 w-6 text-slate-400" /> Não atribuído
                                </span>
                                {!assignee && <Check className="h-4 w-4 text-brand-500" />}
                            </div>
                            {projectMembers.map(member => (
                                <div
                                    key={member.uid}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                                    onClick={() => {
                                        setAssignee({ uid: member.uid, displayName: member.displayName, photoURL: member.photoURL });
                                        setIsAssigneeOpen(false);
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        <Avatar user={member} size="sm" />
                                        <span className="truncate">{member.displayName}</span>
                                    </span>
                                    {assignee?.uid === member.uid && <Check className="h-4 w-4 text-brand-500" />}
                                </div>
                            ))}
                        </div>
                    </Popover>
                </div>
                 <div>
                     <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data de Entrega (Opcional)
                    </label>
                    <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={isLoading}
                        className="appearance-none"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1">
                <div>
                  <label htmlFor="featureId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Funcionalidade Relacionada
                  </label>
                   <Popover
                    isOpen={isFeaturePopoverOpen}
                    onClose={() => setIsFeaturePopoverOpen(false)}
                    trigger={
                        <Button type="button" variant="outline" className="w-full justify-between text-left font-normal" onClick={() => setIsFeaturePopoverOpen(true)} disabled={isLoading || !features}>
                             <span className="truncate">{selectedFeatureName || 'Nenhuma Funcionalidade'}</span>
                             <ChevronDown className="h-4 w-4 text-slate-500" />
                        </Button>
                    }>
                        <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            <div className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setFeatureId(''); setIsFeaturePopoverOpen(false); }}>
                                Nenhuma Funcionalidade
                                {!featureId && <Check className="h-4 w-4 text-brand-500"/>}
                            </div>
                            {groupedFeatures.map(group => (
                                <div key={group.moduleId}>
                                    <div className="px-2 py-1 text-xs text-slate-400 font-semibold">{group.moduleName}</div>
                                    {group.features.map(feature => (
                                        <div key={feature.id} className="p-2 pl-4 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setFeatureId(feature.id); setIsFeaturePopoverOpen(false); }}>
                                            <span className="truncate">{feature.name}</span>
                                            {featureId === feature.id && <Check className="h-4 w-4 text-brand-500"/>}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                  </Popover>
                </div>

            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !title.trim()}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Tarefa
                </Button>
            </div>
        </form>
    </Modal>
  );
};

export default CreateTaskModal;