import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { collection, query, where, getDocs } from '@firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { Project, Task, Module } from '../types';

type SearchResultItem = 
    | { type: 'project', data: Project, key: string, projectName?: string }
    | { type: 'task', data: Task, key: string, projectName?: string }
    | { type: 'module', data: Module, key: string, projectName?: string };

export interface SearchResults {
    projects: SearchResultItem[];
    tasks: SearchResultItem[];
    modules: SearchResultItem[];
    all: SearchResultItem[];
}

interface SearchContextType {
    searchResults: SearchResults;
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [searchableData, setSearchableData] = useState<{ projects: Project[], tasks: Task[], modules: Module[] }>({ projects: [], tasks: [], modules: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            setSearchableData({ projects: [], tasks: [], modules: [] });
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all projects the user is a member of
                const projectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', currentUser.uid));
                const projectsSnap = await getDocs(projectsQuery);
                const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
                
                if (projects.length === 0) {
                    setSearchableData({ projects: [], tasks: [], modules: [] });
                    setLoading(false);
                    return;
                }

                // 2. Fetch tasks and modules for each project
                const allTasks: Task[] = [];
                const allModules: Module[] = [];

                const promises = projects.map(async (project) => {
                    // Fetch tasks for this project
                    const tasksRef = collection(db, 'projects', project.id, 'tasks');
                    const tasksSnap = await getDocs(tasksRef);
                    tasksSnap.forEach(doc => {
                        allTasks.push({ id: doc.id, ...doc.data() } as Task);
                    });

                    // Fetch modules for this project
                    const modulesRef = collection(db, 'projects', project.id, 'modules');
                    const modulesSnap = await getDocs(modulesRef);
                    modulesSnap.forEach(doc => {
                        allModules.push({ id: doc.id, ...doc.data() } as Module);
                    });
                });

                await Promise.all(promises);

                setSearchableData({ projects, tasks: allTasks, modules: allModules });
            } catch (error) {
                console.error("Error fetching global search data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [currentUser]);

    const searchResults = useMemo((): SearchResults => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            return { projects: [], tasks: [], modules: [], all: [] };
        }
        
        const { projects, tasks, modules } = searchableData;
        const projectsMap = new Map(projects.map(p => [p.id, p.name]));
        
        const projectResults = projects
            .filter(p => p.name.toLowerCase().includes(term))
            .map(p => ({ type: 'project' as const, data: p, key: `p-${p.id}` }));

        const taskResults = tasks
            .filter(t => t.title.toLowerCase().includes(term))
            .map(t => ({ type: 'task' as const, data: t, key: `t-${t.id}`, projectName: projectsMap.get(t.projectId) }));
        
        const moduleResults = modules
            .filter(m => m.name.toLowerCase().includes(term))
            .map(m => ({ type: 'module' as const, data: m, key: `m-${m.id}`, projectName: projectsMap.get(m.projectId) }));

        return {
            projects: projectResults,
            tasks: taskResults,
            modules: moduleResults,
            all: [...projectResults, ...taskResults, ...moduleResults],
        };
    }, [searchTerm, searchableData]);


    const value = { searchResults, loading, searchTerm, setSearchTerm };

    return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (context === undefined) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};