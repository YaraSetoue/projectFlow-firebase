import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Relationship } from '../types';
import { Share2, Trash2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import AlertDialog from './ui/AlertDialog';
import { deleteRelationship } from '../services/firestoreService';

interface RelationshipCardProps {
  relationship: Relationship;
  entityMap: Map<string, string>;
  isOwner: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const RelationshipCard = ({ relationship, entityMap, isOwner }: RelationshipCardProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [isAlertOpen, setAlertOpen] = useState(false);

    const sourceName = entityMap.get(relationship.sourceEntityId) || 'Entidade Desconhecida';
    const targetName = entityMap.get(relationship.targetEntityId) || 'Entidade Desconhecida';

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        setError('');
        try {
            await deleteRelationship(relationship.projectId, relationship.id);
            setAlertOpen(false);
        } catch (err: any) {
            console.error("Failed to delete relationship:", err);
            setError(err.message || 'Não foi possível excluir a relação.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
        <motion.div 
            {...{variants: cardVariants} as any}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
        >
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-sm">
                        <Share2 size={16} />
                        <span>{relationship.type}</span>
                    </div>
                    {isOwner && (
                        <Button onClick={() => setAlertOpen(true)} variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 -mt-2 -mr-2" disabled={isDeleting} aria-label="Excluir relação">
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </Button>
                    )}
                </div>

                <div className="flex items-center justify-between text-center gap-2 flex-grow">
                   <div className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-2 rounded-md w-full truncate" title={sourceName}>
                        {sourceName}
                    </div>
                    <ArrowRight size={20} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                   <div className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-2 rounded-md w-full truncate" title={targetName}>
                        {targetName}
                    </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 text-center min-h-[20px]">
                    {relationship.description}
                </p>
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
            title="Excluir Relação"
            description="Você tem certeza que deseja excluir esta relação? Esta ação é permanente."
            isConfirming={isDeleting}
        />
        </>
    );
};

export default RelationshipCard;