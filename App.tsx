
import React, { useEffect } from 'react';
// @ts-ignore
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import ProjectLayout from './layouts/ProjectLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ModulesPage from './pages/ModulesPage';
import FeaturesPage from './pages/FeaturesPage';
import DataModelPage from './pages/DataModelPage';
import ProjectReportsPage from './pages/ProjectReportsPage';
import MembersPage from './pages/MembersPage';
import MyTasksPage from './pages/MyTasksPage';
import ProjectActivitiesPage from './pages/ProjectActivitiesPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import CredentialsPage from './pages/CredentialsPage';
import TestingPage from './pages/TestingPage';
import TaskTestPage from './pages/TaskTestPage';
import { UIProvider, useUI } from './contexts/UIContext';
import { SearchProvider } from './contexts/SearchContext';
import SearchModal from './components/modals/SearchModal';

// This component contains the application's routing logic.
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    
    <Route 
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<HomePage />} />
      <Route path="/my-tasks" element={<MyTasksPage />} />
      <Route path="/settings/account" element={<AccountSettingsPage />} />
      <Route path="/project/:projectId" element={<ProjectLayout />}>
          <Route index element={<ProjectDetailPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="datamodel" element={<DataModelPage />} />
          <Route path="testing" element={<TestingPage />} />
          <Route path="test/:taskId" element={<TaskTestPage />} />
          <Route path="credentials" element={<CredentialsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="report" element={<ProjectReportsPage />} />
          <Route path="activities" element={<ProjectActivitiesPage />} />
      </Route>
    </Route>
  </Routes>
);

// This component handles the global keyboard shortcut for the search modal.
const GlobalShortcutHandler = () => {
    const { openSearchModal } = useUI();
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                openSearchModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [openSearchModal]);

    return null; // This component does not render anything.
};

// This component accesses the auth context and shows a splash screen
// while authentication is loading.
const AppContent = () => {
    const { loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-12 w-12 text-brand-500 animate-spin" />
            </div>
        );
    }
    
    // Once auth is resolved, render the app's routes inside the router
    return (
      <NetworkStatusProvider>
        <Toaster 
            position="bottom-center"
            toastOptions={{
                className: 'dark:bg-slate-800 dark:text-slate-100',
            }}
        />
        <HashRouter>
            <GlobalShortcutHandler />
            <AppRoutes />
            <SearchModal />
        </HashRouter>
        <NetworkStatusIndicator />
      </NetworkStatusProvider>
    );
};

// The main App component wraps everything in the necessary providers.
function App() {
  return (
    <ThemeProvider>
        <AuthProvider>
          <UIProvider>
            <SearchProvider>
                <AppContent />
            </SearchProvider>
          </UIProvider>
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
