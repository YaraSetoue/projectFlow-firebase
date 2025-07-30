import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feature, Task, TestCase, Module } from '../types';
import { ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { approveFeature, updateFeature } from '../services/firestoreService';

interface FeatureTestItemProps {
    feature: Feature;
    tasks: Task[];
    module?: Module;
    isEditor: boolean;
    projectId: string;
    onTaskClick: (task: Task) => void;
}

const TestCaseItem = ({ testCase, onStatusChange, isEditor }: { testCase: TestCase, onStatusChange: (status: 'passed' | 'failed') => void, isEditor: boolean }) => {
    return (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
            <p className="text-sm text-slate-700 dark:text-slate-300">{testCase.description}</p>
            <p className="text-xs text-slate-500 mt-1"><b>Resultado Esperado:</b> {testCase.expectedResult}</p>
            <div className="flex items-center justify-between mt-2">
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


const FeatureTestItem = ({ feature, tasks, module, isEditor, projectId, onTaskClick }: FeatureTestItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isUpdatingTest, setIsUpdatingTest] = useState(false);
    
    const handleApprove = async () => {
        if (!isEditor) return;
        setIsApproving(true);
        try {
            await approveFeature(projectId, feature.id);
            // The component will disappear from the list automatically
        } catch (error) {
            console.error("Failed to approve feature:", error);
            alert("Falha ao aprovar a funcionalidade.");
            setIsApproving(false);
        }
    };

    const handleTestCaseStatusChange = async (testCaseId: string, newStatus: 'passed' | 'failed') => {
        if (!isEditor || isUpdatingTest) return;
        setIsUpdatingTest(true);
        const updatedTestCases = (feature.testCases || []).map(tc => 
            tc.id === testCaseId ? { ...tc, status: newStatus } : tc
        );
        try {
            await updateFeature(projectId, feature.id, { testCases: updatedTestCases });
        } catch (error) {
            console.error("Failed to update test case:", error);
            alert("Falha ao atualizar o caso de teste.");
        } finally {
            setIsUpdatingTest(false);
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
                    <Button onClick={handleApprove} disabled={isApproving} className="ml-4 bg-green-600 hover:bg-green-700">
                        {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Aprovar Funcionalidade
                    </Button>
                )}
            </header>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Descrição</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{feature.description}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Tarefas Concluídas</h4>
                                <div className="space-y-2">
                                    {tasks.length > 0 ? tasks.map(task => (
                                        <button key={task.id} onClick={() => onTaskClick(task)} className="w-full text-left p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                                            <p className="text-sm font-medium">{task.title}</p>
                                        </button>
                                    )) : <p className="text-sm text-slate-500 italic">Nenhuma tarefa encontrada.</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Casos de Teste</h4>
                                 <div className="space-y-3">
                                     {(feature.testCases || []).length > 0 ? feature.testCases.map(tc => (
                                         <TestCaseItem key={tc.id} testCase={tc} onStatusChange={(status) => handleTestCaseStatusChange(tc.id, status)} isEditor={isEditor} />
                                     )) : <p className="text-sm text-slate-500 italic">Nenhum caso de teste definido.</p>}
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