
import React, { createContext, useContext, ReactNode } from 'react';
import { Project } from '../types';

interface ProjectContextType {
    project: Project;
    loading: boolean;
    error: Error | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
    children: ReactNode;
    project: Project;
    loading: boolean;
    error: Error | null;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children, project, loading, error }) => {
    const value = { project, loading, error };
    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
