import React, { useState, useEffect } from 'react';
import { Credential } from '../../types';
import { createCredential, updateCredential } from '../../services/firestoreService';
import { encryptValue } from '../../services/cryptoService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2 } from 'lucide-react';

interface CreateEditCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  masterKey: string;
  salt: string;
  credentialToEdit: Credential | null;
}

const CreateEditCredentialModal: React.FC<CreateEditCredentialModalProps> = ({ 
    isOpen, onClose, projectId, masterKey, salt, credentialToEdit 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = credentialToEdit !== null;

  useEffect(() => {
    if (credentialToEdit) {
      setName(credentialToEdit.name);
      setDescription(credentialToEdit.description);
      setValue(''); // Never show existing value, always require re-entry for security
    } else {
      setName('');
      setDescription('');
      setValue('');
    }
    setError('');
  }, [credentialToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim()) {
      setError('O nome e o valor da credencial são obrigatórios.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const { encryptedValue, iv } = encryptValue(value, masterKey, salt);
      const credentialData = { name, description, value: encryptedValue, iv };

      if (isEditing) {
        await updateCredential(projectId, credentialToEdit!.id, credentialData);
      } else {
        await createCredential(projectId, credentialData);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save credential:", err);
      setError(err.message || 'Falha ao salvar a credencial.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Credencial' : 'Nova Credencial'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="credName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome da Credencial
          </label>
          <Input
            id="credName"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Chave da API do Stripe"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="credDesc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Descrição (Opcional)
          </label>
          <Textarea
            id="credDesc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Para que esta credencial é usada?"
            rows={2}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="credValue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Valor do Segredo
          </label>
          <Textarea
            id="credValue"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={isEditing ? "Deixe em branco para não alterar" : "Cole o valor secreto aqui"}
            rows={3}
            required={!isEditing}
            disabled={isLoading}
            className="font-mono"
          />
           {isEditing && <p className="text-xs text-slate-500 mt-1">Digite um novo valor para atualizar a credencial. Deixar em branco manterá o valor atual.</p>}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || (!value.trim() && !isEditing)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Adicionar Credencial'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditCredentialModal;
