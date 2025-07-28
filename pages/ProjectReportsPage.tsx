import React, { useMemo, useState, useEffect } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from '@firebase/firestore';
import { BarChart2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Task, Member, User } from '../types';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import { useTheme } from '../hooks/useTheme';
import { useProject } from '../contexts/ProjectContext';

const ProjectReportsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { theme } = useTheme();
    const { project, loading: projectLoading, error: projectError } = useProject();
    
    const [projectMembers, setProjectMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);

    if (!projectId) {
        return <div>Projeto não encontrado.</div>;
    }

    useEffect(() => {
        if (!project?.memberUids || project.memberUids.length === 0) {
            setProjectMembers([]);
            setMembersLoading(false);
            return;
        }

        const fetchMembers = async () => {
            setMembersLoading(true);
            try {
                const uids = project.memberUids;
                const usersRef = collection(db, 'users');
                 const usersData: User[] = [];

                // Firestore 'in' query has a limit of 30 items. We need to chunk it.
                for (let i = 0; i < uids.length; i += 30) {
                    const chunk = uids.slice(i, i + 30);
                    const q = query(usersRef, where('uid', 'in', chunk));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(doc => usersData.push(doc.data() as User));
                }
                
                const combined = usersData.map(user => ({
                    ...user,
                    role: project.members[user.uid]
                })).filter(member => member.role) as Member[];
                
                setProjectMembers(combined);
            } catch (e) {
                console.error("Failed to fetch member details", e);
            } finally {
                setMembersLoading(false);
            }
        };

        fetchMembers();
    }, [project]);
    
    const tasksQuery = useMemo(() => 
        query(collection(db, 'projects', projectId, 'tasks')),
        [projectId]
    );
    const { data: tasks, loading: tasksLoading, error: tasksError } = useFirestoreQuery<Task>(tasksQuery);

    const chartData = useMemo(() => {
        if (!tasks || !projectMembers || projectMembers.length === 0) return [];
        
        const timeByUserId = new Map<string, number>();

        tasks.forEach(task => {
            task.timeLogs?.forEach(log => {
                const currentDuration = timeByUserId.get(log.userId) || 0;
                timeByUserId.set(log.userId, currentDuration + log.durationInSeconds);
            });
        });

        return projectMembers
            .map(member => ({
                name: member.displayName || `Usuário (${member.uid.substring(0, 6)})`,
                'Horas Trabalhadas': parseFloat(((timeByUserId.get(member.uid) || 0) / 3600).toFixed(2)),
            }))
            .filter(data => data['Horas Trabalhadas'] > 0) // Only show members who have logged time
            .sort((a, b) => b['Horas Trabalhadas'] - a['Horas Trabalhadas']); // Sort descending

    }, [tasks, projectMembers]);
    
    const loading = projectLoading || tasksLoading || membersLoading;
    const error = projectError || tasksError;

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
        }

        if (error) {
            return <ConnectionErrorState error={error} context="relatórios do projeto" />;
        }
        
        if (chartData.length === 0) {
             return (
                <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                    <BarChart2 className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhum dado de tempo registrado</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                        Comece a registrar o tempo nas tarefas para ver os dados do relatório aqui.
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md">
                 <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        barSize={40}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} 
                            stroke={theme === 'dark' ? '#475569' : '#e2e8f0'}
                        />
                        <YAxis 
                            label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} 
                            stroke={theme === 'dark' ? '#475569' : '#e2e8f0'}
                        />
                        <Tooltip
                            cursor={{fill: 'rgba(102, 125, 250, 0.1)'}}
                            contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                                borderRadius: '0.5rem'
                            }}
                        />
                        <Legend wrapperStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#334155' }} />
                        <Bar dataKey="Horas Trabalhadas" fill="#536DFE" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <BarChart2 /> Relatório de Tempo por Membro
                </h1>
            </div>
            
            {renderContent()}

        </motion.div>
    );
};

export default ProjectReportsPage;