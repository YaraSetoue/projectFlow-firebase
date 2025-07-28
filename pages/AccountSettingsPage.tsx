
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { AccountProfileData } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import { Loader2, User, Shield, AlertTriangle, Upload, Trash2 } from 'lucide-react';

const AccountSettingsPage = () => {
    const { currentUser, updateAccountProfile, uploadAndUpdateAvatar, sendPasswordReset, deleteAccount, logout } = useAuth();
    const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<AccountProfileData>({
        defaultValues: {
            displayName: currentUser?.displayName || ''
        }
    });

    const [profileMessage, setProfileMessage] = useState({ type: '', content: '' });
    const [securityMessage, setSecurityMessage] = useState({ type: '', content: '' });
    const [deleteMessage, setDeleteMessage] = useState({ type: '', content: '' });
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const onProfileSubmit: SubmitHandler<AccountProfileData> = async (data) => {
        setProfileMessage({ type: '', content: '' });
        try {
            await updateAccountProfile(data);
            setProfileMessage({ type: 'success', content: 'Perfil atualizado com sucesso!' });
            reset(data); // Resets the dirty state
        } catch (error) {
            console.error(error);
            setProfileMessage({ type: 'error', content: 'Falha ao atualizar o perfil.' });
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setProfileMessage({ type: '', content: '' });
        try {
            await uploadAndUpdateAvatar(file, setUploadProgress);
            setProfileMessage({ type: 'success', content: 'Avatar atualizado com sucesso!' });
        } catch (error) {
             console.error(error);
            setProfileMessage({ type: 'error', content: 'Falha no upload do avatar.' });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handlePasswordReset = async () => {
        setSecurityMessage({ type: '', content: '' });
        try {
            await sendPasswordReset();
            setSecurityMessage({ type: 'success', content: 'E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.' });
        } catch (error) {
            console.error(error);
            setSecurityMessage({ type: 'error', content: 'Falha ao enviar o e-mail.' });
        }
    };
    
    const handleDeleteAccount = async () => {
        setDeleteMessage({ type: '', content: '' });
        if (deleteConfirmation !== currentUser?.email) {
            setDeleteMessage({ type: 'error', content: 'O e-mail digitado não corresponde.' });
            return;
        }
        setIsDeleting(true);
        try {
            await deleteAccount();
            // Logout is handled by auth state listener, but we can force it
            logout();
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                 setDeleteMessage({ type: 'error', content: 'Esta operação requer um login recente. Por favor, faça logout e login novamente antes de tentar excluir sua conta.' });
            } else {
                 setDeleteMessage({ type: 'error', content: 'Falha ao excluir a conta.' });
            }
            setIsDeleting(false);
        }
    }

    const Message = ({ type, content }: {type: string, content: string}) => {
        if (!content) return null;
        const baseClasses = "text-sm text-center p-2 rounded-md";
        const typeClasses = type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        return <div className={`${baseClasses} ${typeClasses}`}>{content}</div>;
    }

    if (!currentUser) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /></div>
    }

    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-8">
              Minha Conta
            </h1>

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-xl font-semibold flex items-center gap-3"><User /> Perfil Público</h2>
                    </div>
                    <form onSubmit={handleSubmit(onProfileSubmit)} className="p-6 space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <Avatar user={currentUser} size="lg" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {isUploading ? <Loader2 className="animate-spin text-white"/> : <Upload className="text-white" />}
                                </button>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
                            </div>
                            {isUploading && <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div>}
                        </div>
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome de Exibição</label>
                            <Input id="displayName" {...register('displayName', { required: "O nome é obrigatório" })} />
                            {errors.displayName && <p className="text-sm text-red-500 mt-1">{errors.displayName.message}</p>}
                        </div>
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <Input id="email" type="email" value={currentUser.email || ''} disabled />
                        </div>
                         <Message {...profileMessage} />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || !isDirty}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Security Card */}
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
                     <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-xl font-semibold flex items-center gap-3"><Shield /> Segurança</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-medium">Alterar Senha</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Um e-mail será enviado para você com as instruções.</p>
                            </div>
                            <Button variant="outline" onClick={handlePasswordReset}>Enviar E-mail</Button>
                        </div>
                        <Message {...securityMessage} />
                    </div>
                </div>

                {/* Danger Zone Card */}
                <div className="border border-red-500/50 rounded-lg bg-red-500/5 dark:bg-red-900/10">
                    <div className="p-6 border-b border-red-500/20">
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-3"><AlertTriangle /> Zona de Perigo</h2>
                    </div>
                     <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-medium">Excluir Conta</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Esta ação é permanente e não pode ser desfeita.</p>
                            </div>
                            <Button variant="default" className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50" onClick={() => setDeleteModalOpen(true)}>
                                Excluir Minha Conta
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmar Exclusão da Conta">
                <div className="space-y-4">
                    <p>Esta é uma ação irreversível. Todos os seus dados, projetos e tarefas serão permanentemente excluídos.</p>
                    <p>Para confirmar, por favor, digite seu e-mail <strong className="text-slate-800 dark:text-slate-200">{currentUser.email}</strong> na caixa abaixo.</p>
                    <Input 
                        value={deleteConfirmation} 
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Digite seu e-mail para confirmar"
                        className="border-red-400 focus:ring-red-500"
                    />
                    <Message {...deleteMessage} />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Cancelar</Button>
                        <Button
                            variant="default"
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteConfirmation !== currentUser.email}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Excluir Permanentemente
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}

export default AccountSettingsPage;