import React from 'react';
import { motion } from 'framer-motion';
import { Project } from '../types';
// @ts-ignore
import { Link } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const ProjectCard = ({ project }: ProjectCardProps) => {
  const memberCount = project.memberUids?.length || 0;
  return (
    <motion.div 
        {...{variants: cardVariants} as any}
        className="h-full"
    >
      <Link to={`/project/${project.id}`} className="block h-full">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
            <div className="p-6 flex-grow">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {project.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
                    {project.description || "Nenhuma descrição fornecida."}
                </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
                </span>
            </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProjectCard;