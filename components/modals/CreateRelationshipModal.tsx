
import React, { useState } from 'react';
import { createRelationship } from '../../services/firestoreService';
import { Entity, RELATIONSHIP_TYPES, RelationshipType } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Popover from '../ui/Popover';
import { Loader2, Share2, ChevronDown, Check } from 'lucide-react';

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

  // Popover states
  const [isSourceEntityOpen, setIsSourceEntityOpen] = useState(false);
  const [isTargetEntityOpen, setIsTargetEntityOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

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
  
  const renderSelect = (id: string, value: string, onChange: (val: string) => void, placeholder: string, isOpen: boolean, onToggle: (open: boolean) => void) => (
     <Popover isOpen={isOpen} onClose={() => onToggle(false)} trigger={
        <Button type="button" variant="outline" className="w-full justify-between text-left font-normal" onClick={() => onToggle(true)} disabled={isLoading}>
            <span className="truncate">{entities.find(e => e.id === value)?.name || placeholder}</span>
            <ChevronDown className="h-4 w-4 text-slate-500"/>
        </Button>
    }>
        <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {entities.map(entity => (
                <div key={entity.id} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { onChange(entity.id); onToggle(false); }}>
                    <span>{entity.name}</span>
                    {value === entity.id && <Check className="h-4 w-4 text-brand-500"/>}
                </div>
            ))}
        </div>
    </Popover>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Nova Relação">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-full">
                    <label htmlFor="sourceEntity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Entidade de Origem
                    </label>
                    {renderSelect('sourceEntity', sourceEntityId, setSourceEntityId, 'Selecione a origem...', isSourceEntityOpen, setIsSourceEntityOpen)}
                </div>
                <div className="w-full">
                    <label htmlFor="targetEntity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Entidade de Destino
                    </label>
                    {renderSelect('targetEntity', targetEntityId, setTargetEntityId, 'Selecione o destino...', isTargetEntityOpen, setIsTargetEntityOpen)}
                </div>
            </div>
             <div>
                <label htmlFor="relationshipType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Relação
                </label>
                 <Popover isOpen={isTypeOpen} onClose={() => setIsTypeOpen(false)} trigger={
                     <Button type="button" variant="outline" className="w-full justify-between text-left font-normal" onClick={() => setIsTypeOpen(true)} disabled={isLoading}>
                         <span className="truncate">{type}</span>
                         <ChevronDown className="h-4 w-4 text-slate-500"/>
                     </Button>
                 }>
                    <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                        {RELATIONSHIP_TYPES.map(t => (
                            <div key={t} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setType(t); setIsTypeOpen(false); }}>
                                <span>{t}</span>
                                {type === t && <Check className="h-4 w-4 text-brand-500"/>}
                            </div>
                        ))}
                    </div>
                </Popover>
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
