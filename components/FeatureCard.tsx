

import React, { useState, useMemo } from 'react';
import { Feature, Task, UserSummary } from '../types';
import { MoreHorizontal, Trash2, Loader2, Check, FileText } from 'lucide-react';
import Button from './ui/Button';
import AlertDialog from './ui/AlertDialog';
import ProgressBar from './ui/ProgressBar';
import AvatarGroup from './ui/AvatarGroup';
import Popover from './ui/Popover';
import { deleteFeature } from '../services/firestoreService';
import Badge from './ui/Badge';

interface FeatureCardProps {
    feature: Feature;
    tasks: Task[];
    onEdit: () => void;
    isEditor: boolean;
    projectId: string;
}

const statusConfig: Record<Feature['status'], { label: string; color: string; progressColor: string; }> = {
    backlog: { label: 'Backlog', color: 'bg-slate-500 text-white', progressColor: 'bg-slate-500' },
    in_development: { label: 'Em Desenvolvimento', color: 'bg-blue-500 text-white', progressColor: 'bg-blue-500' },
    in_testing: { label: 'Em Teste', color: 'bg-amber-500 text-white', progressColor: 'bg-amber-500' },
    approved: { label: 'Aprovado', color: 'bg-green-500 text-white', progressColor: 'bg-green-500' },
    released: { label: 'Lançado', color: 'bg-violet-500 text-white', progressColor: 'bg-violet-500' },
    done: { label: 'Concluído', color: 'bg-green-600 text-white', progressColor: 'bg-green-600' },
};

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, tasks, onEdit, isEditor, projectId }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [isActionsOpen, setActionsOpen] = useState(false);

    const {
        taskProgress,
        doneTasksCount,
        totalTasks,
        assignees,
    } = useMemo(() => {
        const total = tasks.length;
        if (total === 0) {
            return { taskProgress: 0, doneTasksCount: 0, totalTasks: 0, assignees: [] };
        }
        const done = tasks.filter(t => t.status === 'done').length;
        const progress = Math.round((done / total) * 100);
        const uniqueAssignees = Array.from(new Map(tasks.map(t => t.assignee).filter(Boolean).map(u => [u!.uid, u])).values());

        return { taskProgress: progress, doneTasksCount: done, totalTasks: total, assignees: uniqueAssignees };
    }, [tasks]);

    const {
        passed_tests,
        total_tests,
    } = useMemo(() => {
        const tests = feature.testCases || [];
        const total = tests.length;
        if (total === 0) {
            return { passed_tests: 0, total_tests: 0 };
        }
        const passed = tests.filter(tc => tc.status === 'passed').length;
        return { passed_tests: passed, total_tests: total };
    }, [feature.testCases]);


    const handleConfirmDelete = async () => {
        if (!isEditor) return;
        setIsDeleting(true);
        setError('');
        try {
            await deleteFeature(projectId, feature.id);
            setAlertOpen(false);
        } catch (err: any) {
            setError(err.message || 'Falha ao excluir a funcionalidade.');
            setIsDeleting(false);
        }
    };

    const currentStatus = statusConfig[feature.status] || statusConfig.backlog;

    return (
        <>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Status */}
                    <div className="w-40 flex-shrink-0">
                        <Badge className={`!py-1 !px-3 ${currentStatus.color}`}>{currentStatus.label}</Badge>
                    </div>

                    {/* Name & Description */}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={feature.name}>{feature.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{feature.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                    {/* Task Progress */}
                    <div className="w-48 hidden lg:block">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Tarefas</span>
                            <span className="text-xs text-slate-500">{doneTasksCount}/{totalTasks}</span>
                        </div>
                        <ProgressBar value={taskProgress} colorClass={currentStatus.progressColor} />
                    </div>

                    {/* Test Progress */}
                    <div className="w-32 hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Check className="h-4 w-4 text-green-500"/>
                        <span>{passed_tests}/{total_tests} Testes</span>
                    </div>
                    
                    {/* Assignees */}
                    <div className="hidden sm:block">
                        <AvatarGroup users={assignees} max={3} />
                    </div>
                    
                    {/* Actions */}
                    {isEditor && (
                         <Popover
                            isOpen={isActionsOpen}
                            onClose={() => setActionsOpen(false)}
                            trigger={
                                <Button variant="ghost" size="icon" onClick={() => setActionsOpen(true)}>
                                    <MoreHorizontal size={18} />
                                </Button>
                            }
                            className="w-40"
                            position="right"
                        >
                             <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                                <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => { onEdit(); setActionsOpen(false); }}>
                                    <FileText className="mr-2 h-4 w-4"/>Abrir Detalhes
                                </Button>
                                <Button variant="ghost" className="w-full justify-start text-sm text-red-500 hover:text-red-500" onClick={() => { setAlertOpen(true); setActionsOpen(false); }}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                </Button>
                             </div>
                        </Popover>
                    )}
                </div>
            </div>
             {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <AlertDialog
                isOpen={isAlertOpen}
                onClose={() => setAlertOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Excluir Funcionalidade "${feature.name}"`}
                description="Você tem certeza? Esta ação não pode ser desfeita e removerá a associação desta funcionalidade de todas as tarefas."
                isConfirming={isDeleting}
            />
        </>
    );
};

export default FeatureCard;