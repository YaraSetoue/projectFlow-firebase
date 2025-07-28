
import React, { useMemo } from 'react';
// @ts-ignore
import { useParams, Outlet } from 'react-router-dom';
import { doc } from '@firebase/firestore';
import { db } from '../firebase/config';
import { useFirestoreDocument } from '../hooks/useFirestoreQuery';
import { Project } from '../types';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import ProjectSubNav from '../components/ProjectSubNav';
import { Loader2 } from 'lucide-react';
import ConnectionErrorState from '../components/ui/ConnectionErrorState';

const ProjectLayoutContent = () => {
    return (
         <div className="flex h-full w-full">
            <ProjectSubNav />
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                <Outlet />
            </div>
        </div>
    )
}

const ProjectLayout = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const projectDocRef = useMemo(() => projectId ? doc(db, 'projects', projectId) : null, [projectId]);
    const { data: project, loading, error } = useFirestoreDocument<Project>(projectDocRef);

    if (loading) {
        return <div className="flex justify-center items-center h-full w-full"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
    }
    
    if (error) {
        return <div className="p-8"><ConnectionErrorState error={error} context="projeto" /></div>;
    }

    if (!project) {
        return <div className="p-8 text-center">Projeto não encontrado ou você não tem acesso.</div>
    }

    return (
        <ProjectProvider project={project} loading={loading} error={error}>
           <ProjectLayoutContent />
        </ProjectProvider>
    );
};

export default ProjectLayout;