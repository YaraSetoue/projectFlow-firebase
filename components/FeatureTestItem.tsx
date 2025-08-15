import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Feature, Task, TestCase, Module } from '../types';
import { ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { approveFeature, reproveFeature, updateFeature } from '../services/firestoreService';

interface FeatureTestItemProps {
    feature: Feature;
    tasks: Task[];
    module?: Module;
    isEditor: boolean;
    projectId: string;
}

const FeatureTestItem = ({ feature, tasks, module, isEditor, projectId }: FeatureTestItemProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleApprove = async () => {
        if (!isEditor) return;
        setIsProcessing(true);
        try {
            await approveFeature(projectId, feature.id);
            // The component will disappear from the list automatically
        } catch (error) {
            console.error("Failed to approve feature:", error);
            toast.error("Falha ao aprovar a funcionalidade.");
            setIsProcessing(false);
        }
    };

     const handleReprove = async () => {
        if (!isEditor) return;
        setIsProcessing(true);
        try {
            await reproveFeature(projectId, feature.id);
            // The component will disappear from the list automatically
        } catch (error) {
            console.error("Failed to reprove feature:", error);
            toast.error("Falha ao reprovar a funcionalidade.");
            setIsProcessing(false);
        }
    };


    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden">
            <header className="flex items-center p-4">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ChevronRight className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                <div className="ml-3 flex-grow min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{feature.name}</h3>
                    {module && <p className="text-sm text-slate-500">Módulo: {module.name}</p>}
                </div>
                {isEditor && (
                    <div className="flex gap-2">
                        <Button onClick={handleReprove} disabled={isProcessing} variant="outline" size="sm">
                            <XCircle className="mr-2 h-4 w-4 text-red-500"/> Reprovar
                        </Button>
                        <Button onClick={handleApprove} disabled={isProcessing} size="sm" className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Aprovar Funcionalidade
                        </Button>
                    </div>
                )}
            </header>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        {...{
                            initial: "collapsed",
                            animate: "open",
                            exit: "collapsed",
                            variants: {
                                open: { opacity: 1, height: 'auto' },
                                collapsed: { opacity: 0, height: 0 }
                            },
                            transition: { duration: 0.3 },
                        } as any}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Descrição</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{feature.description}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Tarefas para Testar</h4>
                                <div className="space-y-2">
                                    {tasks.length > 0 ? tasks.map(task => (
                                        <Link key={task.id} to={`/project/${projectId}/test/${task.id}`} className="block w-full text-left p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                                            <p className="text-sm font-medium">{task.title}</p>
                                        </Link>
                                    )) : <p className="text-sm text-slate-500 italic">Nenhuma tarefa encontrada.</p>}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default FeatureTestItem;
