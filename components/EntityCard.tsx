import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { Entity, Task } from '../types';
import { Database, Trash2, Pencil, Loader2, AlertTriangle, Check, Link as LinkIcon } from 'lucide-react';
import Button from './ui/Button';
import AlertDialog from './ui/AlertDialog';
import { deleteEntity } from '../services/firestoreService';

interface EntityCardProps {
  entity: Entity;
  allTasks: Task[];
  onEdit: () => void;
  isEditor: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            isActive ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
    >
        {children}
    </button>
);


const EntityCard = ({ entity, allTasks, onEdit, isEditor }: EntityCardProps) => {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'attributes' | 'tasks'>('attributes');

    const relatedTasks = useMemo(() => {
        if (!entity.id || !allTasks) return [];
        return allTasks.filter(task => {
            // This is a placeholder for the new logic. The task model no longer has direct entity IDs.
            // This will need to be updated once features are fully integrated.
            // For now, it will likely show 0 tasks.
            return false; 
        });
    }, [allTasks, entity.id]);


    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        setError('');
        try {
            await deleteEntity(entity.projectId, entity.id);
            setAlertOpen(false);
        } catch (err: any) {
            console.error("Failed to delete entity:", err);
            setError(err.message || 'Não foi possível excluir a entidade.');
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleTaskClick = (taskId: string) => {
        navigate(`/project/${entity.projectId}/datamodel?task=${taskId}`);
    };

    return (
        <>
        <motion.div 
            {...{variants: cardVariants} as any}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
        >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                       <Database className="h-6 w-6 text-brand-500" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            {entity.name}
                        </h3>
                    </div>
                     <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 ml-9">
                        {entity.description || "Nenhuma descrição fornecida."}
                    </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    {isEditor && (
                        <>
                            <Button onClick={onEdit} variant="ghost" size="icon" aria-label={`Editar ${entity.name}`}>
                                <Pencil size={16} />
                            </Button>
                            <Button onClick={() => setAlertOpen(true)} variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40" disabled={isDeleting} aria-label={`Excluir ${entity.name}`}>
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex items-center gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <TabButton isActive={activeTab === 'attributes'} onClick={() => setActiveTab('attributes')}>Atributos ({entity.attributes.length})</TabButton>
                    <TabButton isActive={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>Tarefas ({relatedTasks.length})</TabButton>
                </div>
                
                <div className="flex-grow min-h-[100px]">
                    {activeTab === 'attributes' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-4 py-2">Atributo</th>
                                        <th scope="col" className="px-4 py-2">Tipo</th>
                                        <th scope="col" className="px-4 py-2 text-center">Obrigatório</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entity.attributes.map(attr => (
                                        <tr key={attr.id} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 last:border-b-0">
                                            <td className="px-4 py-2 font-medium text-slate-900 dark:text-white" title={attr.description}>{attr.name}</td>
                                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{attr.dataType}</td>
                                            <td className="px-4 py-2 text-center text-brand-500">
                                                {attr.isRequired ? <Check className="inline-block h-4 w-4"/> : <div className="inline-block h-4 w-4 border border-slate-400 rounded-sm"></div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {entity.attributes.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-4">Nenhum atributo definido.</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'tasks' && (
                        <div className="space-y-2">
                             {relatedTasks.length > 0 ? relatedTasks.map(task => (
                                <div key={task.id} onClick={() => handleTaskClick(task.id)} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                    <span className="truncate flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> {task.title}</span>
                                    <LinkIcon className="h-4 w-4 text-slate-400"/>
                                </div>
                             )) : <p className="text-center text-xs text-slate-500 py-4">Nenhuma tarefa relacionada.</p>}
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div className="p-2 bg-red-100 text-red-700 text-xs flex items-center gap-2 rounded-b-lg">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}
        </motion.div>
        <AlertDialog
            isOpen={isAlertOpen}
            onClose={() => setAlertOpen(false)}
            onConfirm={handleConfirmDelete}
            title={`Excluir Entidade "${entity.name}"`}
            description="Isso também excluirá quaisquer relações e removerá as associações com tarefas e módulos. Esta ação não pode ser desfeita."
            isConfirming={isDeleting}
        />
        </>
    );
};

export default EntityCard;