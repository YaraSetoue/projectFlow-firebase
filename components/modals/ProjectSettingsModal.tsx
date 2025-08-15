
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy } from '@firebase/firestore';
import { db } from '../../firebase/config';
import { useFirestoreQuery } from '../../hooks/useFirestoreQuery';
import { updateProject, deleteProject, createTaskCategory, updateTaskCategory, deleteTaskCategory } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Project, TaskCategory } from '../../types';
import { MODULE_COLOR_OPTIONS, MODULE_COLOR_MAP, MODULE_ICON_OPTIONS } from '../../utils/styleUtils';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Popover from '../ui/Popover';
import AlertDialog from '../ui/AlertDialog';
import IconRenderer from '../ui/IconRenderer';
import { Loader2, Trash2, AlertTriangle, Settings, List, PlusCircle, Check, Pencil } from 'lucide-react';


const CategoryManager = ({ projectId, isEditor }: { projectId: string, isEditor: boolean }) => {
    const categoriesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'taskCategories'), orderBy('name', 'asc')), [projectId]);
    const { data: categories, loading, error } = useFirestoreQuery<TaskCategory>(categoriesQuery);

    const [editingCategory, setEditingCategory] = useState<Partial<TaskCategory> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<TaskCategory | null>(null);

    const handleSave = async () => {
        if (!isEditor || !editingCategory || !editingCategory.name?.trim()) return;
        setIsSaving(true);
        try {
            const dataToSave = {
                name: editingCategory.name,
                color: editingCategory.color || 'gray',
                icon: editingCategory.icon || 'zap',
                requiresTesting: editingCategory.requiresTesting || false,
            };
            if (editingCategory.id) {
                await updateTaskCategory(projectId, editingCategory.id, dataToSave);
            } else {
                await createTaskCategory(projectId, dataToSave);
            }
            setEditingCategory(null);
        } catch (err) {
            console.error("Failed to save category", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditor || !categoryToDelete) return;
        setIsSaving(true);
        try {
            await deleteTaskCategory(projectId, categoryToDelete.id);
            setCategoryToDelete(null);
        } catch (err) {
            console.error("Failed to delete category", err);
        } finally {
            setIsSaving(false);
        }
    }

    const renderForm = () => (
        <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg space-y-3">
            <div className="flex gap-2">
                <Popover
                    isOpen={isIconPopoverOpen}
                    onClose={() => setIsIconPopoverOpen(false)}
                    trigger={
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsIconPopoverOpen(true)} className="flex-shrink-0">
                            <IconRenderer name={editingCategory?.icon} />
                        </Button>
                    }
                    className="w-72"
                >
                     <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-2 grid grid-cols-6 gap-1">
                        {MODULE_ICON_OPTIONS.map(iconName => (
                            <button key={iconName} type="button" onClick={() => { setEditingCategory(c => ({...c, icon: iconName})); setIsIconPopoverOpen(false); }} className={`flex items-center justify-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${editingCategory?.icon === iconName ? 'bg-brand-100 dark:bg-brand-500/20' : ''}`}>
                                <IconRenderer name={iconName} size={20} />
                            </button>
                        ))}
                     </div>
                </Popover>
                <Input placeholder="Nome da Categoria" value={editingCategory?.name || ''} onChange={e => setEditingCategory(c => ({...c, name: e.target.value}))} />
            </div>
            <div className="flex flex-wrap gap-2">
                {MODULE_COLOR_OPTIONS.map(colorName => (
                    <button key={colorName} type="button" title={colorName} onClick={() => setEditingCategory(c => ({...c, color: colorName}))} className={`h-6 w-6 rounded-full transition-transform duration-150 ${MODULE_COLOR_MAP[colorName]?.bg} ${editingCategory?.color === colorName ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-current' : 'hover:scale-110'}`}></button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresTesting" checked={editingCategory?.requiresTesting || false} onChange={e => setEditingCategory(c => ({...c, requiresTesting: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
                <label htmlFor="requiresTesting" className="text-sm">Requer Teste de QA</label>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isSaving || !editingCategory?.name?.trim()}>
                    {isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} Salvar
                </Button>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-4">
            {loading && <div className="text-center"><Loader2 className="animate-spin"/></div>}
            {error && <p className="text-red-500 text-sm">Erro ao carregar categorias.</p>}
            
            <div className="space-y-2">
                {categories?.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <IconRenderer name={cat.icon} className={`h-5 w-5 ${MODULE_COLOR_MAP[cat.color]?.text || 'text-slate-500'}`} />
                            <span className="font-medium">{cat.name}</span>
                            {cat.requiresTesting && <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-500/20 dark:text-amber-300">Requer QA</span>}
                        </div>
                        {isEditor && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)}><Pencil size={16}/></Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setCategoryToDelete(cat)}><Trash2 size={16}/></Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editingCategory && renderForm()}

            {isEditor && !editingCategory && (
                <Button variant="outline" className="w-full" onClick={() => setEditingCategory({})}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
                </Button>
            )}

            {categoryToDelete && (
                 <AlertDialog
                    isOpen={!!categoryToDelete}
                    onClose={() => setCategoryToDelete(null)}
                    onConfirm={handleDelete}
                    title={`Excluir Categoria "${categoryToDelete.name}"`}
                    description="Tem certeza? As tarefas existentes nesta categoria não serão alteradas."
                    isConfirming={isSaving}
                />
            )}
        </div>
    );
};


interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [confirmName, setConfirmName] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');

  const userRole = currentUser ? project.members[currentUser.uid] : undefined;
  const isEditor = userRole?.role === 'editor' || userRole?.role === 'owner';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações do Projeto" widthClass="max-w-xl">
        <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-4" role="tablist">
             <button type="button" onClick={() => setActiveTab('general')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${activeTab === 'general' ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'}`}><Settings size={16}/> Geral</button>
             <button type="button" onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${activeTab === 'categories' ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'}`}><List size={16}/> Categorias de Tarefa</button>
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
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
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
           {activeTab === 'categories' && (
                <CategoryManager projectId={project.id} isEditor={isEditor} />
           )}
        </div>
    </Modal>
  );
};

export default ProjectSettingsModal;
