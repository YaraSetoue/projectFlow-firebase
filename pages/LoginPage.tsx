
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { LoginData } from '../types';

const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.56,12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26,1.37-1.04,2.53-2.21,3.31v2.77h3.57c2.08-1.92,3.28-4.74,3.28-8.09Z" fill="#4285F4"/>
        <path d="M12,23c2.97,0,5.46-.98,7.28-2.66l-3.57-2.77c-.98,.66-2.23,1.06-3.71,1.06-2.86,0-5.29-1.93-6.16-4.53H2.18v2.84C3.99,20.53,7.7,23,12,23Z" fill="#34A853"/>
        <path d="M5.84,14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43,.35-2.09V7.07H2.18C1.43,8.55,1,10.22,1,12s.43,3.45,1.18,4.93l3.66-2.84Z" fill="#FBBC05"/>
        <path d="M12,5.16c1.55,0,2.95,.53,4.04,1.58l3.15-3.15C17.45,1.99,14.97,1,12,1,7.7,1,3.99,3.47,2.18,7.07l3.66,2.84c.87-2.6,3.3-4.53,6.16-4.53Z" fill="#EA4335"/>
    </svg>
);

const Divider = () => (
    <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-300 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">OU</span>
        </div>
    </div>
);

const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
             return 'E-mail ou senha inválidos. Por favor, tente novamente.';
        case 'auth/too-many-requests':
            return 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
        default:
            return 'Ocorreu um erro ao fazer login. Tente novamente.';
    }
};

const LoginPage = () => {
    const { loginWithEmailAndPassword, loginWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();
    const [apiError, setApiError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>();

    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const onSubmit: SubmitHandler<LoginData> = async (data) => {
        setApiError('');
        try {
            await loginWithEmailAndPassword(data);
            // Navigation will be handled by the useEffect hook
        } catch (error: any) {
            console.error("Login failed", error.code);
            setApiError(getFirebaseErrorMessage(error.code));
        }
    };

    const handleGoogleLogin = async () => {
        setApiError('');
        try {
            await loginWithGoogle();
        } catch (error) {
            // Error is handled and alerted within AuthContext, but we clear local errors.
            setApiError('Não foi possível fazer login com o Google. Tente novamente.');
        }
    }

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
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Bem-vindo de volta</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">Faça login para continuar no seu dashboard.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {apiError && <p className="text-sm text-red-500 text-center">{apiError}</p>}
                    <div>
                        <label htmlFor="email" className="sr-only">E-mail</label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="E-mail"
                            {...register('email', { required: 'O campo de e-mail é obrigatório' })}
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
                            {...register('password', { required: 'O campo de senha é obrigatório' })}
                             disabled={isSubmitting}
                        />
                         {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Entrar
                    </Button>
                </form>

                <Divider />

                <Button onClick={handleGoogleLogin} className="w-full" variant="outline" disabled={isSubmitting}>
                   <GoogleIcon />
                    Entrar com Google
                </Button>
                
                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Não tem uma conta?{' '}
                    <Link to="/register" className="font-medium text-brand-500 hover:text-brand-600">
                        Registre-se
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;