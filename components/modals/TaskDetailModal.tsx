import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, Timestamp, deleteField, doc } from '@firebase/firestore';
import { useFirestoreQuery, useFirestoreDocument } from '../../hooks/useFirestoreQuery';
import { db } from '../../firebase/config';
import { updateTask, addTaskComment, sendNotification, deleteTask, addLinkToTask, removeLinkFromTask, updateLinkInTask } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { useTimeTracking, formatDuration } from '../../utils/placeholder';
import { Task, UserSummary, Comment, Module, TimeLog, Project, Member, TaskLink, Entity, TaskStatus, Feature } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Avatar from '../ui/Avatar';
import Popover from '../ui/Popover';
import AlertDialog from '../ui/AlertDialog';
import { Loader2, Pencil, MessageSquare, Link2, Trash2, Database, X, Boxes, Clock, Play, Pause, AlertTriangle, UserCircle, Check, ChevronDown, PlusCircle, Lock, Eye, Calendar, Save, Shapes } from 'lucide-react';
import Badge from '../ui/Badge';
import ReactQuill from 'react-quill';
import IconRenderer from '../ui/IconRenderer';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  projectId: string;
  project: Project;
  projectMembers: Member[];
  allTasks: Task[];
  modules: Module[];
  entities: Entity[];
}

const QuillEditor = React.memo(ReactQuill);

const PropertyBlock = ({ label, children, className = '' }: { label: string, children: React.ReactNode, className?: string }) => (
  <div className={className}>
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</h3>
    {children}
  </div>
);

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'A Fazer',
    inprogress: 'Em Andamento',
    done: 'Concluído',
};

const taskStatusColors: Record<string, string> = {
    todo: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    inprogress: 'bg-blue-200 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
    done: 'bg-green-200 dark:bg-green-900/40 text-green-600 dark:text-green-300',
};

type ActiveTab = 'activity' | 'dependencies' | 'links';

