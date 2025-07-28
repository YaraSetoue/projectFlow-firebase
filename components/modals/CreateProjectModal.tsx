import React, { useState } from 'react';
import { createProject } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
      setName('');
      setDescription('');
      setError('');
      setIsLoading(false);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        setError('O nome do projeto é obrigatório.');
        return;
    }
    if (!currentUser) {
        setError('Você precisa estar logado para criar um projeto.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
      await createProject(name, description, currentUser);
      handleClose();
    } catch (err) {
      console.error("Failed to create project:", err);
      setError('Falha ao criar o projeto. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Novo Projeto">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Projeto
                </label>
                <Input
                    id="projectName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Redesign do Site"
                    required
                    disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição (Opcional)
                </label>
                <Textarea
                    id="projectDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o seu novo projeto"
                    rows={4}
                    disabled={isLoading}
                />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !name.trim()}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Projeto
                </Button>
            </div>
        </form>
    </Modal>
  );
};

export default CreateProjectModal;