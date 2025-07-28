
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy } from '@firebase/firestore';
import { KeyRound, Lock, Unlock, Loader2, PlusCircle, LogOut, Eye, EyeOff, Copy, Trash2, Pencil, AlertCircle } from 'lucide-react';

import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { db } from '../firebase/config';
import { generateSalt, decryptValue } from '../services/cryptoService';
import { setProjectCredentialsSalt, deleteCredential } from '../services/firestoreService';
import { Credential } from '../types';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CreateEditCredentialModal from '../components/modals/CreateEditCredentialModal';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';

const LockedView = ({ onUnlock, isVaultSetup, onSetup }: { onUnlock: (key: string) => void, isVaultSetup: boolean, onSetup: (key: string) => Promise<void> }) => {
    const [masterKey, setMasterKey] = useState('');
    const [confirmKey, setConfirmKey] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isVaultSetup) { // Just unlocking
            if (!masterKey) {
                setError('A chave mestra é obrigatória.');
                return;
            }
            onUnlock(masterKey);
        } else { // First time setup
            if (masterKey.length < 8) {
                setError('A chave mestra deve ter pelo menos 8 caracteres.');
                return;
            }
            if (masterKey !== confirmKey) {
                setError('As chaves mestras não coincidem.');
                return;
            }
            setIsLoading(true);
            try {
                await onSetup(masterKey);
            } catch (err: any) {
                setError(err.message || 'Falha ao configurar o cofre.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
         <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
            <Lock className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {isVaultSetup ? "Cofre de Credenciais Trancado" : "Configurar Cofre de Credenciais"}
            </h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md">
                {isVaultSetup 
                    ? "Digite a chave mestra do projeto para desbloquear e visualizar as credenciais."
                    : "Para usar o cofre, configure uma chave mestra para este projeto. Esta chave será usada para criptografar todas as credenciais."
                }
            </p>
             <p className="mt-2 mb-6 text-amber-600 dark:text-amber-400 text-sm max-w-md font-semibold">
                Importante: A chave mestra NÃO é salva em nenhum lugar. Se você a esquecer, não será possível recuperar as credenciais.
            </p>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                 <Input 
                    type="password" 
                    placeholder="Chave Mestra do Projeto" 
                    value={masterKey}
                    onChange={e => setMasterKey(e.target.value)}
                    disabled={isLoading}
                    required
                />
                {!isVaultSetup && (
                    <Input 
                        type="password" 
                        placeholder="Confirmar Chave Mestra" 
                        value={confirmKey}
                        onChange={e => setConfirmKey(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                 <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                    {isVaultSetup ? "Desbloquear Cofre" : "Configurar e Desbloquear"}
                </Button>
            </form>
        </div>
    );
};

const CredentialCard = ({ credential, masterKey, salt, isOwner, onEdit }: { credential: Credential, masterKey: string, salt: string, isOwner: boolean, onEdit: (c: Credential) => void }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const [decryptedValue, setDecryptedValue] = useState('');
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptionError, setDecryptionError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    
    const toggleReveal = async () => {
        if (isRevealed) {
            setIsRevealed(false);
            return;
        }

        setIsDecrypting(true);
        setDecryptionError('');
        try {
            const val = decryptValue(credential.value, credential.iv, masterKey, salt);
            setDecryptedValue(val);
            setIsRevealed(true);
        } catch (error: any) {
            setDecryptionError(error.message || "Decryption failed.");
        } finally {
            setIsDecrypting(false);
        }
    };

    const handleCopy = async () => {
        let valueToCopy = decryptedValue;
        if (!isRevealed) {
            try {
                valueToCopy = decryptValue(credential.value, credential.iv, masterKey, salt);
            } catch (error) {
                 alert("Não foi possível descriptografar para copiar. Verifique a chave mestra.");
                 return;
            }
        }
        navigator.clipboard.writeText(valueToCopy);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDelete = async () => {
        if (!isOwner || !window.confirm(`Tem certeza que deseja excluir a credencial "${credential.name}"?`)) return;
        setIsDeleting(true);
        try {
            await deleteCredential(credential.projectId, credential.id);
        } catch (error) {
            alert('Falha ao excluir a credencial.');
            setIsDeleting(false);
        }
    };
    
    return (
        <motion.div {...{variants:{hidden: {opacity: 0, y: 10}, show: {opacity: 1, y: 0}}} as any} className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 space-y-3">
             <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{credential.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{credential.description}</p>
                </div>
                {isOwner && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(credential)}><Pencil size={16}/></Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                        </Button>
                    </div>
                )}
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3 flex items-center justify-between gap-2">
                <code className="text-sm flex-grow truncate font-mono">
                    {isRevealed ? decryptedValue : '••••••••••••••••••••••'}
                </code>
                <div className="flex-shrink-0 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={toggleReveal} disabled={isDecrypting}>
                        {isDecrypting ? <Loader2 size={16} className="animate-spin"/> : (isRevealed ? <EyeOff size={16}/> : <Eye size={16}/>)}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                        {copySuccess ? <span className="text-xs text-green-500">Copiado!</span> : <Copy size={16}/>}
                    </Button>
                </div>
            </div>
             {decryptionError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14}/> {decryptionError}</p>}
        </motion.div>
    );
};


const UnlockedView = ({ masterKey, onLock, isOwner }: { masterKey: string, onLock: () => void, isOwner: boolean }) => {
    const { project } = useProject();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingCredential, setEditingCredential] = useState<Credential | null>(null);

    const credentialsQuery = useMemo(() => 
        query(collection(db, 'projects', project.id, 'credentials'), orderBy('createdAt', 'desc')),
        [project.id]
    );

    const { data: credentials, loading, error } = useFirestoreQuery<Credential>(credentialsQuery);
    
    const handleAdd = () => {
        setEditingCredential(null);
        setModalOpen(true);
    };

    const handleEdit = (credential: Credential) => {
        setEditingCredential(credential);
        setModalOpen(true);
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <KeyRound /> Cofre de Credenciais
                </h1>
                <div className="flex gap-2">
                    <Button onClick={onLock} variant="outline">
                        <Lock className="mr-2 h-4 w-4" /> Trancar Cofre
                    </Button>
                    {isOwner && (
                        <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Nova Credencial
                        </Button>
                    )}
                </div>
            </div>

            {loading && <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}
            {error && <ConnectionErrorState error={error} context="credentials" />}

            {!loading && !error && (
                credentials && credentials.length > 0 ? (
                    <motion.div 
                        {...{
                            variants:{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.05}}},
                            initial:"hidden",
                            animate:"show",
                        } as any}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                       {credentials.map(cred => (
                           <CredentialCard 
                                key={cred.id} 
                                credential={cred}
                                masterKey={masterKey}
                                salt={project.credentialsSalt!}
                                isOwner={isOwner}
                                onEdit={handleEdit}
                           />
                       ))}
                    </motion.div>
                ) : (
                    <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                        <KeyRound className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cofre Vazio</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                           {isOwner ? "Adicione a primeira credencial do projeto clicando no botão 'Nova Credencial'." : "O proprietário do projeto ainda não adicionou nenhuma credencial."}
                        </p>
                    </div>
                )
            )}
            
            <AnimatePresence>
                {isModalOpen && (
                    <CreateEditCredentialModal 
                        isOpen={isModalOpen}
                        onClose={() => setModalOpen(false)}
                        projectId={project.id}
                        masterKey={masterKey}
                        salt={project.credentialsSalt!}
                        credentialToEdit={editingCredential}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const CredentialsPage = () => {
    const { project } = useProject();
    const { currentUser } = useAuth();
    const [masterKey, setMasterKey] = useState<string | null>(null);

    const isOwner = project.ownerId === currentUser?.uid;

    const handleSetupVault = async (key: string) => {
        const salt = generateSalt();
        await setProjectCredentialsSalt(project.id, salt);
        // The project context will update via the listener, but we can unlock immediately
        setMasterKey(key);
    };

    const isVaultSetup = !!project.credentialsSalt;
    
    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    {...{
                        key: masterKey ? 'unlocked' : 'locked',
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        exit: { opacity: 0 },
                        transition: { duration: 0.2 },
                    } as any}
                >
                    {!masterKey ? (
                        <LockedView 
                            isVaultSetup={isVaultSetup} 
                            onUnlock={setMasterKey}
                            onSetup={handleSetupVault}
                        />
                    ) : (
                        <UnlockedView 
                            masterKey={masterKey}
                            onLock={() => setMasterKey(null)}
                            isOwner={isOwner}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default CredentialsPage;