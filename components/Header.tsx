import React from 'react';
import { Menu, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Button from './ui/Button';
import NotificationBell from './NotificationBell';
import Breadcrumbs from './Breadcrumbs';
import UserNav from './ui/UserNav';
import { useUI } from '../contexts/UIContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { openSearchModal } = useUI();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button onClick={onMenuClick} variant="ghost" size="icon" className="lg:hidden">
              <Menu size={24} />
            </Button>
           <Breadcrumbs />
        </div>
        <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
              onClick={openSearchModal}
            >
              <Search size={18} />
              <span className="hidden md:inline">Buscar...</span>
            </Button>
            <ThemeToggle />
            <NotificationBell />
            <UserNav />
        </div>
      </div>
    </header>
  );
};

export default Header;