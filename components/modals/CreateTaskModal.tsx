import React, { useState, useMemo } from 'react';
import { Timestamp } from '@firebase/firestore';
import { createTask } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { UserSummary, Module, Member, Feature, Task, TaskCategory } from '../../types';
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
  categories: TaskCategory[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, projectId, projectName, projectMembers, modules, features, categories }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<UserSummary | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [featureId, setFeatureId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  
  const featuresByModule = useMemo(() => {
    if (!features || !modules) return {};
    return features.reduce((acc, feature) => {
        (acc[feature.moduleId] = acc[feature.moduleId] || []).push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);
  }, [features, modules]);

  const resetForm = () => {
      setTitle('');
      setDescription('');
      setAssignee(null);
      setCategoryId('');
      setFeatureId('');
      setDueDate('');
      setError('');
      setIsLoading(false);
      setIsAssigneeOpen(false);
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
      
      if (categoryId) {
        taskPayload.categoryId = categoryId;
      }
  
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
          taskPayload as Partial<Pick<Task, 'title' | 'description' | 'assignee' | 'featureId' | 'dueDate' | 'moduleId' | 'categoryId'>>
      );
      
      handleClose();
  
    } catch (error: any) {
      console.error("Failed to create task:", error);
      setError(error.message || "Ocorreu um erro inesperado ao criar a tarefa.");
    } finally {
      setIsLoading(false);
    }
  };

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
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    id="categoryId"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isLoading || !categories}
                    className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <option value="">Nenhuma Categoria</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
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
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="featureId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Funcionalidade Relacionada
                  </label>
                  <select
                    id="featureId"
                    value={featureId}
                    onChange={(e) => setFeatureId(e.target.value)}
                    disabled={isLoading || !features}
                    className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <option value="">Nenhuma Funcionalidade</option>
                    {modules.map(module => (
                      (featuresByModule[module.id] && featuresByModule[module.id].length > 0) && (
                        <optgroup key={module.id} label={`Módulo: ${module.name}`}>
                          {featuresByModule[module.id].map(feature => (
                            <option key={feature.id} value={feature.id}>{feature.name}</option>
                          ))}
                        </optgroup>
                      )
                    ))}
                  </select>
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