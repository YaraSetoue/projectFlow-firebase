
import { useMemo } from 'react';
import { collection, query, where, orderBy, Timestamp } from '@firebase/firestore';
import { useFirestoreQuery } from './useFirestoreQuery';
import { useAuth } from './useAuth';
import { db } from '../firebase/config';
import { Notification, Invitation } from '../types';

export type UnifiedNotificationType = 'task_assigned' | 'comment_mention' | 'project_invite';

export interface UnifiedNotification {
    id: string;
    type: UnifiedNotificationType;
    message: string;
    related: {
        projectId: string;
        projectName: string;
        taskId?: string;
    };
    isRead: boolean;
    createdAt: Timestamp;
    sender?: {
        name: string | null;
        photoURL?: string | null;
    };
    invitationId?: string;
}


export const useNotifications = () => {
    const { currentUser, loading: authLoading } = useAuth();

    const notificationsQuery = useMemo(() =>
        currentUser
            ? query(
                collection(db, 'users', currentUser.uid, 'notifications'),
                where('isRead', '==', false),
                orderBy('createdAt', 'desc')
            )
            : null
    , [currentUser]);

    const invitationsQuery = useMemo(() =>
        currentUser?.email
            ? query(
                collection(db, 'invitations'),
                where('recipientEmail', '==', currentUser.email),
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            )
            : null
    , [currentUser?.email]);

    const { data: notifications, loading: notificationsLoading, error: notificationsError } = useFirestoreQuery<Notification>(notificationsQuery);
    const { data: invitations, loading: invitationsLoading, error: invitationsError } = useFirestoreQuery<Invitation>(invitationsQuery);

    const unifiedNotifications = useMemo((): UnifiedNotification[] => {
        const combined: UnifiedNotification[] = [];

        if (notifications) {
            notifications.forEach(n => {
                combined.push({ ...n, type: n.type as UnifiedNotificationType });
            });
        }
        
        if (invitations) {
            invitations.forEach(inv => {
                combined.push({
                    id: inv.id,
                    type: 'project_invite',
                    message: `${inv.inviter.name || 'Alguém'} convidou você para o projeto "${inv.projectName}".`,
                    related: { projectId: inv.projectId, projectName: inv.projectName },
                    isRead: false,
                    createdAt: inv.createdAt,
                    sender: { name: inv.inviter.name || 'Alguém', photoURL: null },
                    invitationId: inv.id,
                });
            });
        }

        return combined.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    }, [notifications, invitations]);


    return {
        notifications: unifiedNotifications,
        rawInvitations: invitations,
        count: unifiedNotifications.length,
        loading: authLoading || notificationsLoading || invitationsLoading,
        error: notificationsError || invitationsError,
    };
};
