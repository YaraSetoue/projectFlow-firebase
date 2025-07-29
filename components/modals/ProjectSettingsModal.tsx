import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy } from '@firebase/firestore';
import { db } from '../../firebase/config';
import { useFirestoreQuery } from '../../hooks/useFirestoreQuery';
import { updateProject, deleteProject, createTaskCategory, updateTaskCategory, deleteTaskCategory } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Project, TaskCategory } from '../../types';
import { MODULE_COLOR_MAP, MODULE_COLOR_OPTIONS, MODULE_ICON_OPTIONS } from '../../utils/styleUtils';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Popover from '../ui/Popover';
import IconRenderer from '../ui/IconRenderer';
import { Loader2, Trash2, AlertTriangle, Settings, Tag, PlusCircle } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const TabButton = ({ isActive, onClick, children }: { isActive: boolean, onClick: () => void, children: React.ReactNode }) => (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${isActive ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'}`} aria-selected={isActive} role="tab">
        {children}
    </button>
);

const CategoryManager = ({ project, isOwner }: { project: Project, isOwner: boolean }) => {
    const categoriesQuery = React.useMemo(() => 
        query(collection(db, 'projects', project.id, 'taskCategories'), orderBy('name', 'asc')), 
        [project.id]
    );
    const { data: categories, loading, error: queryError } = useFirestoreQuery<TaskCategory>(categoriesQuery);

    const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState('gray');
    const [icon, setIcon] = useState('tag');
    const [requiresTesting, setRequiresTesting] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);

    const isCreatingNew = editingCategory === null;

    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name);
            setColor(editingCategory.color);
            setIcon(editingCategory.icon);
            setRequiresTesting(editingCategory.requiresTesting);
        } else {
            resetForm();
        }
    }, [editingCategory]);

    const resetForm = () => {
        setEditingCategory(null);
        setName('');
        setColor('gray');
        setIcon('tag');
        setRequiresTesting(true);
        setError('');
        setIsSaving(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('O nome da categoria é obrigatório.');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const categoryData = { name, color, icon, requiresTesting };
            if (isCreatingNew) {
                await createTaskCategory(project.id, categoryData);
            } else {
                await updateTaskCategory(project.id, editingCategory!.id, categoryData);
            }
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Falha ao salvar a categoria.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (categoryId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) return;
        setError('');
        try {
            await deleteTaskCategory(project.id, categoryId);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie as categorias para organizar as tarefas. A opção 'Requer Teste' ativa o fluxo de QA (Teste e Aprovação) no quadro Kanban para tarefas nesta categoria.</p>
            {queryError && <p className="text-sm text-red-500 text-center">{queryError.message}</p>}
            {loading && <div className="text-center py-4"><Loader2 className="animate-spin" /></div>}
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories?.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                        <div className="flex items-center gap-3">
                            <IconRenderer name={cat.icon} className={MODULE_COLOR_MAP[cat.color]?.text} />
                            <span className="font-medium">{cat.name}</span>
                            {cat.requiresTesting && <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">(Requer Teste)</span>}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingCategory(cat)}>Editar</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500" onClick={() => handleDelete(cat.id)}><Trash2 size={16} /></Button>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSave} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                <h4 className="font-semibold">{isCreatingNew ? 'Adicionar Nova Categoria' : `Editando: ${editingCategory?.name}`}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Categoria" required disabled={isSaving}/>
                    <div className="flex items-center gap-2">
                         <Popover isOpen={isIconPopoverOpen} onClose={() => setIsIconPopoverOpen(false)} trigger={
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsIconPopoverOpen(true)} className="flex-shrink-0">
                                    <IconRenderer name={icon} />
                                </Button>
                            }>
                             <div className="w-72 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-2 grid grid-cols-6 gap-1">
                                {MODULE_ICON_OPTIONS.map(iconName => (
                                    <button key={iconName} type="button" onClick={() => { setIcon(iconName); setIsIconPopoverOpen(false); }} className={`flex items-center justify-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${icon === iconName ? 'bg-brand-100 dark:bg-brand-500/20' : ''}`}>
                                        <IconRenderer name={iconName} size={20} />
                                    </button>
                                ))}
                             </div>
                        </Popover>
                        <div className="flex flex-wrap gap-2">
                            {MODULE_COLOR_OPTIONS.slice(0, 10).map(colorName => ( // show fewer colors
                                <button key={colorName} type="button" title={colorName} onClick={() => setColor(colorName)} className={`h-7 w-7 rounded-full transition-transform duration-150 ${MODULE_COLOR_MAP[colorName]?.bg || 'bg-gray-500'} ${color === colorName ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-current' : 'hover:scale-110'}`}></button>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <input type="checkbox" id="requiresTesting" checked={requiresTesting} onChange={e => setRequiresTesting(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <label htmlFor="requiresTesting" className="text-sm font-medium text-slate-700 dark:text-slate-300">Requer Teste de QA</label>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2">
                    {!isCreatingNew && <Button type="button" variant="ghost" onClick={resetForm} disabled={isSaving}>Cancelar Edição</Button>}
                    <Button type="submit" disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isCreatingNew ? 'Adicionar' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [confirmName, setConfirmName] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const userRole = currentUser ? project.members[currentUser.uid] : undefined;
  const isEditor = userRole === 'editor' || userRole === 'owner';
  const isOwner = currentUser?.uid === project.ownerId;
  const isDeleteDisabled = !isOwner || confirmName !== project.name || isDeleting;

  useEffect(() => {
    if (isOpen) {
        setName(project.name);
        setDescription(project.description);
        setConfirmName('');
        setError('');
        setActiveTab('general');
    }
  }, [project, isOpen]);
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) return;
    if (!name.trim()) {
        setError('O nome do projeto não pode estar vazio.');
        return;
    }
    setError('');
    setIsUpdating(true);
    try {
      await updateProject(project.id, { name, description });
      // We don't close on success to allow other actions, like deletion
    } catch (err) {
      console.error("Failed to update project:", err);
      setError('Falha ao atualizar o projeto. Por favor, tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleteDisabled) return;

    setIsDeleting(true);
    setError('');
    try {
      await deleteProject(project.id);
      onClose(); // Close modal first
      navigate('/'); // Then redirect to home page
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError('Falha ao excluir o projeto. Por favor, tente novamente.');
      setIsDeleting(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações do Projeto" widthClass="max-w-2xl">
        <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-4" role="tablist">
            <TabButton isActive={activeTab === 'general'} onClick={() => setActiveTab('general')}><Settings size={16} /> Geral</TabButton>
            {isOwner && <TabButton isActive={activeTab === 'categories'} onClick={() => setActiveTab('categories')}><Tag size={16} /> Categorias</TabButton>}
        </div>
        <div className="py-6 max-h-[70vh] overflow-y-auto pr-2">
            {activeTab === 'general' && (
                <div className="space-y-8">
                  <form onSubmit={handleUpdate} className="space-y-6">
                      <div>
                          <label htmlFor="editProjectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Nome do Projeto
                          </label>
                          <Input id="editProjectName" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isUpdating || !isEditor} />
                      </div>
                      <div>
                          <label htmlFor="editProjectDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Descrição
                          </label>
                          <Textarea id="editProjectDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={isUpdating || !isEditor} />
                      </div>
                      <div className="flex justify-end">
                          <Button type="submit" disabled={isUpdating || !isEditor}>
                              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Salvar Alterações
                          </Button>
                      </div>
                  </form>

                  {isOwner && (
                    <div className="space-y-4 p-4 border border-red-500/50 rounded-lg bg-red-500/5 dark:bg-red-500/10">
                        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle size={20} /> Zona de Perigo
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          A exclusão de um projeto é irreversível. Removerá permanentemente o projeto e todos os seus dados.
                        </p>
                        <div>
                          <label htmlFor="confirmProjectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Para confirmar, digite "<span className="font-bold text-slate-800 dark:text-slate-200">{project.name}</span>" abaixo:
                          </label>
                          <Input id="confirmProjectName" type="text" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} disabled={isDeleting} className="border-red-400 focus:ring-red-500" />
                        </div>
                        <Button variant="default" className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/50" onClick={handleDelete} disabled={isDeleteDisabled}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Excluir este Projeto
                        </Button>
                    </div>
                  )}
                </div>
            )}
            {activeTab === 'categories' && isOwner && <CategoryManager project={project} isOwner={isOwner} />}
            {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
        </div>
    </Modal>
  );
};

export default ProjectSettingsModal;