import React, { useState, useEffect, useMemo } from 'react';
import { createEntity, updateEntity } from '../../services/firestoreService';
import { Entity, Attribute, DATA_TYPES, DataType, Module } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, PlusCircle, Trash2, Boxes } from 'lucide-react';
import Badge from '../ui/Badge';

interface CreateEditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  entity: Entity | null;
  modules: Module[];
}

const CreateEditEntityModal: React.FC<CreateEditEntityModalProps> = ({ isOpen, onClose, projectId, entity, modules }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = entity !== null;
  
  const associatedModules = useMemo(() => {
    if (!entity || !entity.relatedModuleIds || !modules) return [];
    return modules.filter(m => entity.relatedModuleIds!.includes(m.id));
  }, [entity, modules]);

  useEffect(() => {
    if (entity) {
        setName(entity.name);
        setDescription(entity.description);
        setAttributes(entity.attributes || []);
    } else {
        setName('');
        setDescription('');
        setAttributes([]);
    }
  }, [entity, isOpen]);
  
  const handleClose = () => {
    setError('');
    onClose();
  };

  const addAttribute = () => {
    setAttributes([...attributes, { 
        id: `temp_${Date.now()}`, 
        name: '', 
        dataType: 'String', 
        isRequired: false, 
        description: '' 
    }]);
  };

  const removeAttribute = (id: string) => {
      setAttributes(attributes.filter(attr => attr.id !== id));
  };

  const updateAttribute = (id: string, field: keyof Attribute, value: any) => {
    setAttributes(attributes.map(attr => 
        attr.id === id ? { ...attr, [field]: value } : attr
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        setError('O nome da entidade é obrigatório.');
        return;
    }
    const hasEmptyAttributeNames = attributes.some(attr => !attr.name.trim());
    if (hasEmptyAttributeNames) {
        setError('Todos os atributos devem ter um nome.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
        const entityData = { name, description, attributes };
        if (isEditing) {
            await updateEntity(projectId, entity.id, entityData);
        } else {
            await createEntity(projectId, { ...entityData, relatedModuleIds: [], relatedTaskIds: [] });
        }
        handleClose();
    } catch (err: any) {
      console.error("Failed to save entity:", err);
      setError(err.message || 'Falha ao salvar a entidade. Tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Editar Entidade' : 'Criar Nova Entidade'}>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1">
                <div>
                    <label htmlFor="entityName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nome da Entidade
                    </label>
                    <Input id="entityName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Usuário" required disabled={isLoading} />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Módulos Associados (Read-Only)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md min-h-[40px]">
                    {isEditing && associatedModules.length > 0 ? (
                        associatedModules.map(module => (
                            <Badge key={module.id} className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                                <Boxes size={12} className="mr-1" />
                                {module.name}
                            </Badge>
                        ))
                    ) : (
                         <span className="text-sm text-slate-500">
                            {isEditing ? 'Nenhum módulo associado.' : 'Associe a partir de um módulo após criar a entidade.'}
                        </span>
                    )}
                </div>
            </div>
            <div>
                <label htmlFor="entityDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                </label>
                <Textarea id="entityDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que esta entidade representa?" rows={2} disabled={isLoading} />
            </div>

            {/* Attributes Section */}
            <div className="space-y-4">
                <h4 className="text-md font-medium text-slate-800 dark:text-slate-200">Atributos</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {attributes.map((attr, index) => (
                        <div key={attr.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                            <div className="col-span-12 sm:col-span-3">
                                <Input value={attr.name} onChange={e => updateAttribute(attr.id, 'name', e.target.value)} placeholder="Nome" required disabled={isLoading} />
                            </div>
                            <div className="col-span-6 sm:col-span-3">
                                <select value={attr.dataType} onChange={e => updateAttribute(attr.id, 'dataType', e.target.value as DataType)} disabled={isLoading} className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                                    {DATA_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div className="col-span-6 sm:col-span-4">
                                <Input value={attr.description} onChange={e => updateAttribute(attr.id, 'description', e.target.value)} placeholder="Descrição" disabled={isLoading} />
                            </div>
                            <div className="col-span-6 sm:col-span-1 flex items-center justify-center">
                                <input type="checkbox" checked={attr.isRequired} onChange={e => updateAttribute(attr.id, 'isRequired', e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" title="É obrigatório?" />
                            </div>
                            <div className="col-span-6 sm:col-span-1 flex items-center justify-center">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAttribute(attr.id)} disabled={isLoading} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                     {attributes.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhum atributo adicionado.</p>}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAttribute} disabled={isLoading} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atributo
                </Button>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !name.trim()}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Salvar Alterações' : 'Criar Entidade'}
                </Button>
            </div>
        </form>
    </Modal>
  );
};

export default CreateEditEntityModal;