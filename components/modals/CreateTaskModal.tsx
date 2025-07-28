import React, { useState, useMemo } from 'react';
import { Timestamp } from '@firebase/firestore';
import { createTask } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { UserSummary, Module, Member, Entity, Task } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, ChevronDown, UserCircle, Check, X, Tag } from 'lucide-react';
import Popover from '../ui/Popover';
import Avatar from '../ui/Avatar';


interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectMembers: Member[];
  modules: Module[];
  entities: Entity[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, projectId, projectName, projectMembers, modules, entities }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<UserSummary | null>(null);
  const [moduleId, setModuleId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  
  // State for the entity selector
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [isEntityPopoverOpen, setIsEntityPopoverOpen] = useState(false);

  const resetForm = () => {
      setTitle('');
      setDescription('');
      setAssignee(null);
      setModuleId('');
      setDueDate('');
      setSelectedEntityIds([]);
      setError('');
      setIsLoading(false);
      setIsAssigneeOpen(false);
      setIsModuleOpen(false);
      setIsEntityPopoverOpen(false);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const selectedEntities = useMemo(() => {
    const selectedIds = new Set(selectedEntityIds);
    return entities.filter(entity => selectedIds.has(entity.id));
  }, [selectedEntityIds, entities]);

  const handleEntityToggle = (entityId: string) => {
    setSelectedEntityIds(prevIds => 
      prevIds.includes(entityId)
        ? prevIds.filter(id => id !== entityId)
        : [...prevIds, entityId]
    );
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
      if (moduleId) {
        taskPayload.moduleId = moduleId;
      }
      if (dueDate) {
        taskPayload.dueDate = Timestamp.fromDate(new Date(dueDate));
      }
      if (selectedEntityIds && selectedEntityIds.length > 0) {
        taskPayload.relatedEntityIds = selectedEntityIds;
      }
  
      await createTask(
          projectId, 
          projectName, 
          taskPayload as Partial<Pick<Task, 'title' | 'description' | 'assignee' | 'moduleId' | 'relatedEntityIds' | 'dueDate'>>
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
                 <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Módulo
                    </label>
                     <Popover
                        isOpen={isModuleOpen}
                        onClose={() => setIsModuleOpen(false)}
                        trigger={
                            <Button type="button" variant="outline" className="w-full justify-between text-left" onClick={() => setIsModuleOpen(!isModuleOpen)} disabled={isLoading}>
                                <span className="truncate">{modules.find(m => m.id === moduleId)?.name || 'Nenhum Módulo'}</span>
                                <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            </Button>
                        }
                    >
                         <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            <div
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                                onClick={() => { setModuleId(''); setIsModuleOpen(false); }}
                            >
                                Nenhum Módulo
                                {moduleId === '' && <Check className="h-4 w-4 text-brand-500" />}
                            </div>
                            {modules.map(module => (
                                <div
                                    key={module.id}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                                    onClick={() => { setModuleId(module.id); setIsModuleOpen(false); }}
                                >
                                    <span className="truncate">{module.name}</span>
                                    {moduleId === module.id && <Check className="h-4 w-4 text-brand-500" />}
                                </div>
                            ))}
                        </div>
                    </Popover>
                </div>
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
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entidades Afetadas
              </label>
              <Popover
                isOpen={isEntityPopoverOpen}
                onClose={() => setIsEntityPopoverOpen(false)}
                trigger={
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full justify-between text-left font-normal h-auto min-h-10" 
                    onClick={() => setIsEntityPopoverOpen(true)}
                    disabled={isLoading}
                  >
                    <div className="flex flex-wrap gap-1">
                      {selectedEntities.length > 0 ? (
                        selectedEntities.map(entity => (
                          <span key={entity.id} className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                            {entity.name}
                            <button 
                              type="button" 
                              className="hover:text-red-500" 
                              onClick={(e) => { e.stopPropagation(); handleEntityToggle(entity.id); }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">Selecione as entidades...</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  </Button>
                }
              >
                <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {entities.length > 0 ? (
                    entities.map(entity => (
                    <div
                      key={entity.id}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm"
                      onClick={() => handleEntityToggle(entity.id)}
                    >
                      <span className="flex items-center gap-2"><Tag size={14} /><span className="truncate">{entity.name}</span></span>
                      {selectedEntityIds.includes(entity.id) && <Check className="h-4 w-4 text-blue-500" />}
                    </div>
                  ))
                  ) : (
                    <div className="p-2 text-sm text-center text-slate-500">Nenhuma entidade criada neste projeto.</div>
                  )}
                </div>
              </Popover>
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
