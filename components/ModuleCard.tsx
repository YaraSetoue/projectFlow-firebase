import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { Module, Task, Feature } from '../types';
import { Trash2, Pencil, Loader2, AlertTriangle, Eye } from 'lucide-react';
import Button from './ui/Button';
import AlertDialog from './ui/AlertDialog';
import IconRenderer from './ui/IconRenderer';
import { MODULE_COLOR_MAP } from '../utils/styleUtils';
import { deleteModule } from '../services/firestoreService';

interface ModuleCardProps {
  module: Module;
  tasks: Task[];
  features: Feature[];
  onEdit: () => void;
  isEditor: boolean;
  projectId: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const ModuleCard = ({ module, tasks, features, onEdit, isEditor, projectId }: ModuleCardProps) => {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [isAlertOpen, setAlertOpen] = useState(false);

    const {
        progress,
        completedFeaturesCount,
        totalFeatures
    } = useMemo(() => {
        if (!features || features.length === 0) {
            return { progress: 0, completedFeaturesCount: 0, totalFeatures: 0 };
        }
        const total = features.length;
        const completed = features.filter(f => f.status === 'approved' || f.status === 'released').length;
        const prog = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { progress: prog, completedFeaturesCount: completed, totalFeatures: total };
    }, [features]);

    const totalTasks = tasks.length;

    const colorClass = module.color ? MODULE_COLOR_MAP[module.color] : MODULE_COLOR_MAP.gray;
    const iconColorClass = module.color ? MODULE_COLOR_MAP[module.color]?.text : 'text-brand-500';

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        setError('');
        try {
            await deleteModule(projectId, module.id);
            setAlertOpen(false);
        } catch (err: any) {
            console.error("Failed to delete module:", err);
            setError(err.message || 'Não foi possível excluir o módulo.');
            setIsDeleting(false);
        }
    };

    const handleViewTasks = () => {
        navigate(`/project/${projectId}?module=${module.id}`);
    };

    return (
        <>
        <motion.div 
            {...{variants: cardVariants} as any}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
        >
            <div className="p-6 flex-grow">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${colorClass?.badge}`}>
                         <IconRenderer name={module.icon} className={`h-6 w-6 ${iconColorClass}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {module.name}
                    </h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 min-h-[60px]">
                    {module.description || "Nenhuma descrição fornecida."}
                </p>
                
                {totalFeatures > 0 ? (
                    <div className="mt-4">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-2 rounded-full transition-all duration-500 ${colorClass?.bg}`} 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{progress}%</span> ({completedFeaturesCount} de {totalFeatures} {totalFeatures === 1 ? 'funcionalidade aprovada' : 'funcionalidades aprovadas'})
                        </p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {totalTasks} {totalTasks === 1 ? 'tarefa no total' : 'tarefas no total'}
                        </p>
                    </div>
                ) : (
                     <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400 py-4">
                        Nenhuma funcionalidade associada.
                    </div>
                )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg border-t border-slate-100 dark:border-slate-800 flex justify-end items-center">
                <div className="flex gap-2">
                     <Button onClick={handleViewTasks} variant="ghost" size="sm">
                        <Eye size={16} className="mr-1" />
                        Ver Tarefas
                    </Button>
                    {isEditor && (
                        <>
                            <Button onClick={onEdit} variant="ghost" size="icon">
                                <Pencil size={16} />
                            </Button>
                            <Button onClick={() => setAlertOpen(true)} variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40" disabled={isDeleting}>
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {error && (
                <div className="p-2 bg-red-100 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}
        </motion.div>
        <AlertDialog
            isOpen={isAlertOpen}
            onClose={() => setAlertOpen(false)}
            onConfirm={handleConfirmDelete}
            title={`Excluir Módulo "${module.name}"`}
            description="Você tem certeza? A exclusão de um módulo é permanente e não pode ser desfeita."
            isConfirming={isDeleting}
        />
        </>
    );
};

export default ModuleCard;