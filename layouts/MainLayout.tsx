
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useLocation, Outlet } from 'react-router-dom';
import Header from '../components/Header';
import GlobalSidebar from '../components/GlobalSidebar';

const MainLayout: React.FC = () => {
    const location = useLocation();
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    useEffect(() => {
        // Close mobile sidebar on navigation
        setMobileSidebarOpen(false);
    }, [location.pathname]);

    const handleMenuClick = () => {
        setMobileSidebarOpen(prev => !prev);
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
            <GlobalSidebar 
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={handleMenuClick} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;