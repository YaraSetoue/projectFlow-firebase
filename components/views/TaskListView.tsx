

import React, { useState, useMemo } from 'react';
import { Loader2, ArrowUpDown, MoreHorizontal, Trash2, ChevronDown, Check, ArrowUp, ArrowDown, Eye, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Task, Member, TaskStatus, User, Module } from '../../types';
import { updateTask, deleteTask, stopTimer } from '../../services/firestoreService';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Popover from '../ui/Popover';
import AlertDialog from '../ui/AlertDialog';
import IconRenderer from '../ui/IconRenderer';
import { MODULE_COLOR_MAP } from '../../utils/styleUtils';
import { formatDuration } from '../../utils/placeholder';

type SortKey = 'title' | 'assignee' | 'status' | 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    inprogress: 'bg-blue-200 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
    ready_for_qa: 'bg-violet-200 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300',
    in_testing: 'bg-amber-200 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
    approved: 'bg-cyan-200 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300',
    done: 'bg-green-200 dark:bg-green-900/40 text-green-600 dark:text-green-300',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'A Fazer',
    inprogress: 'Em Progresso',
    ready_for_qa: 'Pronto para QA',
    in_testing: 'Em Teste',
    approved: 'Aprovado',
    done: 'Concluído',
};

const SortableHeader = ({ title, sortKey, sortConfig, requestSort, className }: { title: string, sortKey: SortKey, sortConfig: SortConfig, requestSort: (key: SortKey) => void, className?: string }) => {
    const isSorted = sortConfig.key === sortKey;
    const Icon = isSorted
        ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown)
        : ArrowUpDown;

    return (
        <th scope="col" className={`px-4 py-3 ${className || ''}`}>
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <Icon
                    className={`h-4 w-4 transition-opacity ${isSorted ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}
                />
            </button>
        </th>
    );
};

const StatusSelector = ({ task, isEditor, currentUser }: { task: Task, isEditor: boolean, currentUser: User | null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const statuses: TaskStatus[] = ['todo', 'inprogress', 'ready_for_qa', 'in_testing', 'approved', 'done'];

    const handleStatusChange = async (newStatus: TaskStatus) => {
        if (!isEditor || newStatus === task.status || ['in_testing', 'approved', 'done'].includes(task.status)) {
            setIsOpen(false);
            return;
        }

        setIsUpdating(true);
        setIsOpen(false);

        try {
            await updateTask(task.projectId, task.id, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const canChangeStatus = isEditor && !['in_testing', 'approved', 'done'].includes(task.status);

    return (
        <Popover
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={
                <button
                    onClick={() => setIsOpen(true)}
                    disabled={!canChangeStatus || isUpdating}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors min-w-[120px] ${statusColors[task.status]} ${canChangeStatus ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                >
                    {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    ) : (
                        <>
                            <span className="flex-grow text-left">{STATUS_LABELS[task.status]}</span>
                            {canChangeStatus && <ChevronDown className="h-4 w-4" />}
                        </>
                    )}
                </button>
            }
            className="w-48"
        >
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                {statuses.map(status => (
                    <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="w-full text-left flex items-center justify-between gap-2 p-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <span>{STATUS_LABELS[status]}</span>
                        {task.status === status && <Check className="h-4 w-4 text-brand-500"/>}
                    </button>
                ))}
            </div>
        </Popover>
    );
};

const TaskActions = ({ task, onTaskClick, isEditor }: { task: Task, onTaskClick: (task: Task) => void, isEditor: boolean }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteTask(task.projectId, task.id);
            setIsAlertOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Falha ao excluir tarefa.");
            setIsAlertOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}#/project/${task.projectId}?task=${task.id}`;
        navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => {
            setCopySuccess(false);
            setIsPopoverOpen(false);
        }, 1500);
    };
    
    if (!isEditor) return null;

    return (
        <>
            <Popover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                trigger={<button onClick={() => setIsPopoverOpen(true)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"><MoreHorizontal className="h-4 w-4"/></button>}
                className="w-48"
                position="right"
            >
                <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                    <button
                        onClick={() => { onTaskClick(task); setIsPopoverOpen(false); }}
                        className="w-full text-left flex items-center gap-2 p-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <Eye className="h-4 w-4"/> Abrir Detalhes
                    </button>
                     <button
                        onClick={handleCopyLink}
                        className="w-full text-left flex items-center gap-2 p-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        {copySuccess ? <Check className="h-4 w-4 text-green-500"/> : <LinkIcon className="h-4 w-4"/>}
                        {copySuccess ? "Link Copiado!" : "Copiar Link"}
                    </button>
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
                    <button
                        onClick={() => { setIsAlertOpen(true); setIsPopoverOpen(false); }}
                        className="w-full text-left flex items-center gap-2 p-2 text-sm rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                        <Trash2 className="h-4 w-4"/> Excluir Tarefa
                    </button>
                </div>
            </Popover>
            <AlertDialog
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Tarefa"
                description={`Tem certeza que deseja excluir a tarefa "${task.title}"? Esta ação é permanente.`}
                isConfirming={isDeleting}
            />
        </>
    )
};


const TaskRow = ({ task, onTaskClick, moduleLookup, projectMembers, isEditor, currentUser }: { task: Task, onTaskClick: (task: Task) => void, moduleLookup: Record<string, Module>, projectMembers: Member[], isEditor: boolean, currentUser: User | null }) => {
    const assignee = useMemo(() => task.assignee ? projectMembers.find(m => m.uid === task.assignee!.uid) : null, [task.assignee, projectMembers]);
    const totalTime = useMemo(() => (task.timeLogs || []).reduce((acc, log) => acc + log.durationInSeconds, 0), [task.timeLogs]);
    const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && task.status !== 'done';
    const moduleInfo = task.moduleId ? moduleLookup[task.moduleId] : undefined;
    const moduleColorClasses = moduleInfo?.color ? MODULE_COLOR_MAP[moduleInfo.color]?.badge : MODULE_COLOR_MAP['gray'].badge;
    
    return (
        <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b dark:border-slate-800 align-middle">
            <td className="px-4 py-2">
                <button onClick={() => onTaskClick(task)} className="font-medium text-slate-800 dark:text-slate-100 hover:text-brand-500 text-left w-full">
                    <span className="block truncate">{task.title}</span>
                </button>
            </td>
            <td className="px-4 py-2">
                {assignee ? <Avatar user={assignee} size="sm" /> : <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>}
            </td>
            <td className="px-4 py-2">
                {moduleInfo && (
                    <Badge className={`!py-1 ${moduleColorClasses}`}>
                        <IconRenderer name={moduleInfo.icon} size={14} className="mr-1.5" />
                        {moduleInfo.name}
                    </Badge>
                )}
            </td>
             <td className="px-4 py-2">
                <StatusSelector task={task} isEditor={isEditor} currentUser={currentUser} />
            </td>
             <td className={`px-4 py-2 text-sm ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                {task.dueDate ? task.dueDate.toDate().toLocaleDateString() : '—'}
            </td>
             <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
                {formatDuration(totalTime)}
            </td>
            <td className="px-4 py-2 text-center">
                <div className="relative h-full flex items-center justify-center">
                    <TaskActions task={task} onTaskClick={onTaskClick} isEditor={isEditor} />
                </div>
            </td>
        </tr>
    );
};


interface TaskListViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    moduleLookup: Record<string,Module>;
    projectMembers: Member[];
    isEditor: boolean;
    currentUser: User | null;
    sortConfig: SortConfig;
    requestSort: (key: SortKey) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ tasks, onTaskClick, moduleLookup, projectMembers, isEditor, currentUser, sortConfig, requestSort }) => {

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full table-fixed text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                        <SortableHeader className="w-2/6" title="Título" sortKey="title" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader className="w-1/12" title="Responsável" sortKey="assignee" sortConfig={sortConfig} requestSort={requestSort} />
                        <th scope="col" className="px-4 py-3 w-2/12">Módulo</th>
                        <SortableHeader className="w-2/12" title="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader className="w-1/12" title="Entrega" sortKey="dueDate" sortConfig={sortConfig} requestSort={requestSort} />
                        <th scope="col" className="px-4 py-3 w-1/12">Tempo</th>
                        <th scope="col" className="px-4 py-3 text-center w-1/12">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <TaskRow 
                            key={task.id} 
                            task={task} 
                            onTaskClick={onTaskClick}
                            moduleLookup={moduleLookup}
                            projectMembers={projectMembers}
                            isEditor={isEditor}
                            currentUser={currentUser}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
};

export default TaskListView;