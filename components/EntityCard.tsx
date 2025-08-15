import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Entity, Feature } from '../types';
import { Database, Trash2, Pencil, Loader2, AlertTriangle, Shapes, List } from 'lucide-react';
import Button from './ui/Button';
import AlertDialog from './ui/AlertDialog';
import { deleteEntity } from '../services/firestoreService';
import Badge from './ui/Badge';

interface EntityCardProps {
  entity: Entity;
  allFeatures: Feature[];
  onEdit: () => void;
  isEditor: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const EntityCard = ({ entity, allFeatures, onEdit, isEditor }: EntityCardProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [isAlertOpen, setAlertOpen] = useState(false);
    
    const relatedFeaturesCount = useMemo(() => {
        if (!entity.id || !allFeatures) return 0;
        return allFeatures.filter(feature => 
            feature.userFlows?.some(flow => 
                flow.relatedEntityIds?.includes(entity.id)
            )
        ).length;
    }, [allFeatures, entity.id]);
    
    const attributeCount = entity.attributes?.length || 0;

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        setError('');
        try {
            await deleteEntity(entity.projectId, entity.id);
            setAlertOpen(false);
        } catch (err: any) {
            console.error("Failed to delete entity:", err);
            setError(err.message || 'Não foi possível excluir a entidade. Verifique se ela não está sendo referenciada em relações.');
            setIsDeleting(false);
        }
    };

    return (
        <>
        <motion.div 
            {...{variants: cardVariants} as any}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
        >
            <button 
                onClick={onEdit} 
                className="flex-grow p-4 text-left w-full flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-t-lg"
                aria-label={`Ver detalhes de ${entity.name}`}
            >
                <div className="flex items-center gap-3">
                   <Database className="h-6 w-6 text-brand-500 flex-shrink-0" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {entity.name}
                    </h3>
                </div>
                 <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 flex-grow min-h-[40px]">
                    {entity.description || "Nenhuma descrição fornecida."}
                </p>
            </button>
            
            {/* Footer */}
            <div className="p-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                 <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="!py-1 !px-2">
                        <List size={14} className="mr-1.5"/>
                        {attributeCount} {attributeCount === 1 ? 'Atributo' : 'Atributos'}
                    </Badge>
                     <Badge className="!py-1 !px-2">
                        <Shapes size={14} className="mr-1.5"/>
                        {relatedFeaturesCount} {relatedFeaturesCount === 1 ? 'Func.' : 'Funcs.'}
                    </Badge>
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

            {error && (
                <div className="p-2 bg-red-100 text-red-700 text-xs flex items-center gap-2 rounded-b-lg flex-shrink-0">
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