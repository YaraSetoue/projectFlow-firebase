
import React from 'react';
// @ts-ignore
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Rocket, User, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import Button from './ui/Button';

interface GlobalSidebarProps {
    isMobileOpen: boolean;
    onClose: () => void;
}

const NavItem = ({ to, icon, label, isCollapsed, onClick }: { to: string; icon: React.ReactNode; label: string; isCollapsed: boolean, onClick: () => void }) => (
    <NavLink
        to={to}
        end
        onClick={onClick}
        className={({ isActive }) => 
            `flex items-center p-3 my-1 rounded-lg transition-colors text-slate-300 hover:bg-slate-700/50 hover:text-white ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-slate-700 text-white' : ''}`
        }
        title={isCollapsed ? label : undefined}
    >
        {icon}
        {!isCollapsed && <span className="ml-4 font-medium whitespace-nowrap">{label}</span>}
    </NavLink>
);


const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ isMobileOpen, onClose }) => {
    const { isGlobalSidebarCollapsed, toggleGlobalSidebar } = useUI();
    
    const desktopSidebarClasses = `
        hidden lg:flex flex-col flex-shrink-0
        bg-slate-800 text-white
        transition-all duration-300 ease-in-out z-40
        ${isGlobalSidebarCollapsed ? 'w-20' : 'w-64'}
    `;

    const mobileSidebarClasses = `
        lg:hidden fixed top-0 left-0 h-full w-64
        bg-slate-800 text-white z-50
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `;

    const content = (isForMobile: boolean) => {
        const collapsed = !isForMobile && isGlobalSidebarCollapsed;
        return (
            <div className="p-4 flex flex-col h-full">
                <div className={`flex items-center gap-3 mb-8 h-8 ${collapsed ? 'justify-center' : 'px-3'}`}>
                    <Rocket className="h-8 w-8 text-brand-500 flex-shrink-0" />
                    {!collapsed && (
                        <h1 className="text-xl font-bold text-slate-50 whitespace-nowrap">
                            ProjectFlow
                        </h1>
                    )}
                </div>
                <nav className="flex-grow">
                    <NavItem to="/" icon={<LayoutDashboard size={24} />} label="Dashboard" isCollapsed={collapsed} onClick={onClose}/>
                    <NavItem to="/my-tasks" icon={<CheckSquare size={24} />} label="Minhas Tarefas" isCollapsed={collapsed} onClick={onClose} />
                    <NavItem to="/settings/account" icon={<User size={24} />} label="Minha Conta" isCollapsed={collapsed} onClick={onClose} />
                </nav>
                {!isForMobile && (
                    <div className="border-t border-slate-700 pt-2">
                         <Button 
                            variant="ghost" 
                            onClick={toggleGlobalSidebar}
                            className={`w-full text-slate-300 hover:bg-slate-700/50 hover:text-white ${collapsed ? 'justify-center' : 'justify-start'}`}
                            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
                        >
                            {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                            {!collapsed && <span className="ml-4 font-medium whitespace-nowrap">Recolher</span>}
                        </Button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <>
            {isMobileOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={onClose}></div>}
            <aside className={mobileSidebarClasses}>
               {content(true)}
            </aside>
            <aside className={desktopSidebarClasses}>
                {content(false)}
            </aside>
        </>
    );
};

export default GlobalSidebar;