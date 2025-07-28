import React, { useState } from 'react';
import { createRelationship } from '../../services/firestoreService';
import { Entity, RELATIONSHIP_TYPES, RelationshipType } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { Loader2, Share2 } from 'lucide-react';

interface CreateRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  entities: Entity[];
}

const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({ isOpen, onClose, projectId, entities }) => {
  const [sourceEntityId, setSourceEntityId] = useState<string>('');
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [type, setType] = useState<RelationshipType>('One to Many');
  const [description, setDescription] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setSourceEntityId('');
    setTargetEntityId('');
    setType('One to Many');
    setDescription('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceEntityId || !targetEntityId) {
        setError('As entidades de origem e destino devem ser selecionadas.');
        return;
    }
     if (sourceEntityId === targetEntityId) {
        setError('As entidades de origem e destino não podem ser as mesmas.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
        const relationshipData = { sourceEntityId, targetEntityId, type, description };
        await createRelationship(projectId, relationshipData);
        handleClose();
    } catch (err: any) {
      console.error("Failed to create relationship:", err);
      setError(err.message || 'Falha ao criar a relação. Tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderSelect = (id: string, value: string, onChange: (val: string) => void, placeholder: string) => (
     <select 
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isLoading}
        required
        className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
        <option value="" disabled>{placeholder}</option>
        {entities.map(entity => (
            <option key={entity.id} value={entity.id}>{entity.name}</option>
        ))}
    </select>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Nova Relação">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-full">
                    <label htmlFor="sourceEntity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Entidade de Origem
                    </label>
                    {renderSelect('sourceEntity', sourceEntityId, setSourceEntityId, 'Selecione a origem...')}
                </div>
                <div className="w-full">
                    <label htmlFor="targetEntity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Entidade de Destino
                    </label>
                    {renderSelect('targetEntity', targetEntityId, setTargetEntityId, 'Selecione o destino...')}
                </div>
            </div>
             <div>
                <label htmlFor="relationshipType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Relação
                </label>
                 <select 
                    id="relationshipType"
                    value={type}
                    onChange={e => setType(e.target.value as RelationshipType)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                    {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="relationshipDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                </label>
                <Textarea
                    id="relationshipDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Um usuário tem muitos posts"
                    rows={2}
                    disabled={isLoading}
                />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !sourceEntityId || !targetEntityId}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Relação
                </Button>
            </div>
        </form>
    </Modal>
  );
};

export default CreateRelationshipModal;