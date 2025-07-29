import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';
import Popover from './Popover';
import Avatar from './Avatar';

const UserNav = () => {
    const { currentUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!currentUser) {
        return null;
    }

    return (
        <Popover
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <Avatar user={currentUser} size="sm" />
                </button>
            }
            className="w-56"
            position="right"
        >
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl p-2">
                <div className="p-2 mb-2 border-b dark:border-slate-700">
                    <p className="font-semibold text-sm truncate">{currentUser.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
                <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                        logout();
                        setIsOpen(false);
                    }}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
        </Popover>
    );
};

export default UserNav;