import React from 'react';
// @ts-ignore
import { useLocation, Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { Home, ChevronRight } from 'lucide-react';

const Breadcrumbs = () => {
    const location = useLocation();
    
    let projectContext;
    try {
        projectContext = useProject();
    } catch (e) {
        projectContext = null;
    }
    const { project } = projectContext || {};

    const pathnames = location.pathname.split('/').filter(x => x);

    const crumbNameMap: { [key: string]: string } = {
        'my-tasks': 'Minhas Tarefas',
        'settings': 'Configurações',
        'account': 'Minha Conta',
        'project': 'Projeto',
        'modules': 'Módulos',
        'datamodel': 'Modelo de Dados',
        'credentials': 'Credenciais',
        'members': 'Membros',
        'report': 'Relatórios',
        'activities': 'Atividades'
    };
    
    return (
        <nav className="flex items-center text-sm font-medium" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                <li>
                    <Link to="/" className="hover:text-brand-500 flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span className="hidden sm:inline">Início</span>
                    </Link>
                </li>
                {pathnames.map((value, index) => {
                    const last = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    let name = crumbNameMap[value] || value;
                    
                    if (value === project?.id) {
                        name = project.name;
                    }

                    // Don't show breadcrumb for project ID itself
                    if (value === project?.id && pathnames[index-1] === 'project') {
                        return null;
                    }
                    
                    return (
                        <li key={to}>
                           <div className="flex items-center">
                                <ChevronRight className="h-4 w-4" />
                                {last ? (
                                    <span className="ml-2 text-slate-800 dark:text-slate-200">{name}</span>
                                ) : (
                                    <Link to={to} className="ml-2 hover:text-brand-500">{name}</Link>
                                )}
                           </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;