import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, orderBy, getDocs } from '@firebase/firestore';
import { Users, UserPlus, Send, Loader2, Trash2, XCircle } from 'lucide-react';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Member, MemberRole, Invitation, MEMBER_ROLES, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { sendProjectInvitation, cancelInvitation, updateMemberRole, removeMemberFromProject } from '../services/firestoreService';
import { useProject } from '../contexts/ProjectContext';

import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import AlertDialog from '../components/ui/AlertDialog';

const MembersPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;
    
    const { currentUser } = useAuth();
    const { project, loading: projectLoading, error: projectError } = useProject();
    
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);

    const invitationsQuery = useMemo(() => 
        query(collection(db, 'invitations'), where('projectId', '==', projectId), where('status', '==', 'pending'), orderBy('createdAt', 'asc')),
        [projectId]
    );
    const { data: invitations, loading: invitationsLoading, error: invitationsError } = useFirestoreQuery<Invitation>(invitationsQuery);
    
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<MemberRole>('editor');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    
    const [busyState, setBusyState] = useState<{ [key: string]: boolean }>({});
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

    useEffect(() => {
        if (project && project.memberUids) {
            const uids = project.memberUids;
            if (uids.length === 0) {
                setMembers([]);
                setMembersLoading(false);
                return;
            }

            const fetchUsers = async () => {
                setMembersLoading(true);
                try {
                    const usersRef = collection(db, 'users');
                    const usersData: User[] = [];
                    // Chunking for 'in' query limit
                    for (let i = 0; i < uids.length; i += 30) {
                        const chunk = uids.slice(i, i + 30);
                        const q = query(usersRef, where('uid', 'in', chunk));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(doc => usersData.push(doc.data() as User));
                    }
                    
                    const detailedMembers = usersData.map(user => ({
                        ...user,
                        role: project.members[user.uid] as MemberRole,
                    })).filter(m => m.role); // Ensure role exists

                    detailedMembers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

                    setMembers(detailedMembers);
                } catch (e) {
                    console.error("Failed to fetch member details", e);
                } finally {
                    setMembersLoading(false);
                }
            };
            fetchUsers();
        }
    }, [project]);

    const isOwner = project?.ownerId === currentUser?.uid;
    
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !inviteEmail.trim()) return;
        
        setIsInviting(true);
        setInviteError('');
        setInviteSuccess('');
        try {
            await sendProjectInvitation(project, inviteEmail, inviteRole);
            setInviteSuccess(`Convite enviado para ${inviteEmail}.`);
            setInviteEmail('');
        } catch (err: any) {
            setInviteError(err.message);
        } finally {
            setIsInviting(false);
        }
    };
    
    const handleCancelInvitation = async (invitationId: string) => {
        setBusyState(prev => ({ ...prev, [invitationId]: true }));
        try {
            await cancelInvitation(invitationId);
        } catch (err) {
            alert('Falha ao cancelar o convite.');
        } finally {
             setBusyState(prev => ({ ...prev, [invitationId]: false }));
        }
    }

    const handleRoleChange = async (memberUid: string, newRole: MemberRole) => {
         setBusyState(prev => ({ ...prev, [memberUid]: true }));
        try {
            await updateMemberRole(projectId, memberUid, newRole);
            // The project listener will trigger a re-fetch of members
        } catch (err) {
            alert('Falha ao atualizar o papel do membro.');
        } finally {
             setBusyState(prev => ({ ...prev, [memberUid]: false }));
        }
    }

    const handleConfirmRemoveMember = async () => {
        if (!memberToRemove) return;

        setBusyState(prev => ({ ...prev, [memberToRemove.uid]: true }));
        try {
            await removeMemberFromProject(projectId, memberToRemove.uid);
             // The project listener will trigger a re-fetch of members
             setMemberToRemove(null);
        } catch (err) {
             alert('Falha ao remover o membro.');
        } finally {
             setBusyState(prev => ({ ...prev, [memberToRemove.uid]: false }));
        }
    }

    const loading = projectLoading || invitationsLoading || membersLoading;
    const error = projectError || invitationsError;

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
    }

    if (error) {
        return <div className="p-4 sm:p-6 lg:p-8"><ConnectionErrorState error={error} context="membros do projeto" /></div>
    }

    if (!project) {
        return <div className="text-center py-10">Projeto não encontrado ou você não tem acesso.</div>;
    }

    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <Users /> Gerenciar Membros
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Current Members */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Membros Atuais ({members.length})</h2>
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md gap-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar user={member} />
                                        <div>
                                            <p className="font-semibold">{member.displayName} {member.uid === currentUser?.uid && '(Você)'}</p>
                                            <p className="text-sm text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {busyState[member.uid] ? <Loader2 className="animate-spin" /> : (
                                            isOwner && member.role !== 'owner' ? (
                                                <>
                                                    <select 
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.uid, e.target.value as MemberRole)}
                                                        className="h-9 rounded-md text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                                                    >
                                                        {MEMBER_ROLES.map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                                                    </select>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => setMemberToRemove(member)}><Trash2 size={16}/></Button>
                                                </>
                                            ) : (
                                                <span className="text-sm font-semibold capitalize bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">{member.role}</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Right Column: Invites */}
                {isOwner && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><UserPlus /> Convidar Novo Membro</h2>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label htmlFor="invite-email" className="sr-only">Email</label>
                                    <Input id="invite-email" type="email" placeholder="Email do usuário" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required disabled={isInviting} />
                                </div>
                                <div>
                                    <label htmlFor="invite-role" className="sr-only">Papel</label>
                                    <select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value as MemberRole)} disabled={isInviting} className="h-10 w-full rounded-md text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500">
                                         {MEMBER_ROLES.map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                                    </select>
                                </div>
                                <Button type="submit" className="w-full" disabled={isInviting || !inviteEmail}>
                                    {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                    Enviar Convite
                                </Button>
                                {inviteError && <p className="text-xs text-red-500 text-center">{inviteError}</p>}
                                {inviteSuccess && <p className="text-xs text-green-500 text-center">{inviteSuccess}</p>}
                            </form>
                        </div>
                        
                        {invitations && invitations.length > 0 && (
                             <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold mb-4">Convites Pendentes ({invitations.length})</h2>
                                <div className="space-y-2">
                                    {invitations.map(inv => (
                                        <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                                            <div>
                                                <p className="font-medium">{inv.recipientEmail}</p>
                                                <p className="text-xs text-slate-500 capitalize">{inv.role}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleCancelInvitation(inv.id)} disabled={busyState[inv.id]}>
                                                {busyState[inv.id] ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} className="text-slate-500"/>}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                )}
            </div>
            {memberToRemove && (
                <AlertDialog
                    isOpen={!!memberToRemove}
                    onClose={() => setMemberToRemove(null)}
                    onConfirm={handleConfirmRemoveMember}
                    title={`Remover ${memberToRemove.displayName}`}
                    description="Tem certeza de que deseja remover este membro do projeto?"
                    isConfirming={busyState[memberToRemove.uid]}
                />
            )}
        </motion.div>
    )
}

export default MembersPage;