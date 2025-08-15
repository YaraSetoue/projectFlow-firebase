import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy } from '@firebase/firestore';
import { Users, UserPlus, Send, Loader2, Trash2, Check, ChevronDown, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../firebase/config';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Member, MemberRole, Invitation, MEMBER_ROLES } from '../types';
import { useAuth } from '../hooks/useAuth';
import { sendProjectInvitation, cancelInvitation, updateMemberRole, removeMemberFromProject } from '../services/firestoreService';
import { useProject } from '../contexts/ProjectContext';

import ConnectionErrorState from '../components/ui/ConnectionErrorState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Popover from '../components/ui/Popover';
import AlertDialog from '../components/ui/AlertDialog';

const TabButton = ({ title, count, active, onClick, icon }: { title: string, count?: number, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold transition-colors focus:outline-none ${
            active
                ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'
        }`}
    >
        {icon}
        {title}
        {count !== undefined && (
             <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-200 dark:bg-slate-700'}`}>
                {count}
            </span>
        )}
    </button>
);


const MembersPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    if (!projectId) return <div>ID do projeto está faltando.</div>;
    
    const { currentUser } = useAuth();
    const { project, loading: projectLoading, error: projectError } = useProject();
    
    const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'invite'>('members');


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
    
    // Popover states
    const [isInviteRoleOpen, setIsInviteRoleOpen] = useState(false);
    const [editingMemberRole, setEditingMemberRole] = useState<string | null>(null);

    const [busyState, setBusyState] = useState<{ [key: string]: boolean }>({});
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

    const members = useMemo(() => {
        if (!project?.members) return [];
        const membersArray = Object.values(project.members);
        membersArray.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        return membersArray;
    }, [project]);

    const userRole = project && currentUser ? project.members[currentUser.uid]?.role : undefined;
    const isEditor = userRole === 'editor' || userRole === 'owner';
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
            toast.error('Falha ao cancelar o convite.');
        } finally {
             setBusyState(prev => ({ ...prev, [invitationId]: false }));
        }
    }

    const handleRoleChange = async (memberUid: string, newRole: MemberRole) => {
        setEditingMemberRole(null);
        setBusyState(prev => ({ ...prev, [memberUid]: true }));
        try {
            await updateMemberRole(projectId, memberUid, newRole);
            // The project listener will trigger a re-fetch of members
        } catch (err) {
            toast.error('Falha ao atualizar o papel do membro.');
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
             toast.error('Falha ao remover o membro.');
        } finally {
             setBusyState(prev => ({ ...prev, [memberToRemove.uid]: false }));
        }
    }

    const loading = projectLoading || invitationsLoading;
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
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <Users /> Gerenciar Membros
                </h1>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton title="Membros Atuais" count={members.length} active={activeTab === 'members'} onClick={() => setActiveTab('members')} icon={<Users size={16}/>} />
                    {isEditor && invitations && <TabButton title="Convites Pendentes" count={invitations.length} active={activeTab === 'invites'} onClick={() => setActiveTab('invites')} icon={<Bell size={16}/>} />}
                    {isEditor && <TabButton title="Convidar" active={activeTab === 'invite'} onClick={() => setActiveTab('invite')} icon={<UserPlus size={16}/>} />}
                </nav>
            </div>
            
            <div className="mt-6">
                 <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        {...{
                            initial: { y: 10, opacity: 0 },
                            animate: { y: 0, opacity: 1 },
                            exit: { y: -10, opacity: 0 },
                            transition: { duration: 0.2 },
                        } as any}
                    >
                        {activeTab === 'members' && (
                            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left min-w-[600px]">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">Membro</th>
                                                <th className="px-6 py-3 font-medium">Papel</th>
                                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {members.map(member => (
                                                <tr key={member.uid}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar user={member} />
                                                            <div>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-100">{member.displayName} {member.uid === currentUser?.uid && <span className="text-xs font-normal text-slate-500">(Você)</span>}</p>
                                                                <p className="text-sm text-slate-500">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 capitalize">
                                                        {isOwner && member.role !== 'owner' ? (
                                                            <Popover isOpen={editingMemberRole === member.uid} onClose={() => setEditingMemberRole(null)} trigger={
                                                                <Button type="button" variant="outline" className="w-32 justify-between text-left font-normal capitalize" onClick={() => setEditingMemberRole(member.uid)}>
                                                                    {member.role} <ChevronDown size={16}/>
                                                                </Button>
                                                            }>
                                                                <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                                                                    {MEMBER_ROLES.map(role => (
                                                                        <div key={role} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => handleRoleChange(member.uid, role)}>
                                                                            <span className="capitalize">{role}</span>
                                                                            {member.role === role && <Check className="h-4 w-4 text-brand-500"/>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Popover>
                                                        ) : (
                                                            <span className="text-sm font-semibold capitalize bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">{member.role}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isOwner && member.role !== 'owner' && (
                                                            busyState[member.uid] ? <Loader2 className="animate-spin inline-flex" /> :
                                                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => setMemberToRemove(member)}><Trash2 size={16}/></Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'invites' && isEditor && (
                             <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
                                <h2 className="text-xl font-semibold mb-4">Convites Pendentes ({invitations?.length || 0})</h2>
                                {invitations && invitations.length > 0 ? (
                                    <div className="space-y-2">
                                        {invitations.map(inv => (
                                            <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                                                <div>
                                                    <p className="font-medium">{inv.recipientEmail}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{inv.role}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleCancelInvitation(inv.id)} disabled={busyState[inv.id]} className="text-slate-500 hover:text-red-500">
                                                    {busyState[inv.id] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-slate-500 py-4">Nenhum convite pendente.</p>
                                )}
                             </div>
                        )}
                        {activeTab === 'invite' && isEditor && (
                            <div className="max-w-md mx-auto">
                                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
                                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><UserPlus /> Convidar Novo Membro</h2>
                                    <form onSubmit={handleInvite} className="space-y-4">
                                        <div>
                                            <label htmlFor="invite-email" className="sr-only">Email</label>
                                            <Input id="invite-email" type="email" placeholder="Email do usuário" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required disabled={isInviting} />
                                        </div>
                                        <div>
                                            <label htmlFor="invite-role" className="sr-only">Papel</label>
                                            <Popover isOpen={isInviteRoleOpen} onClose={() => setIsInviteRoleOpen(false)} trigger={
                                                <Button type="button" variant="outline" className="w-full justify-between text-left font-normal capitalize" onClick={() => setIsInviteRoleOpen(true)} disabled={isInviting}>
                                                    {inviteRole} <ChevronDown size={16}/>
                                                </Button>
                                            }>
                                                <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-1">
                                                    {MEMBER_ROLES.map(role => (
                                                        <div key={role} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-sm" onClick={() => { setInviteRole(role); setIsInviteRoleOpen(false); }}>
                                                            <span className="capitalize">{role}</span>
                                                            {inviteRole === role && <Check className="h-4 w-4 text-brand-500"/>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </Popover>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={isInviting || !inviteEmail}>
                                            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                            Enviar Convite
                                        </Button>
                                        {inviteError && <p className="text-xs text-red-500 text-center">{inviteError}</p>}
                                        {inviteSuccess && <p className="text-xs text-green-500 text-center">{inviteSuccess}</p>}
                                    </form>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
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