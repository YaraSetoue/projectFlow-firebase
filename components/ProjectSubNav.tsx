
import React from 'react';
// @ts-ignore
import { NavLink, useParams } from 'react-router-dom';
import { LayoutGrid, Boxes, Database, Users, BarChart2, History, Settings, KeyRound, ChevronsLeft, ChevronsRight, Shapes } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';
import Button from './ui/Button';


const NavItem = ({ to, icon, label, isCollapsed, end = false }: { to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; end?: boolean; }) => (
    <NavLink
        to={to}
        end={end}
        className={({ isActive }) => 
            `flex items-center p-3 my-1 rounded-lg transition-colors text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-slate-200/60 dark:bg-slate-700 text-slate-900 dark:text-white' : ''}`
        }
        title={isCollapsed ? label : undefined}
    >
        {icon}
        {!isCollapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
    </NavLink>
);

const ProjectSubNav = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { project } = useProject();
    const { isProjectSidebarCollapsed, toggleProjectSidebar } = useUI();

    const sidebarClasses = `
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        flex flex-col p-4 transition-all duration-300 ease-in-out
        ${isProjectSidebarCollapsed ? 'w-24' : 'w-64'}
    `;

    return (
        <aside className={sidebarClasses}>
            <div className="mb-6 h-12 flex items-center">
                {!isProjectSidebarCollapsed && (
                    <div className="flex-grow min-w-0">
                        <h2 className="text-lg font-bold truncate">{project.name}</h2>
                        <p className="text-sm text-slate-500">Projeto</p>
                    </div>
                )}
            </div>
            <nav className="flex-grow">
                 <NavItem to={`/project/${projectId}`} end={true} icon={<LayoutGrid size={20} />} label="Quadro" isCollapsed={isProjectSidebarCollapsed} />
                 <NavItem to={`/project/${projectId}/activities`} icon={<History size={20} />} label="Atividades" isCollapsed={isProjectSidebarCollapsed}/>
                 <NavItem to={`/project/${projectId}/modules`} icon={<Boxes size={20} />} label="Módulos" isCollapsed={isProjectSidebarCollapsed}/>
                 <NavItem to={`/project/${projectId}/features`} icon={<Shapes size={20} />} label="Funcionalidades" isCollapsed={isProjectSidebarCollapsed}/>
                 <NavItem to={`/project/${projectId}/datamodel`} icon={<Database size={20} />} label="Modelo de Dados" isCollapsed={isProjectSidebarCollapsed}/>
                 <NavItem to={`/project/${projectId}/credentials`} icon={<KeyRound size={20} />} label="Credenciais" isCollapsed={isProjectSidebarCollapsed}/>
                 <NavItem to={`/project/${projectId}/report`} icon={<BarChart2 size={20} />} label="Relatórios" isCollapsed={isProjectSidebarCollapsed}/>
            </nav>
            <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                 <NavItem to={`/project/${projectId}/members`} icon={<Users size={20} />} label="Membros e Acessos" isCollapsed={isProjectSidebarCollapsed}/>
                 <Button
                    variant="ghost"
                    onClick={toggleProjectSidebar}
                    className={`w-full mt-1 ${isProjectSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                    aria-label={isProjectSidebarCollapsed ? 'Expandir barra lateral do projeto' : 'Recolher barra lateral do projeto'}
                 >
                    {isProjectSidebarCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                    {!isProjectSidebarCollapsed && <span className="ml-3 text-sm font-medium whitespace-nowrap">Recolher</span>}
                 </Button>
            </div>
        </aside>
    );
};

export default ProjectSubNav;