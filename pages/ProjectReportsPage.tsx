import React, { useMemo, useState, useCallback } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy } from '@firebase/firestore';
import { BarChart2, Loader2, Calendar, CheckCircle, Clock, Zap, Users, ChevronDown, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Task, Member, Module, Feature } from '../types';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import { useTheme } from '../hooks/useTheme';
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/ui/Button';
import Popover from '../components/ui/Popover';
import MultiSelectPopover from '../components/ui/MultiSelectPopover';
import { formatDuration } from '../utils/placeholder';


const dateRangeOptions: { [key: string]: string } = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  'this_month': 'Este Mês',
  'all': 'Todo o Período',
};

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-brand-100 dark:bg-brand-500/20 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const STACKED_BAR_COLORS: { [key: string]: string } = { 
    in_development: '#3b82f6', // blue-500
    in_testing: '#f59e0b',     // amber-500
    approved: '#22c55e',       // green-500
    released: '#8b5cf6',       // violet-500
};


const ProjectReportsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>Projeto não encontrado.</div>;

    const { theme } = useTheme();
    const { project, loading: projectLoading, error: projectError } = useProject();
    
    const [dateRangeKey, setDateRangeKey] = useState('30d');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    // --- Data Fetching ---
    const tasksQuery = useMemo(() => query(collection(db, 'projects', projectId, 'tasks')), [projectId]);
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);
    
    const modulesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'modules'), orderBy('name', 'asc')), [projectId]);
    const { data: modules, loading: modulesLoading, error: modulesError } = useFirestoreQuery<Module>(modulesQuery);

    const featuresQuery = useMemo(() => query(collection(db, 'projects', projectId, 'features')), [projectId]);
    const { data: features, loading: featuresLoading, error: featuresError } = useFirestoreQuery<Feature>(featuresQuery);

    const projectMembers = useMemo(() => {
        if (!project?.members) return [];
        return Object.values(project.members);
    }, [project]);

    // --- Filtering Logic ---
    const dateRange = useMemo(() => {
        const endDate = new Date();
        let startDate = new Date();
        
        switch(dateRangeKey) {
            case '7d': startDate.setDate(endDate.getDate() - 7); break;
            case '30d': startDate.setDate(endDate.getDate() - 30); break;
            case 'this_month': startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); break;
            case 'all': startDate = new Date(0); break;
            default: startDate = new Date(0);
        }
        return { start: startDate, end: endDate };
    }, [dateRangeKey]);
    
    const filteredData = useMemo(() => {
        const memberIdSet = new Set(selectedMemberIds);
        const hasMemberFilter = selectedMemberIds.length > 0;

        const filteredTasks = (tasks || []).filter(task => {
            const isMemberMatch = !hasMemberFilter || (task.assignee && memberIdSet.has(task.assignee.uid));
            return isMemberMatch;
        });

        const filteredTimeLogs = filteredTasks.flatMap(task => task.timeLogs || [])
            .filter(log => {
                if (!log.loggedAt) return false;
                const logDate = log.loggedAt.toDate();
                const isDateMatch = dateRangeKey === 'all' || (logDate >= dateRange.start && logDate <= dateRange.end);
                const isMemberMatch = !hasMemberFilter || memberIdSet.has(log.userId);
                return isDateMatch && isMemberMatch;
            });
        
        const filteredFeatures = features || []; // Features are not filtered by member for simplicity
        
        return { filteredTasks, filteredFeatures, filteredTimeLogs };
    }, [tasks, features, selectedMemberIds, dateRange, dateRangeKey]);


    // --- Data Aggregation for UI ---
    const kpiData = useMemo(() => {
        const { filteredTasks, filteredFeatures, filteredTimeLogs } = filteredData;
        
        const completedTasks = filteredTasks.filter(t => t.status === 'done' && t.updatedAt && t.updatedAt.toDate() >= dateRange.start && t.updatedAt.toDate() <= dateRange.end).length;
        const totalHours = filteredTimeLogs.reduce((sum, log) => sum + log.durationInSeconds, 0) / 3600;
        const avgTimePerTask = completedTasks > 0 ? totalHours / completedTasks : 0;
        const approvedFeatures = filteredFeatures.filter(f => ['approved', 'released'].includes(f.status) && f.updatedAt && f.updatedAt.toDate() >= dateRange.start && f.updatedAt.toDate() <= dateRange.end).length;
        
        return {
            completedTasks,
            totalHours: totalHours.toFixed(1),
            avgTimePerTask: avgTimePerTask.toFixed(1),
            approvedFeatures
        };
    }, [filteredData, dateRange]);

    const moduleProgressData = useMemo(() => {
        if (!modules || !filteredData.filteredFeatures) return [];
        return modules.map(module => {
            const moduleFeatures = filteredData.filteredFeatures.filter(f => f.moduleId === module.id);
            return {
                name: module.name,
                in_development: moduleFeatures.filter(f => f.status === 'in_development').length,
                in_testing: moduleFeatures.filter(f => f.status === 'in_testing').length,
                approved: moduleFeatures.filter(f => f.status === 'approved' || f.status === 'released').length,
            };
        }).filter(d => d.in_development + d.in_testing + d.approved > 0);
    }, [modules, filteredData.filteredFeatures]);

    const timeByFeatureData = useMemo(() => {
        const timeByFeature = new Map<string, number>();
        const { filteredTasks, filteredTimeLogs } = filteredData;
        const featureMap = new Map((features || []).map(f => [f.id, f.name]));
        
        filteredTasks.forEach(task => {
            if (task.featureId && task.timeLogs) {
                const taskTime = task.timeLogs.filter(log => filteredTimeLogs.includes(log)).reduce((sum, log) => sum + log.durationInSeconds, 0);
                const current = timeByFeature.get(task.featureId) || 0;
                timeByFeature.set(task.featureId, current + taskTime);
            }
        });
        
        return Array.from(timeByFeature.entries())
            .map(([featureId, seconds]) => ({ name: featureMap.get(featureId) || 'N/A', hours: parseFloat((seconds / 3600).toFixed(2)) }))
            .filter(d => d.hours > 0)
            .sort((a,b) => a.hours - b.hours);
    }, [filteredData, features]);
    
    const timeByMemberData = useMemo(() => {
        const timeByMember = new Map<string, number>();
        filteredData.filteredTimeLogs.forEach(log => {
            const current = timeByMember.get(log.userId) || 0;
            timeByMember.set(log.userId, current + log.durationInSeconds);
        });

        return Array.from(timeByMember.entries())
            .map(([userId, seconds]) => ({ name: projectMembers.find(m => m.uid === userId)?.displayName || 'Desconhecido', 'Horas Registradas': parseFloat((seconds / 3600).toFixed(2)) }))
            .sort((a,b) => b['Horas Registradas'] - a['Horas Registradas']);
    }, [filteredData.filteredTimeLogs, projectMembers]);
    
    const loading = projectLoading || tasksLoading || modulesLoading || featuresLoading;
    const error = projectError || tasksError || modulesError || featuresError;
    const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
        if (error) return <ConnectionErrorState error={error} context="relatórios do projeto" />;
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Tarefas Concluídas" value={kpiData.completedTasks} icon={<CheckCircle className="h-6 w-6 text-brand-500"/>} />
                    <StatCard title="Horas Registradas" value={kpiData.totalHours} icon={<Clock className="h-6 w-6 text-brand-500"/>} />
                    <StatCard title="Média de Horas / Tarefa" value={kpiData.avgTimePerTask} icon={<BarChart2 className="h-6 w-6 text-brand-500"/>} />
                    <StatCard title="Funcionalidades Aprovadas" value={kpiData.approvedFeatures} icon={<Zap className="h-6 w-6 text-brand-500"/>} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Progresso dos Módulos</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={moduleProgressData} layout="vertical" barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fill: tickColor, fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'rgba(102, 125, 250, 0.1)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: gridColor }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="in_development" stackId="a" fill={STACKED_BAR_COLORS.in_development} name="Em Desenvolvimento" />
                                <Bar dataKey="in_testing" stackId="a" fill={STACKED_BAR_COLORS.in_testing} name="Em Teste" />
                                <Bar dataKey="approved" stackId="a" fill={STACKED_BAR_COLORS.approved} name="Aprovado" radius={[0, 4, 4, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Tempo por Membro</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={timeByMemberData} barSize={30}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} />
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'rgba(102, 125, 250, 0.1)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: gridColor }} />
                                <Bar dataKey="Horas Registradas" fill="#536DFE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Tempo Gasto por Funcionalidade</h3>
                     <ResponsiveContainer width="100%" height={timeByFeatureData.length * 40 + 50}>
                        <BarChart data={timeByFeatureData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                             <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                             <YAxis type="category" dataKey="name" width={200} tick={{ fill: tickColor, fontSize: 12, width: 190 }} />
                             <Tooltip cursor={{ fill: 'rgba(102, 125, 250, 0.1)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: gridColor }} />
                             <Bar dataKey="hours" fill="#8c9eff" name="Horas" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <motion.div
            {...{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <BarChart2 /> Painel de Relatórios
                </h1>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg shadow-sm flex items-center gap-2">
                    <Popover isOpen={isDatePopoverOpen} onClose={() => setIsDatePopoverOpen(false)} trigger={
                        <Button variant="outline" className="w-48 justify-between" onClick={() => setIsDatePopoverOpen(true)}>
                            <Calendar size={16} className="mr-2"/> {dateRangeOptions[dateRangeKey]} <ChevronDown size={16}/>
                        </Button>
                    }>
                        <div className="w-48 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                            {Object.entries(dateRangeOptions).map(([key, label]) => (
                                <div key={key} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setDateRangeKey(key); setIsDatePopoverOpen(false); }}>
                                    <span>{label}</span>
                                    {dateRangeKey === key && <Check className="h-4 w-4 text-brand-500" />}
                                </div>
                            ))}
                        </div>
                    </Popover>
                    <MultiSelectPopover
                        items={projectMembers.map(m => ({ ...m, id: m.uid }))}
                        selectedIds={selectedMemberIds}
                        onSelectedIdsChange={setSelectedMemberIds}
                        placeholder="Todos os Membros"
                        displayProperty="displayName"
                    />
                </div>
            </div>
            
            {renderContent()}

        </motion.div>
    );
};

export default ProjectReportsPage;