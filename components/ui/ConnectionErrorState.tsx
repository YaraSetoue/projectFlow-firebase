import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

interface ConnectionErrorStateProps {
    error: Error;
    context?: string;
}

const ConnectionErrorState = ({ error, context = 'dados' }: ConnectionErrorStateProps) => {
    const isUnavailableError = error.message.includes('unavailable');

    const title = isUnavailableError ? "Não foi possível conectar ao serviço" : "Problema de Conexão";
    const message = isUnavailableError
        ? `Não foi possível conectar ao banco de dados para carregar ${context}. Isso pode acontecer por vários motivos:\n\n• Seu dispositivo pode estar offline.\n• Um firewall de rede pode estar bloqueando a conexão.\n• O projeto de back-end pode estar mal configurado (ex: Firestore não habilitado).\n\nPor favor, verifique essas possibilidades.`
        : `Estamos com problemas para carregar ${context}. Por favor, verifique sua conexão com a internet. Seus dados estão sendo armazenados em cache e serão sincronizados automaticamente quando você se reconectar.`;

    return (
        <motion.div 
            {...{
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
            } as any}
            className="text-center flex flex-col items-center justify-center p-10 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-500/20"
        >
            <WifiOff className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md text-left whitespace-pre-wrap">
                {message}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Detalhes Técnicos: {error.message}</p>
        </motion.div>
    );
}

export default ConnectionErrorState;