import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
      <div className="animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
           <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCardSkeleton;