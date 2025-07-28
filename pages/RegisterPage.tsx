
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { RegisterData } from '../types';

const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Este endereço de e-mail já está em uso por outra conta.';
        case 'auth/invalid-email':
            return 'O formato do e-mail é inválido.';
        case 'auth/weak-password':
            return 'A senha é muito fraca. Tente uma senha mais forte.';
        default:
            return 'Ocorreu um erro ao registrar. Tente novamente.';
    }
};

const RegisterPage = () => {
    const { registerWithEmailAndPassword, currentUser } = useAuth();
    const navigate = useNavigate();
    const [apiError, setApiError] = useState('');
    
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>();

    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const onSubmit: SubmitHandler<RegisterData> = async (data) => {
        setApiError('');
        try {
            await registerWithEmailAndPassword(data);
            // Navigation will be handled by the useEffect hook
        } catch (error: any) {
            console.error("Registration failed", error.code);
            setApiError(getFirebaseErrorMessage(error.code));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <motion.div
                {...{
                    initial: { opacity: 0, y: -20 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.5 },
                } as any}
                className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg"
            >
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Criar uma conta</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">Comece preenchendo os detalhes abaixo.</p>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {apiError && <p className="text-sm text-red-500 text-center">{apiError}</p>}
                    <div>
                        <label htmlFor="displayName" className="sr-only">Nome Completo</label>
                        <Input
                            id="displayName"
                            type="text"
                            placeholder="Nome Completo"
                            {...register('displayName', { required: 'O nome completo é obrigatório' })}
                            disabled={isSubmitting}
                        />
                         {errors.displayName && <p className="text-sm text-red-500 mt-1">{errors.displayName.message}</p>}
                    </div>
                     <div>
                        <label htmlFor="email" className="sr-only">E-mail</label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="E-mail"
                            {...register('email', { 
                                required: 'O e-mail é obrigatório',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Endereço de e-mail inválido'
                                }
                            })}
                            disabled={isSubmitting}
                        />
                         {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Senha</label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Senha"
                            {...register('password', { 
                                required: 'A senha é obrigatória',
                                minLength: {
                                    value: 6,
                                    message: 'A senha deve ter pelo menos 6 caracteres'
                                }
                            })}
                            disabled={isSubmitting}
                        />
                         {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar
                    </Button>
                </form>
                
                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="font-medium text-brand-500 hover:text-brand-600">
                        Faça login
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default RegisterPage;