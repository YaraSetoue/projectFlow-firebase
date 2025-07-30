
import React, { useMemo, useState, useEffect } from 'react';
// @ts-ignore
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy, where, getDocs } from '@firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { History, Loader2, Calendar, CheckCircle, UserCheck, Filter, ChevronDown, Check } from 'lucide-react';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Activity, Member, User, Task } from '../types';
import { formatTimeAgo } from '../utils/placeholder';
import { useTheme } from '../hooks/useTheme';
import { useProject } from '../contexts/ProjectContext';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Popover from '../components/ui/Popover';

// A new component for the highlight cards
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

// New component for the filters
const ActivityFilters = ({ members, onFilterChange }: { members: Member[], onFilterChange: (filters: any) => void }) => {
    const [selectedMember, setSelectedMember] = useState('all');
    const [isMemberPopoverOpen, setIsMemberPopoverOpen] = useState(false);

    useEffect(() => {
        onFilterChange({ memberId: selectedMember });
    }, [selectedMember, onFilterChange]);

    const selectedMemberName = useMemo(() => {
        if (selectedMember === 'all') return 'Todos';
        return members.find(m => m.uid === selectedMember)?.displayName || 'Todos';
    }, [selectedMember, members]);

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-md mb-6 flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-500" />
            <div className="flex items-center gap-2">
                <label htmlFor="member-filter" className="text-sm font-medium">Membro:</label>
                <Popover isOpen={isMemberPopoverOpen} onClose={() => setIsMemberPopoverOpen(false)} trigger={
                    <Button type="button" variant="outline" className="w-48 justify-between text-left font-normal" onClick={() => setIsMemberPopoverOpen(true)}>
                        <span className="truncate">{selectedMemberName}</span>
                        <ChevronDown className="h-4 w-4 text-slate-500"/>
                    </Button>
                }>
                    <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setSelectedMember('all'); setIsMemberPopoverOpen(false); }}>
                            <span>Todos</span>
                            {selectedMember === 'all' && <Check className="h-4 w-4 text-brand-500"/>}
                        </div>
                        {members.map(member => (
                            <div key={member.uid} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setSelectedMember(member.uid); setIsMemberPopoverOpen(false); }}>
                                <span className="truncate">{member.displayName}</span>
                                {selectedMember === member.uid && <Check className="h-4 w-4 text-brand-500"/>}
                            </div>
                        ))}
                    </div>
                </Popover>
            </div>
             {/* Placeholder for future filters */}
            <p className="text-sm text-slate-400 italic">Mais filtros em breve...</p>
        </div>
    );
};


const ProjectActivitiesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;

    const { theme } = useTheme();
    const { project } = useProject();
    const [filters, setFilters] = useState<{ memberId: string }>({ memberId: 'all' });

    // Data Fetching
    const activitiesQuery = useMemo(() => query(collection(db, 'projects', projectId, 'activity'), orderBy('createdAt', 'desc')), [projectId]);
    const { data: activities, loading: activitiesLoading, error: activitiesError } = useFirestoreQuery<Activity>(activitiesQuery);

    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);

    useEffect(() => {
        if (!project?.memberUids || project.memberUids.length === 0) {
            setMembers([]);
            setMembersLoading(false);
            return;
        }
        const fetchMembers = async () => {
            setMembersLoading(true);
            try {
                const uids = project.memberUids;
                const usersRef = collection(db, 'users');
                const usersData: User[] = [];
                for (let i = 0; i < uids.length; i += 30) {
                    const chunk = uids.slice(i, i + 30);
                    const q = query(usersRef, where('uid', 'in', chunk));
                    const snapshot = await getDocs(q);
                    snapshot.forEach(doc => usersData.push(doc.data() as User));
                }
                const detailedMembers = usersData.map(user => ({ ...user, role: project.members[user.uid] })).filter(m => m.role) as Member[];
                setMembers(detailedMembers);
            } catch (e) { console.error("Failed to fetch members", e); }
            finally { setMembersLoading(false); }
        };
        fetchMembers();
    }, [project]);

    const loading = activitiesLoading || membersLoading;
    const error = activitiesError;

    // Data Aggregation
    const { activitiesToday, tasksCompletedLast7Days, mostActiveMember } = useMemo(() => {
        if (!activities || !members.length) return { activitiesToday: 0, tasksCompletedLast7Days: 0, mostActiveMember: null };
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const todayCount = activities.filter(a => a.createdAt.toDate() >= startOfToday).length;
        
        const completedCount = activities.filter(a => 
            a.type === 'task_status_changed' &&
            a.message.toLowerCase().includes('para concluído') &&
            a.createdAt.toDate() >= sevenDaysAgo
        ).length;
        
        const activityCounts = activities.reduce((acc, a) => {
            acc[a.user.uid] = (acc[a.user.uid] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const mostActiveId = Object.keys(activityCounts).length > 0 ? Object.keys(activityCounts).reduce((a, b) => activityCounts[a] > activityCounts[b] ? a : b) : '';
        const activeMember = members.find(m => m.uid === mostActiveId);
        
        return { activitiesToday: todayCount, tasksCompletedLast7Days: completedCount, mostActiveMember: activeMember || null };
    }, [activities, members]);
    
    const chartData = useMemo(() => {
        if (!activities) return [];
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last14Days.map(dayStr => {
            const dayStart = new Date(dayStr);
            const dayEnd = new Date(dayStr);
            dayEnd.setHours(23, 59, 59, 999);
            
            const count = activities.filter(a => {
                const activityDate = a.createdAt.toDate();
                return activityDate >= dayStart && activityDate <= dayEnd;
            }).length;

            return { name: new Date(dayStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), Atividades: count };
        });
    }, [activities]);

    const filteredActivities = useMemo(() => {
        if (!activities) return [];
        if (filters.memberId === 'all') return activities;
        return activities.filter(a => a.user.uid === filters.memberId);
    }, [activities, filters]);

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
        if (error) return <ConnectionErrorState error={error} context="atividades do projeto" />;
        
        return (
            <div className="space-y-8">
                {/* Dashboard Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Atividades Hoje" value={activitiesToday} icon={<History className="h-6 w-6 text-brand-500" />} />
                    <StatCard title="Tarefas Concluídas (7d)" value={tasksCompletedLast7Days} icon={<CheckCircle className="h-6 w-6 text-brand-500" />} />
                    <StatCard title="Membro Mais Ativo" value={mostActiveMember?.displayName || 'N/A'} icon={<UserCheck className="h-6 w-6 text-brand-500" />} />
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Atividade nos Últimos 14 Dias</h3>
                     <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <Tooltip cursor={{ fill: 'rgba(102, 125, 250, 0.1)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', borderRadius: '0.5rem' }} />
                            <Bar dataKey="Atividades" fill="#536DFE" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Feed Section */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Feed de Atividades Detalhado</h2>
                    <ActivityFilters members={members} onFilterChange={setFilters} />
                     {filteredActivities.length > 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 space-y-4">
                            {filteredActivities.map(activity => (
                                <div key={activity.id} className="flex items-start gap-3 p-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                    <Avatar user={activity.user} size="sm" />
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{activity.message}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(activity.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-10">Nenhuma atividade encontrada para os filtros selecionados.</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <motion.div
            {...{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                    <History /> Atividades do Projeto
                </h1>
            </div>
            {renderContent()}
        </motion.div>
    );
};

export default ProjectActivitiesPage;
