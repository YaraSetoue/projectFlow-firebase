
import React from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';

const ProjectActivitiesPage = () => {
    return (
        <motion.div
            {...{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 },
            } as any}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <History /> Atividades do Projeto
                </h1>
            </div>
            
             <div className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                <History className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Recurso em Desenvolvimento</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
                    O log de atividades do projeto estará disponível aqui em breve.
                </p>
            </div>
        </motion.div>
    );
};

export default ProjectActivitiesPage;