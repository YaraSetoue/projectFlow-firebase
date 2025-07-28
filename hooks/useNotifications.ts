import { useMemo } from 'react';
import { collection, query, where, orderBy } from '@firebase/firestore';
import { useFirestoreQuery } from './useFirestoreQuery';
import { useAuth } from './useAuth';
import { db } from '../firebase/config';
import { Notification, Invitation, NotificationType } from '../types';

interface UnifiedNotification extends Omit<Notification, 'type' | 'id' | 'related'> {
    id: string; // From notification or invitation
    type: NotificationType | 'project_invite';
    related: {
        projectId: string;
        projectName: string;
        taskId?: string;
    };
    invitationId?: string; // For accept/decline actions
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
                where('status', '==', 'pending')
            )
            : null
    , [currentUser?.email]);

    const { data: notifications, loading: notificationsLoading, error: notificationsError } = useFirestoreQuery<Notification>(notificationsQuery);
    const { data: invitations, loading: invitationsLoading, error: invitationsError } = useFirestoreQuery<Invitation>(invitationsQuery);

    const unifiedNotifications = useMemo((): UnifiedNotification[] => {
        const combined: UnifiedNotification[] = [];

        notifications?.forEach(n => {
            combined.push({ ...n, type: n.type }); // Ensure type is correctly passed
        });

        invitations?.forEach(inv => {
            combined.push({
                id: inv.id,
                type: 'project_invite',
                message: `${inv.inviter.name || 'Alguém'} convidou você para o projeto "${inv.projectName}".`,
                related: { projectId: inv.projectId, projectName: inv.projectName },
                isRead: false,
                createdAt: inv.createdAt,
                sender: { name: inv.inviter.name || 'Alguém', photoURL: null }, // photoURL not stored in invite
                invitationId: inv.id,
            });
        });

        // Sort combined list by date
        return combined.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    }, [notifications, invitations]);


    return {
        notifications: unifiedNotifications,
        count: unifiedNotifications.length,
        loading: authLoading || notificationsLoading || invitationsLoading,
        error: notificationsError || invitationsError,
    };
};