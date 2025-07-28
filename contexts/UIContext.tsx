
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface UIContextType {
  isGlobalSidebarCollapsed: boolean;
  isProjectSidebarCollapsed: boolean;
  toggleGlobalSidebar: () => void;
  toggleProjectSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const getInitialState = (key: string, defaultValue: boolean): boolean => {
    if (typeof window !== 'undefined') {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage key “${key}”:`, error);
            return defaultValue;
        }
    }
    return defaultValue;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGlobalSidebarCollapsed, setGlobalSidebarCollapsed] = useState<boolean>(() => getInitialState('isGlobalSidebarCollapsed', false));
  const [isProjectSidebarCollapsed, setProjectSidebarCollapsed] = useState<boolean>(() => getInitialState('isProjectSidebarCollapsed', false));

  useEffect(() => {
    try {
        localStorage.setItem('isGlobalSidebarCollapsed', JSON.stringify(isGlobalSidebarCollapsed));
    } catch (error) {
        console.error(`Error writing to localStorage key “isGlobalSidebarCollapsed”:`, error);
    }
  }, [isGlobalSidebarCollapsed]);

  useEffect(() => {
    try {
        localStorage.setItem('isProjectSidebarCollapsed', JSON.stringify(isProjectSidebarCollapsed));
    } catch (error) {
         console.error(`Error writing to localStorage key “isProjectSidebarCollapsed”:`, error);
    }
  }, [isProjectSidebarCollapsed]);

  const toggleGlobalSidebar = () => {
    setGlobalSidebarCollapsed(prev => !prev);
  };

  const toggleProjectSidebar = () => {
    setProjectSidebarCollapsed(prev => !prev);
  };

  const value = {
    isGlobalSidebarCollapsed,
    isProjectSidebarCollapsed,
    toggleGlobalSidebar,
    toggleProjectSidebar,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
