
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where } from '@firebase/firestore';
import { PlusCircle, LayoutGrid, Loader2, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Project } from '../types';
import { seedDatabase } from '../services/firestoreService';

import Button from '../components/ui/Button';
import ProjectCard from '../components/ProjectCard';
import ProjectCardSkeleton from '../components/skeletons/ProjectCardSkeleton';
import CreateProjectModal from '../components/modals/CreateProjectModal';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';

const EmptyState = ({ onOpenModal }: { onOpenModal: () => void }) => {
    const { currentUser } = useAuth();
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeed = async () => {
        if (!currentUser) return;
        setIsSeeding(true);
        try {
            await seedDatabase(currentUser);
            // Um pequeno delay para dar tempo ao Firestore de propagar os dados antes de recarregar
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error("Failed to seed database:", error);
            toast.error("Ocorreu um erro ao criar o projeto de exemplo.");
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <motion.div 
            {...{
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
            } as any}
            className="text-center flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm"
        >
            <LayoutGrid className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nenhum Projeto Encontrado</h2>
            <p className="mt-2 mb-6 text-slate-600 dark:text-slate-400 max-w-md">
                Para começar, crie um novo projeto ou popule o sistema com um projeto de exemplo para demonstração.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={onOpenModal}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Novo Projeto
                </Button>
                <Button onClick={handleSeed} disabled={isSeeding} variant="outline">
                    {isSeeding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FlaskConical className="mr-2 h-4 w-4" />
                    )}
                    {isSeeding ? 'Criando...' : 'Criar Projeto de Exemplo'}
                </Button>
            </div>
        </motion.div>
    );
};

const HomePage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // LOG 1: Verificar o estado da autenticação em cada render
  console.log('[HomePage Render] Auth Loading:', authLoading, 'CurrentUser:', currentUser?.uid);

  const projectsQuery = useMemo(() => {
    if (authLoading) {
      // LOG 2: Não criar a query enquanto a autenticação está carregando
      console.log('[projectsQuery] Auth está carregando. Query será nula.');
      return null;
    }
    if (currentUser) {
      // LOG 3: Confirmar que a query está sendo criada com o UID correto
      // A consulta agora tem APENAS o 'where' para ser compatível com as regras de segurança.
      console.log(`[projectsQuery] Criando query para o usuário: ${currentUser.uid}`);
      return query(
          collection(db, 'projects'), 
          where('memberUids', 'array-contains', currentUser.uid)
        );
    }
    // LOG 4: Se não houver usuário após o loading, a query é nula
    console.log('[projectsQuery] Usuário não logado. Query será nula.');
    return null; 
  }, [currentUser, authLoading]);

  const { data: projects, loading: projectsLoading, error } = useFirestoreQuery<Project>(projectsQuery);
  
  // LOG 5: Verificar o resultado do hook
  console.log('[HomePage Render] Projects Loading:', projectsLoading, 'Projects Data:', projects, 'Error:', error);

  // A ordenação volta a ser feita no lado do cliente, pois a regra de segurança
  // não permite múltiplos filtros (where + orderBy).
  const sortedProjects = useMemo(() => {
    if (!projects) return null;
    return [...projects].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [projects]);

  // Combine the two loading states into one
  const loading = authLoading || projectsLoading;

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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Projetos
        </h1>
         <Button onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Projeto
        </Button>
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : sortedProjects && sortedProjects.length > 0 ? (
          <motion.div 
            {...{
                variants: {
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                },
                initial: "hidden",
                animate: "show",
            } as any}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {sortedProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </motion.div>
        ) : error ? (
            <ConnectionErrorState error={error} context="projects" />
        ) : (
          <AnimatePresence>
            <EmptyState onOpenModal={() => setCreateModalOpen(true)} />
          </AnimatePresence>
        )}
      </div>

      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

    </motion.div>
  );
};

export default HomePage;
