import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { updateProject, deleteProject } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Project } from '../../types';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações do Projeto">
        <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2">
          {/* General Settings Form */}
          <form onSubmit={handleUpdate} className="space-y-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Geral</h3>
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

          {/* Danger Zone */}
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

          {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
        </div>
    </Modal>
  );
};

export default ProjectSettingsModal;