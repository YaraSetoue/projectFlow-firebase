import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, MessageSquare, Check, X, Loader2 } from 'lucide-react';

import { useNotifications } from '../hooks/useNotifications';
import { markNotificationAsRead, acceptInvitation, declineInvitation } from '../services/firestoreService';
import Button from './ui/Button';
import Popover from './ui/Popover';
import { Invitation } from '../types';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, count, loading } = useNotifications();
    const navigate = useNavigate();
    const [busyIds, setBusyIds] = useState<string[]>([]);

    const handleNotificationClick = async (notification: any) => {
        if (notification.type === 'project_invite') return;
        
        try {
            await markNotificationAsRead(notification.id);
            setIsOpen(false);
            if(notification.related.taskId) {
                navigate(`/project/${notification.related.projectId}?task=${notification.related.taskId}`);
            } else {
                navigate(`/project/${notification.related.projectId}`);
            }
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };
    
    const handleAccept = async (invitation: Invitation) => {
        setBusyIds(prev => [...prev, invitation.id]);
        try {
            await acceptInvitation(invitation);
             setIsOpen(false);
             navigate(`/project/${invitation.projectId}`);
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            alert("Falha ao aceitar o convite. Tente novamente.");
        } finally {
            setBusyIds(prev => prev.filter(id => id !== invitation.id));
        }
    };
    
    const handleDecline = async (invitationId: string) => {
        setBusyIds(prev => [...prev, invitationId]);
        try {
            await declineInvitation(invitationId);
        } catch (error) {
            console.error("Failed to decline invitation:", error);
            alert("Falha ao recusar o convite. Tente novamente.");
        } finally {
            setBusyIds(prev => prev.filter(id => id !== invitationId));
        }
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'task_assigned': return <UserPlus className="h-5 w-5 text-blue-500" />;
            case 'comment_mention': return <MessageSquare className="h-5 w-5 text-purple-500" />;
            case 'project_invite': return <UserPlus className="h-5 w-5 text-green-500" />;
            default: return <Bell className="h-5 w-5 text-slate-500" />;
        }
    };

    return (
        <Popover
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative">
                    <Bell />
                    {count > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-600"></span>
                        </span>
                    )}
                </Button>
            }
            className="w-80 md:w-96 right-0"
        >
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl">
                <div className="p-3 border-b dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                         <div className="flex justify-center items-center p-8">
                             <Loader2 className="animate-spin text-brand-500" />
                         </div>
                    ) : count > 0 ? (
                        notifications.map(n => (
                            <div key={n.id} className={`p-3 border-b dark:border-slate-700/50 last:border-b-0 ${n.type !== 'project_invite' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
                                 onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">{getIconForType(n.type)}</div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{n.message}</p>
                                        <span className="text-xs text-slate-500">{new Date(n.createdAt?.toDate()).toLocaleString()}</span>
                                    </div>
                                </div>
                                {n.type === 'project_invite' && (
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDecline(n.invitationId!); }} disabled={busyIds.includes(n.id)}>
                                            {busyIds.includes(n.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                            <span className="ml-1">Recusar</span>
                                        </Button>
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAccept(n as any); }} disabled={busyIds.includes(n.id)}>
                                            {busyIds.includes(n.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                            <span className="ml-1">Aceitar</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-sm text-slate-500 p-8">Você não tem notificações novas.</p>
                    )}
                </div>
            </div>
        </Popover>
    );
};

export default NotificationBell;