import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { useNavigate, Link } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useSearch, SearchResults } from '../../contexts/SearchContext';
import { Project, Task, Module } from '../../types';
import { Search, Loader2, LayoutGrid, CheckSquare, Boxes, CornerDownLeft } from 'lucide-react';

type SearchResultItem = SearchResults['all'][0];


const getLinkFromResult = (result: SearchResultItem): string => {
    switch(result.type) {
        case 'project': return `/project/${result.data.id}`;
        case 'task': return `/project/${result.data.projectId}?task=${result.data.id}`;
        case 'module': return `/project/${result.data.projectId}/modules`;
        default: return '/';
    }
}

const getIconFromResultType = (type: SearchResultItem['type']) => {
    switch(type) {
        case 'project': return <LayoutGrid className="h-5 w-5 text-slate-500" />;
        case 'task': return <CheckSquare className="h-5 w-5 text-slate-500" />;
        case 'module': return <Boxes className="h-5 w-5 text-slate-500" />;
    }
}

const ResultGroup = ({ title, results, activeIndex, baseIndex, onLinkClick }: { title: string, results: SearchResultItem[], activeIndex: number, baseIndex: number, onLinkClick: (link: string) => void }) => {
    if (results.length === 0) return null;

    return (
        <div>
            <h3 className="px-4 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase">{title}</h3>
            <ul className="space-y-1">
                {results.map((result, index) => (
                    <li key={result.key}>
                        <Link 
                            to={getLinkFromResult(result)} 
                            onClick={() => onLinkClick(getLinkFromResult(result))}
                            className={`flex items-center justify-between gap-3 mx-2 px-2 py-1.5 rounded-md transition-colors ${activeIndex === baseIndex + index ? 'bg-brand-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <div className={`flex items-center gap-3 min-w-0 ${activeIndex === baseIndex + index ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                {React.cloneElement(getIconFromResultType(result.type), { className: `h-5 w-5 flex-shrink-0 ${activeIndex === baseIndex + index ? 'text-white/80' : 'text-slate-500'}` })}
                                <span className="truncate">{result.type === 'task' ? result.data.title : result.data.name}</span>
                            </div>
                            {result.projectName && (
                                <span className={`text-xs truncate ${activeIndex === baseIndex + index ? 'text-white/70' : 'text-slate-500'}`}>
                                    {result.projectName}
                                </span>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
};

const SearchModal = () => {
    const { isSearchModalOpen, closeSearchModal } = useUI();
    const { searchResults, loading, searchTerm, setSearchTerm } = useSearch();
    const { projects, tasks, modules, all } = searchResults;
    const navigate = useNavigate();

    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSearchModalOpen) {
            inputRef.current?.focus();
        } else {
            // Delay reset to avoid flicker during closing animation
            setTimeout(() => {
                setSearchTerm('');
                setActiveIndex(0);
            }, 300);
        }
    }, [isSearchModalOpen, setSearchTerm]);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchTerm]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isSearchModalOpen || all.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % all.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + all.length) % all.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedResult = all[activeIndex];
                if (selectedResult) {
                    navigate(getLinkFromResult(selectedResult));
                    closeSearchModal();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchModalOpen, activeIndex, all, navigate, closeSearchModal]);

    // Scroll active item into view
    useEffect(() => {
        const container = resultsContainerRef.current;
        if (container) {
            const activeElement = container.querySelector(`li a[class*="bg-brand-500"]`);
            activeElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIndex]);


    const handleLinkClick = (link: string) => {
        navigate(link);
        closeSearchModal();
    };

    return (
        <AnimatePresence>
            {isSearchModalOpen && (
                <motion.div
                    {...{
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        exit: { opacity: 0 },
                        transition: { duration: 0.2 },
                    } as any}
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
                    onClick={closeSearchModal}
                >
                    <motion.div
                        {...{
                            initial: { scale: 0.95, y: -20 },
                            animate: { scale: 1, y: 0 },
                            exit: { scale: 0.95, y: -20 },
                            transition: { type: 'spring', damping: 25, stiffness: 300 },
                        } as any}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
                            {loading && searchTerm ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Search className="h-5 w-5 text-slate-400" />}
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Buscar projetos, tarefas, módulos..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                        <div ref={resultsContainerRef} className="max-h-[50vh] overflow-y-auto pb-4">
                            {searchTerm ? (
                                loading ? (
                                     <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : all.length > 0 ? (
                                    <>
                                        <ResultGroup title="Projetos" results={projects} activeIndex={activeIndex} baseIndex={0} onLinkClick={handleLinkClick} />
                                        <ResultGroup title="Tarefas" results={tasks} activeIndex={activeIndex} baseIndex={projects.length} onLinkClick={handleLinkClick} />
                                        <ResultGroup title="Módulos" results={modules} activeIndex={activeIndex} baseIndex={projects.length + tasks.length} onLinkClick={handleLinkClick} />
                                    </>
                                ) : (
                                    <p className="text-center text-sm text-slate-500 p-8">Nenhum resultado encontrado para "{searchTerm}"</p>
                                )
                            ) : (
                                <p className="text-center text-sm text-slate-500 p-8">Comece a digitar para pesquisar.</p>
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 flex items-center justify-end gap-3">
                            <span>Navegar</span>
                            <kbd className="px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800">↑</kbd>
                            <kbd className="px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800">↓</kbd>
                            <span>Abrir</span>
                            <kbd className="px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800 flex items-center gap-1"><CornerDownLeft size={10}/>Enter</kbd>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;