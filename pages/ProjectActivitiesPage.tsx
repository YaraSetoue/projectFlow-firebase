import React, { useMemo } from 'react';
// @ts-ignore
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy } from '@firebase/firestore';
import { History, Loader2 } from 'lucide-react';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Activity } from '../types';
import { formatTimeAgo } from '../utils/placeholder';

import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Avatar from '../components/ui/Avatar';

const ProjectActivitiesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();

    const activitiesQuery = useMemo(() => {
        if (!projectId) return null;
        return query(collection(db, 'projects', projectId, 'activity'), orderBy('createdAt', 'desc'));
    }, [projectId]);

    const { data: activities, loading, error } = useFirestoreQuery<Activity>(activitiesQuery);

    const activitiesByDay = useMemo(() => {
        if (!activities) return {};

        const today = new Date();
        const todayString = today.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

        return activities.reduce((acc, activity) => {
            if (!activity.createdAt) return acc;
            const date = activity.createdAt.toDate();
            let dayString = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
            
            if (dayString === todayString) dayString = 'Hoje';
            else if (dayString === yesterdayString) dayString = 'Ontem';

            if (!acc[dayString]) {
                acc[dayString] = [];
            }
            acc[dayString].push(activity);
            return acc;
        }, {} as Record<string, Activity[]>);

    }, [activities]);

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
        }

        if (error) {
            return <ConnectionErrorState error={error} context="atividades do projeto" />;
        }
        
        if (!activities || activities.length === 0) {
            return (
                <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                    <History className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhuma Atividade Registrada</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                        Conforme as tarefas são criadas e atualizadas, a atividade do projeto aparecerá aqui.
                    </p>
                </div>
            );
        }

        return (
            <div className="max-w-3xl mx-auto">
                {Object.entries(activitiesByDay).map(([day, dayActivities]) => (
                    <div key={day} className="relative pb-8">
                        {/* Vertical line */}
                        <div className="absolute top-5 left-5 -ml-px w-0.5 h-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="relative flex items-center mb-4">
                             <div className="z-10 w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                {day.substring(0, 3)}
                             </div>
                             <h3 className="ml-4 font-bold text-lg text-slate-800 dark:text-slate-100">{day}</h3>
                        </div>
                        <div className="space-y-4">
                            {dayActivities.map(activity => (
                                <div key={activity.id} className="ml-5 pl-8 flex items-start gap-3">
                                    <div className="absolute w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full mt-2.5 -ml-[30px] border-2 border-white dark:border-slate-950"></div>
                                    <Avatar user={activity.user} />
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{activity.message}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(activity.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <History /> Atividades do Projeto
                </h1>
            </div>
            
            {renderContent()}
        </motion.div>
    );
};

export default ProjectActivitiesPage;