const TabButton = ({
  onClick,
  isActive,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
      isActive
        ? 'border-brand-500 text-brand-600 dark:text-brand-400'
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
    }`}
  >
    {children}
  </button>
);


const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, taskId, projectId, project, projectMembers, allTasks, modules, entities }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const taskRef = useMemo(() => doc(db, 'projects', projectId, 'tasks', taskId), [projectId, taskId]);
    const { data: realTimeTask, loading: taskLoading, error: taskFetchError } = useFirestoreDocument<Task>(taskRef);

    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editedTask, setEditedTask] = useState<Task | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);

    const { handleStart: handleStartTimer, handleStop: handleStopTimer, isBusy: isTimerBusy, error: timerError, setError: setTimerError } = useTimeTracking();

    // Popover states
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

    // Link states
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editedLinkTitle, setEditedLinkTitle] = useState('');
    const [editedLinkUrl, setEditedLinkUrl] = useState('');
    const [isUpdatingLink, setIsUpdatingLink] = useState(false);

    const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);

    // Dependency states
    const [showDependencyForm, setShowDependencyForm] = useState(false);
    const [isAddingDependency, setIsAddingDependency] = useState(false);
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('activity');


    useEffect(() => {
        if (realTimeTask) {
            setEditedTask(realTimeTask);
            if (isEditing) {
                // If in edit mode, make sure the local state reflects the latest data
            }
        }
    }, [realTimeTask, isEditing]);
    
    useEffect(() => {
        // Reset local state when the modal is opened for a new task
        if (isOpen) {
            setIsEditing(false);
            setApiError(null);
            setTimerError(null);
            setNewComment('');
            setShowLinkForm(false);
            setNewLinkUrl('');
            setNewLinkTitle('');
            setActiveTab('activity');
            setEditingLinkId(null);
            setShowDependencyForm(false);
        }
    }, [isOpen, taskId, setTimerError]);

    const commentsQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'tasks', taskId, 'comments'), orderBy('createdAt', 'asc')),
        [projectId, taskId]
    );
    const { data: comments, loading: commentsLoading, error: commentsError } = useFirestoreQuery<Comment>(commentsQuery);

    const featuresQuery = useMemo(() =>
        query(collection(db, 'projects', projectId, 'features'), orderBy('name', 'asc')),
        [projectId]
    );
    const { data: features } = useFirestoreQuery<Feature>(featuresQuery);

    const featuresByModule = useMemo(() => {
        if (!features || !modules) return {};
        return features.reduce((acc, feature) => {
            (acc[feature.moduleId] = acc[feature.moduleId] || []).push(feature);
            return acc;
        }, {} as Record<string, Feature[]>);
    }, [features, modules]);

    const relatedFeature = useMemo(() =>
        realTimeTask?.featureId && features ? features.find(f => f.id === realTimeTask.featureId) : null,
    [realTimeTask, features]);
    
    const availableTasksForDependency = useMemo(() => {
        if (!realTimeTask) return [];
        const existingDeps = realTimeTask.dependsOn || [];
        return allTasks.filter(t => t.id !== taskId && !existingDeps.includes(t.id));
    }, [allTasks, taskId, realTimeTask]);

    const dependencies = useMemo(() => (realTimeTask?.dependsOn || []).map(depId => allTasks.find(t => t.id === depId)).filter(Boolean) as Task[], [realTimeTask?.dependsOn, allTasks]);
    
    const totalTime = useMemo(() => {
        return (realTimeTask?.timeLogs || []).reduce((acc, log) => acc + log.durationInSeconds, 0);
    }, [realTimeTask?.timeLogs]);

    const userRole = useMemo(() => projectMembers.find(m => m.uid === currentUser?.uid)?.role, [projectMembers, currentUser]);
    const isEditor = userRole === 'owner' || userRole === 'editor';
    
    const displayError = apiError || timerError;

    const handleAddDependency = async (dependencyId: string) => {
        if (!dependencyId || !isEditor || !realTimeTask) return;
        setIsAddingDependency(true);
        setApiError(null);
        try {
            const newDeps = [...(realTimeTask.dependsOn || []), dependencyId];
            await updateTask(projectId, taskId, { dependsOn: newDeps });
            setShowDependencyForm(false);
        } catch (error) {
            console.error("Failed to add dependency:", error);
            setApiError("Falha ao adicionar dependência.");
        } finally {
            setIsAddingDependency(false);
        }
    };

    const handleRemoveDependency = async (dependencyId: string) => {
        if (!isEditor || !realTimeTask) return;
        setApiError(null);
        const originalDeps = realTimeTask.dependsOn || [];
        // Optimistic UI update can be done here if needed
        try {
            const newDeps = originalDeps.filter(id => id !== dependencyId);
            await updateTask(projectId, taskId, { dependsOn: newDeps });
        } catch (error) {
            console.error("Failed to remove dependency:", error);
            setApiError("Falha ao remover dependência.");
            // Revert optimistic UI update here
        }
    };

    const handleUpdate = async () => {
        if (!currentUser || !isEditor || !editedTask || !realTimeTask) return;
        setApiError(null);
        setIsUpdating(true);
        try {
            const oldAssigneeId = realTimeTask.assignee?.uid;
            const newAssigneeId = editedTask.assignee?.uid;

            // Stop timer if task is marked as done
            if (editedTask.status === 'done' && realTimeTask.status !== 'done' && currentUser?.activeTimer?.taskId === taskId) {
                await handleStopTimer();
            }

            const updatePayload: { [key: string]: any } = { 
                title: editedTask.title,
                description: editedTask.description,
                assignee: editedTask.assignee || null,
                dueDate: editedTask.dueDate || null,
                status: editedTask.status,
            };

            if (editedTask.featureId) {
                updatePayload.featureId = editedTask.featureId;
                const feature = features?.find(f => f.id === editedTask.featureId);
                if (feature) {
                    updatePayload.moduleId = feature.moduleId;
                }
            } else {
                updatePayload.featureId = deleteField();
                updatePayload.moduleId = deleteField();
            }
            
            await updateTask(projectId, taskId, updatePayload);
            setIsEditing(false);

            if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== currentUser.uid) {
                await sendNotification(newAssigneeId, {
                    type: 'task_assigned',
                    message: `${currentUser.displayName} te atribuiu à tarefa "${editedTask.title}".`,
                    related: { projectId: project.id, taskId: taskId, projectName: project.name },
                    sender: { name: currentUser.displayName || 'Alguém', photoURL: currentUser.photoURL },
                });
            }
        } catch (error) {
            console.error("Failed to update task:", error);
            setApiError("Falha ao salvar alterações. Verifique sua conexão.");
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleStatusChange = (newStatus: TaskStatus) => {
        if (!isEditor || !editedTask || newStatus === editedTask.status) {
            setIsStatusOpen(false);
            return;
        }
        setIsStatusOpen(false);
        setEditedTask({...editedTask, status: newStatus});
    };

    const handleConfirmDelete = async () => {
        if (!isEditor) return;
        setIsDeleting(true);
        setApiError(null);
        try {
            await deleteTask(projectId, taskId);
            setDeleteAlertOpen(false);
            onClose();
        } catch (err: any) {
            setApiError(err.message || "Falha ao excluir a tarefa. Tente novamente.");
            setDeleteAlertOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewComment(text);
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\S+)$/);

        if (mentionMatch) {
            setShowMentions(true);
            setMentionQuery(mentionMatch[1].toLowerCase());
            setMentionPosition(cursorPos);
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (member: UserSummary) => {
        if (!member.displayName) return;
        const currentText = newComment;
        const textToReplace = currentText.substring(0, mentionPosition);
        const newText = textToReplace.replace(/@(\S+)$/, `@${member.displayName} `);
        setNewComment(newText);
        setShowMentions(false);
        commentInputRef.current?.focus();
    };

    const filteredMembers = useMemo(() => {
        if (!mentionQuery) return projectMembers;
        return projectMembers.filter(m => m.displayName?.toLowerCase().includes(mentionQuery));
    }, [mentionQuery, projectMembers]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser || !isEditor || !realTimeTask) return;
        setApiError(null);
        setIsPostingComment(true);
        try {
            await addTaskComment(projectId, project.name, taskId, realTimeTask.title, newComment, projectMembers);
            setNewComment('');
        } catch (error) {
            setApiError("Falha ao postar comentário. Verifique sua conexão.");
        } finally {
            setIsPostingComment(false);
        }
    };
    
    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkUrl.trim() || !newLinkTitle.trim() || !isEditor) return;
        try { new URL(newLinkUrl); } catch (_) { setApiError("Por favor, insira uma URL válida."); return; }
        setApiError(null);
        setIsAddingLink(true);
        try {
            const newLink: TaskLink = { id: crypto.randomUUID(), url: newLinkUrl, title: newLinkTitle };
            await addLinkToTask(projectId, taskId, newLink);
            setShowLinkForm(false);
            setNewLinkUrl('');
            setNewLinkTitle('');
        } catch (error) {
            setApiError("Falha ao adicionar link.");
        } finally {
            setIsAddingLink(false);
        }
    };
    
    const handleRemoveLink = async (linkToRemove: TaskLink) => {
        if (!isEditor) return;
        setApiError(null);
        try {
            await removeLinkFromTask(projectId, taskId, linkToRemove);
        } catch (error) {
            setApiError("Falha ao remover o link.");
        }
    };

    const handleStartEditLink = (link: TaskLink) => {
        setEditingLinkId(link.id);
        setEditedLinkTitle(link.title);
        setEditedLinkUrl(link.url);
    };

    const handleCancelEditLink = () => {
        setEditingLinkId(null);
        setEditedLinkTitle('');
        setEditedLinkUrl('');
    };
    
    const handleSaveLinkUpdate = async () => {
        if (!editingLinkId || !editedLinkTitle.trim() || !editedLinkUrl.trim()) return;
        try { new URL(editedLinkUrl); } catch (_) { setApiError("URL inválida."); return; }
        
        setIsUpdatingLink(true);
        setApiError(null);
        try {
            const updatedLink: TaskLink = { id: editingLinkId, title: editedLinkTitle, url: editedLinkUrl };
            await updateLinkInTask(projectId, taskId, updatedLink);
            handleCancelEditLink();
        } catch (error) {
            setApiError("Falha ao atualizar o link.");
        } finally {
            setIsUpdatingLink(false);
        }
    };
    
    const quillModules = {
        toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'blockquote', 'code-block'],
        ['clean']
        ],
    };

    const dueDateAsInputString = (timestamp: Timestamp | null | undefined) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        // Adjust for timezone offset before converting to ISO string
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().split('T')[0];
    }

    const onStartTimer = () => { if (isEditor) handleStartTimer(taskId, projectId); };
    const onStopTimer = () => { if (isEditor) handleStopTimer(); };

    const commentsCount = comments?.length ?? 0;
    const dependenciesCount = realTimeTask?.dependsOn?.length ?? 0;
    const linksCount = realTimeTask?.links?.length ?? 0;

    const renderContent = () => {
        if (taskLoading) {
            return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
        }
        if (taskFetchError || !realTimeTask || !editedTask) {
            return <div className="text-center py-10 text-red-500">Falha ao carregar a tarefa ou tarefa não encontrada.</div>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-x-8 gap-y-6">
                {/* ===== COLUNA ESQUERDA (PRINCIPAL) ===== */}
                <div className="md:col-span-2 space-y-6">
                    {displayError && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded-md text-center">{displayError}</p>}
                    
                    <section>
                        <div className="flex justify-between items-start gap-4">
                             {isEditing ? (
                                <Input 
                                    value={editedTask.title} 
                                    onChange={e => setEditedTask({...editedTask, title: e.target.value})} 
                                    placeholder="Título da Tarefa"
                                    className="text-2xl font-bold border-transparent focus:border-slate-300 -ml-3"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{realTimeTask.title}</h2>
                            )}

                             {isEditor && (
                                <div className="flex-shrink-0">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={() => { setIsEditing(false); setApiError(null); setTimerError(null); setEditedTask(realTimeTask); }}>Cancelar</Button>
                                        <Button onClick={handleUpdate} disabled={isUpdating}>
                                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Salvar
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                                        <Pencil className="mr-2 h-4 w-4"/> Editar Tarefa
                                    </Button>
                                )}
                                </div>
                             )}
                        </div>
                    </section>
                    
                    <section>
                         <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Descrição</h3>
                         {isEditing ? (
                            <QuillEditor
                                theme="snow"
                                value={editedTask.description}
                                onChange={(content) => setEditedTask({...editedTask, description: content})}
                                modules={quillModules}
                                readOnly={isUpdating}
                                placeholder="Adicione uma descrição mais detalhada..."
                            />
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400"
                                 dangerouslySetInnerHTML={{ __html: realTimeTask.description || '<p class="text-slate-500 italic">Nenhuma descrição fornecida.</p>' }}
                            />
                        )}
                    </section>

                    <section>
                        <div className="border-b border-slate-200 dark:border-slate-700">
                            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                <TabButton onClick={() => setActiveTab('activity')} isActive={activeTab === 'activity'}>
                                    Atividade {commentsCount > 0 && <Badge>{commentsCount}</Badge>}
                                </TabButton>
                                <TabButton onClick={() => setActiveTab('dependencies')} isActive={activeTab === 'dependencies'}>
                                    Dependências {dependenciesCount > 0 && <Badge>{dependenciesCount}</Badge>}
                                </TabButton>
                                <TabButton onClick={() => setActiveTab('links')} isActive={activeTab === 'links'}>
                                    Links {linksCount > 0 && <Badge>{linksCount}</Badge>}
                                </TabButton>
                            </nav>
                        </div>
                        <div className="pt-6">
                            {activeTab === 'activity' && (
                                <div className="space-y-6">
                                    <div className="flex gap-3 items-start">
                                        <Avatar user={currentUser} size="sm" />
                                        <form onSubmit={handlePostComment} className="relative w-full">
                                        <Textarea ref={commentInputRef} value={newComment} onChange={handleCommentChange} placeholder="Escreva um comentário... Use @ para mencionar." disabled={isPostingComment || !isEditor} rows={2}/>
                                            <div className="mt-2 flex justify-end">
                                                <Button type="submit" size="sm" disabled={isPostingComment || !newComment.trim() || !isEditor}>
                                                    {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Comentar'}
                                                </Button>
                                            </div>
                                        <Popover isOpen={showMentions} onClose={() => setShowMentions(false)} className="w-full">
                                            <div className="max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg">
                                                {filteredMembers.length > 0 ? filteredMembers.map(member => (
                                                    <div key={member.uid} onClick={() => handleMentionSelect(member)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2">
                                                        <Avatar user={member} size="sm" />
                                                        <span className="text-sm">{member.displayName}</span>
                                                    </div>
                                                )) : <div className="p-2 text-sm text-slate-500">Nenhum membro encontrado.</div>}
                                            </div>
                                        </Popover>
                                        </form>
                                    </div>
                                    <div className="space-y-4">
                                        {commentsLoading && <div className="text-center"><Loader2 className="h-5 w-5 animate-spin"/></div>}
                                        {commentsError && <p className="text-sm text-red-500 text-center">Não foi possível carregar os comentários.</p>}
                                        {comments && comments.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhum comentário ainda.</p>}
                                        {comments && comments.length > 0 && comments.map(comment => (
                                            <div key={comment.id} className="flex items-start gap-3">
                                                <Avatar user={comment.author} size="sm" />
                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 w-full">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-sm">{comment.author.displayName}</span>
                                                        <span className="text-xs text-slate-500">{new Date(comment.createdAt?.toDate()).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                           {activeTab === 'dependencies' && (
                                <div className="space-y-2">
                                    {dependencies.map(dep => (
                                        <div key={dep.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-sm group">
                                            <span className="truncate" title={dep.title}>{dep.title}</span>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/project/${project.id}?task=${dep.id}`)} title="Ver tarefa">
                                                    <Eye size={14}/>
                                                </Button>
                                                {isEditor && (
                                                    <button type="button" onClick={() => handleRemoveDependency(dep.id)} className="p-1 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {dependenciesCount === 0 && !showDependencyForm && <p className="text-xs text-slate-500">Nenhuma dependência.</p>}
                                    {isEditor && !showDependencyForm && (
                                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowDependencyForm(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dependência
                                        </Button>
                                    )}
                                    {isEditor && showDependencyForm && (
                                        <div className="flex items-center gap-2 mt-2">
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                                            value=""
                                            onChange={e => handleAddDependency(e.target.value)} disabled={isAddingDependency}
                                        >
                                            <option value="" disabled>Selecione uma tarefa...</option>
                                            {availableTasksForDependency.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                        <Button variant="ghost" onClick={() => setShowDependencyForm(false)}>Cancelar</Button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'links' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        {(realTimeTask.links || []).map(link =>
                                            editingLinkId === link.id ? (
                                                <div key={link.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-3">
                                                    <Input value={editedLinkTitle} onChange={e => setEditedLinkTitle(e.target.value)} placeholder="Título" disabled={isUpdatingLink} autoFocus />
                                                    <Input value={editedLinkUrl} onChange={e => setEditedLinkUrl(e.target.value)} placeholder="URL" disabled={isUpdatingLink} type="url" />
                                                    <div className="flex justify-end gap-2">
                                                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditLink} disabled={isUpdatingLink}>Cancelar</Button>
                                                        <Button type="button" size="sm" onClick={handleSaveLinkUpdate} disabled={isUpdatingLink || !editedLinkUrl || !editedLinkTitle}>
                                                            {isUpdatingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={link.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md text-sm group">
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:underline truncate">
                                                        <Link2 size={14} /><span className="truncate" title={link.title}>{link.title}</span>
                                                    </a>
                                                    {isEditor && (
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditLink(link)}><Pencil size={14}/></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100/50" onClick={() => handleRemoveLink(link)}><Trash2 size={14}/></Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    {linksCount === 0 && !showLinkForm && <p className="text-xs text-slate-500">Nenhum link anexado.</p>}
                                    {isEditor && (
                                        !showLinkForm ? (
                                            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowLinkForm(true)}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Link
                                            </Button>
                                        ) : (
                                            <form onSubmit={handleAddLink} className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                                                <Input value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Título" disabled={isAddingLink} required autoFocus />
                                                <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL" disabled={isAddingLink} type="url" required />
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowLinkForm(false)} disabled={isAddingLink}>Cancelar</Button>
                                                    <Button type="submit" size="sm" disabled={isAddingLink || !newLinkUrl || !newLinkTitle}>
                                                        {isAddingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Adicionar
                                                    </Button>
                                                </div>
                                            </form>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                 {/* ===== COLUNA DIREITA (METADADOS) ===== */}
                <div className="md:col-span-1 space-y-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
                    <PropertyBlock label="Status">
                        {isEditing ? (
                            <Popover isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} trigger={
                                <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setIsStatusOpen(true)} disabled={!isEditor || isUpdating}>
                                    {STATUS_LABELS[editedTask.status]}
                                    <ChevronDown className="h-4 w-4 text-slate-500"/>
                                </Button>
                            }>
                                 <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                                    {Object.keys(STATUS_LABELS).map((statusKey) => (
                                        <button key={statusKey} onClick={() => handleStatusChange(statusKey as TaskStatus)} className="w-full text-left flex items-center justify-between p-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <span>{STATUS_LABELS[statusKey as TaskStatus]}</span>
                                            {editedTask.status === statusKey && <Check className="h-4 w-4 text-brand-500"/>}
                                        </button>
                                    ))}
                                </div>
                            </Popover>
                        ) : (
                            <Badge className={`!py-1 !px-3 font-medium ${taskStatusColors[realTimeTask.status]}`}>
                                {STATUS_LABELS[realTimeTask.status]}
                            </Badge>
                        )}
                    </PropertyBlock>

                    <PropertyBlock label="Responsável">
                        {isEditing ? (
                            <Popover isOpen={isAssigneeOpen} onClose={() => setIsAssigneeOpen(false)} trigger={
                                <Button type="button" variant="outline" className="w-full justify-between text-left h-auto py-2" onClick={() => setIsAssigneeOpen(!isAssigneeOpen)} disabled={!isEditor}>
                                    <span className="flex items-center gap-2">
                                        {editedTask.assignee ? <Avatar user={editedTask.assignee} size="sm" /> : <UserCircle className="h-6 w-6 text-slate-400" />}
                                        <span className="truncate">{editedTask.assignee?.displayName || 'Não atribuído'}</span>
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                </Button>
                            }>
                                <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setEditedTask({ ...editedTask, assignee: null }); setIsAssigneeOpen(false); }}>
                                        <span className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-slate-400" /> Não atribuído</span>
                                        {!editedTask.assignee && <Check className="h-4 w-4 text-brand-500" />}
                                    </div>
                                    {projectMembers.map(member => (
                                        <div key={member.uid} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setEditedTask({ ...editedTask, assignee: { uid: member.uid, displayName: member.displayName, photoURL: member.photoURL } }); setIsAssigneeOpen(false); }}>
                                            <span className="flex items-center gap-2"><Avatar user={member} size="sm" /><span className="truncate">{member.displayName}</span></span>
                                            {editedTask.assignee?.uid === member.uid && <Check className="h-4 w-4 text-brand-500" />}
                                        </div>
                                    ))}
                                </div>
                            </Popover>
                        ) : (
                             <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                {realTimeTask.assignee ? (
                                <>
                                    <Avatar user={realTimeTask.assignee} size="sm" />
                                    <span>{realTimeTask.assignee.displayName}</span>
                                </>
                                ) : (
                                <span className="text-slate-500 dark:text-slate-400">Não atribuído</span>
                                )}
                            </div>
                        )}
                    </PropertyBlock>

                    <PropertyBlock label="Funcionalidade Relacionada">
                         {isEditing ? (
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                value={editedTask.featureId || ''}
                                onChange={e => setEditedTask({ ...editedTask, featureId: e.target.value })}
                                disabled={!isEditor || !features}
                            >
                                <option value="">Nenhuma Funcionalidade</option>
                                {modules.map(module => (
                                    (featuresByModule[module.id] && featuresByModule[module.id].length > 0) && (
                                    <optgroup key={module.id} label={`Módulo: ${module.name}`}>
                                        {featuresByModule[module.id].map(feature => (
                                        <option key={feature.id} value={feature.id}>{feature.name}</option>
                                        ))}
                                    </optgroup>
                                    )
                                ))}
                            </select>
                         ) : (
                             <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                {relatedFeature ? (
                                    <>
                                        <Shapes size={16}/>
                                        <span>{relatedFeature.name}</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 dark:text-slate-400">Nenhuma</span>
                                )}
                            </div>
                         )}
                    </PropertyBlock>
                    
                    <PropertyBlock label="Data de Entrega">
                        {isEditing ? (
                             <Input 
                                type="date"
                                value={dueDateAsInputString(editedTask.dueDate)}
                                onChange={e => setEditedTask({...editedTask, dueDate: e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : null})}
                                disabled={!isEditor}
                            />
                        ) : (
                             <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                {realTimeTask.dueDate ? (
                                    <>
                                        <Calendar size={16}/>
                                        <span>{realTimeTask.dueDate.toDate().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 dark:text-slate-400">Nenhuma</span>
                                )}
                            </div>
                        )}
                    </PropertyBlock>

                     <PropertyBlock label="Controle de Tempo">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total:</p>
                                <p className="text-lg font-bold font-mono">{formatDuration(totalTime)}</p>
                            </div>
                            <div>
                                {currentUser?.activeTimer?.taskId === taskId ? (
                                    <Button onClick={onStopTimer} disabled={isTimerBusy || !isEditor} className="bg-red-600 hover:bg-red-700">
                                        {isTimerBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Pause className="mr-2 h-4 w-4"/>}
                                        Pausar
                                    </Button>
                                ) : (
                                    <Button onClick={onStartTimer} disabled={isTimerBusy || !!currentUser?.activeTimer || !isEditor}>
                                        {isTimerBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                                        Iniciar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </PropertyBlock>

                    {isEditor && (
                        <div className="mt-6 pt-6 border-t border-red-500/20">
                            <Button
                                variant="outline" className="w-full justify-center text-red-600 dark:text-red-400 border-red-500/50 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-700"
                                onClick={() => setDeleteAlertOpen(true)} disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Excluir Tarefa
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Tarefa" widthClass="max-w-5xl">
            {renderContent()}
        </Modal>
        <AlertDialog
            isOpen={isDeleteAlertOpen}
            onClose={() => setDeleteAlertOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Excluir Tarefa"
            description="Você tem certeza que deseja excluir esta tarefa? Esta ação é permanente e não pode ser desfeita."
            isConfirming={isDeleting}
        />
        </>
    );
};

export default TaskDetailModal;