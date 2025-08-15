
import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, collection, query, where, orderBy } from '@firebase/firestore';
import { Loader2, ArrowLeft, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../firebase/config';
import { useFirestoreDocument } from '../hooks/useFirestoreQuery';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { Task, Feature, TestCase } from '../types';
import { approveTask, reproveTask, updateFeature } from '../services/firestoreService';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

const InfoBlock = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</h3>
        <div className="text-slate-800 dark:text-slate-200">{children}</div>
    </div>
);

const TestCaseItem = ({ testCase, onStatusChange, isEditor }: { testCase: TestCase; onStatusChange: (status: 'passed' | 'failed') => void; isEditor: boolean; }) => {
    return (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-700 dark:text-slate-300">{testCase.description}</p>
            <p className="text-xs text-slate-500 mt-1"><b>Resultado Esperado:</b> {testCase.expectedResult}</p>
            <div className="flex items-center justify-between mt-3">
                <div>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        testCase.status === 'passed' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' :
                        testCase.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                        'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                        {testCase.status === 'passed' ? 'Aprovado' : testCase.status === 'failed' ? 'Falhou' : 'Pendente'}
                    </span>
                </div>
                {isEditor && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20" onClick={() => onStatusChange('passed')}>
                            <CheckCircle size={16} /> <span className="ml-1 hidden sm:inline">Passou</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20" onClick={() => onStatusChange('failed')}>
                            <XCircle size={16} /> <span className="ml-1 hidden sm:inline">Falhou</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ReproveModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (feedback: string) => void; }) => {
    const [feedback, setFeedback] = useState('');
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reprovar Tarefa">
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(feedback); }}>
                <div className="space-y-4">
                    <p>Por favor, forneça um feedback claro sobre o motivo da reprovação. Isso será adicionado como um comentário na tarefa.</p>
                    <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={5} placeholder="Descreva os problemas encontrados..." required />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Enviar Feedback e Reprovar</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const TaskTestPage = () => {
    const { projectId, taskId } = useParams<{ projectId: string, taskId: string }>();
    const navigate = useNavigate();
    const { project, error: projectError } = useProject();
    const { currentUser } = useAuth();
    
    const [isReproveModalOpen, setReproveModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const taskRef = useMemo(() => doc(db, 'projects', projectId!, 'tasks', taskId!), [projectId, taskId]);
    const { data: task, loading: taskLoading, error: taskError } = useFirestoreDocument<Task>(taskRef);

    const featureRef = useMemo(() => task?.featureId ? doc(db, 'projects', projectId!, 'features', task.featureId) : null, [projectId, task]);
    const { data: feature, loading: featureLoading, error: featureError } = useFirestoreDocument<Feature>(featureRef);

    const userRole = project && currentUser ? project.members[currentUser.uid]?.role : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';

    const handleTestCaseStatusChange = async (testCaseId: string, newStatus: 'passed' | 'failed') => {
        if (!isEditor || !feature || isProcessing) return;
        setIsProcessing(true);
        const updatedTestCases = (feature.testCases || []).map(tc => 
            tc.id === testCaseId ? { ...tc, status: newStatus } : tc
        );
        try {
            await updateFeature(projectId!, feature.id, { testCases: updatedTestCases });
            if (newStatus === 'failed') {
                toast('Caso de teste falhou. Reprove a tarefa para notificar o desenvolvedor.', { icon: '👎' });
            }
        } catch (error) {
            toast.error("Falha ao atualizar o caso de teste.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        if (!isEditor || !task || !feature) return;
        const allTestsPassed = feature.testCases.every(tc => tc.status === 'passed');
        if (!allTestsPassed) {
            toast.error("Todos os casos de teste devem ser aprovados antes de aprovar a tarefa.");
            return;
        }
        setIsProcessing(true);
        try {
            await approveTask(projectId!, taskId!, feature.id);
            toast.success("Tarefa aprovada com sucesso!");
            navigate(`/project/${projectId}/testing`);
        } catch (error) {
            toast.error("Falha ao aprovar a tarefa.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleReprove = async (feedback: string) => {
        if (!isEditor || !task || !feature) return;
        setIsProcessing(true);
        setReproveModalOpen(false);
        try {
            const members = Object.values(project.members);
            await reproveTask(projectId!, taskId!, feature.id, feedback, project.name, task.title, members);
            toast.success("Tarefa reprovada e devolvida ao desenvolvedor.");
            navigate(`/project/${projectId}/testing`);
        } catch (error) {
            toast.error("Falha ao reprovar a tarefa.");
        } finally {
            setIsProcessing(false);
        }
    };

    const loading = taskLoading || featureLoading;
    const error = taskError || featureError || projectError;

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
    if (error) return <div className="p-8"><ConnectionErrorState error={error} context="página de teste da tarefa" /></div>;
    if (!task || !feature) return <div className="p-8 text-center">Tarefa ou funcionalidade não encontrada.</div>;

    return (
        <motion.div {...{ initial: { opacity: 0 }, animate: { opacity: 1 } }} className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Link to={`/project/${projectId}/testing`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 font-semibold">
                    <ArrowLeft size={16} /> Voltar para a Fila de Testes
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Contexto */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md space-y-6 self-start">
                    <h2 className="text-xl font-bold border-b pb-4 dark:border-slate-700">Contexto da Tarefa</h2>
                    <InfoBlock label="Tarefa">
                        <p className="font-bold text-lg">{task.title}</p>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 mt-1" dangerouslySetInnerHTML={{ __html: task.description }} />
                    </InfoBlock>
                     <InfoBlock label="Funcionalidade">
                        <p className="font-semibold">{feature.name}</p>
                         <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                    </InfoBlock>
                     <InfoBlock label="Fluxo do Usuário">
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            {feature.userFlows.map(flow => <li key={flow.id}>{flow.description}</li>)}
                        </ol>
                    </InfoBlock>
                </div>

                {/* Coluna Direita: Ações */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md space-y-4">
                        <h2 className="text-xl font-bold">Casos de Teste</h2>
                        <div className="space-y-3">
                            {feature.testCases.map(tc => <TestCaseItem key={tc.id} testCase={tc} onStatusChange={(status) => handleTestCaseStatusChange(tc.id, status)} isEditor={isEditor} />)}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Após executar todos os testes, aprove ou reprove a tarefa.</p>
                        <div className="flex gap-2">
                             <Button onClick={() => setReproveModalOpen(true)} disabled={isProcessing} variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                                <XCircle className="mr-2 h-4 w-4" /> Reprovar Tarefa
                            </Button>
                            <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                Aprovar Tarefa
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ReproveModal isOpen={isReproveModalOpen} onClose={() => setReproveModalOpen(false)} onSubmit={handleReprove} />
        </motion.div>
    );
};

export default TaskTestPage;
