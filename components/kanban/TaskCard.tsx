import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Lock, GripVertical, Clock, Play, Pause, Link2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Task, User, Module } from '../../types';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { useTimeTracking, formatDuration } from '../../utils/placeholder';
import IconRenderer from '../ui/IconRenderer';
import Button from '../ui/Button';


interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  isBlocked?: boolean;
  moduleInfo?: Module;
  dragHandleListeners?: any;
  currentUser: User | null;
}

const TaskCard = ({ task, onClick, isDragging, isBlocked, moduleInfo, dragHandleListeners, currentUser }: TaskCardProps) => {
    const { handleStart, handleStop, isBusy, error: timerError } = useTimeTracking();
    const [runningTime, setRunningTime] = useState(0);
    const timerIntervalRef = useRef<number | null>(null);

    const isTimerActiveForThisTask = currentUser?.activeTimer?.taskId === task.id;
    const isAnotherTimerActive = !!currentUser?.activeTimer && !isTimerActiveForThisTask;

    const totalTime = useMemo(() => {
        return (task.timeLogs || []).reduce((acc, log) => acc + log.durationInSeconds, 0);
    }, [task.timeLogs]);
    
    useEffect(() => {
        if (isTimerActiveForThisTask && currentUser?.activeTimer?.startTime) {
            const startTimeMs = currentUser.activeTimer.startTime.toDate().getTime();
            const updateTimer = () => setRunningTime(Math.floor((Date.now() - startTimeMs) / 1000));
            updateTimer();
            timerIntervalRef.current = window.setInterval(updateTimer, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            setRunningTime(0);
        }
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [isTimerActiveForThisTask, currentUser?.activeTimer?.startTime]);

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleStart(task.id, task.projectId);
    };

    const handlePauseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleStop();
    };

    const statusBorderColor = 
        task.hasBeenReproved ? 'border-orange-500' :
        task.status === 'done' ? 'border-green-500' :
        task.status === 'approved' ? 'border-cyan-500' :
        task.status === 'in_testing' ? 'border-amber-500' :
        task.status === 'ready_for_qa' ? 'border-violet-500' :
        task.status === 'inprogress' ? 'border-blue-500' :
        'border-slate-400 dark:border-slate-600';
    
    const canBeClicked = !['in_testing', 'approved', 'done'].includes(task.status);

  return (
    <motion.div
      {...{layoutId: task.id} as any}
      onClick={canBeClicked ? onClick : undefined}
      className={`group relative bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border-l-4 ${statusBorderColor} transition-all duration-200 hover:shadow-md hover:border-brand-500 ${isDragging ? 'shadow-xl rotate-1' : ''} ${!canBeClicked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {!['in_testing', 'approved', 'done'].includes(task.status) && (
        <div 
            {...dragHandleListeners}
            aria-label="Alça de arrastar"
            className="absolute top-1 right-1 p-1.5 text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
        >
            <GripVertical size={16} />
        </div>
      )}

      <div className="pr-6">
        <div className="flex items-center gap-2 mb-2">
            {moduleInfo && (
                <Badge className="!py-0.5 !px-2 !text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <IconRenderer name={moduleInfo.icon} size={12} className="mr-1.5" />
                    {moduleInfo.name}
                </Badge>
            )}
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {isBlocked && (
            <Badge className="!py-0.5 !px-2 !text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                <Lock size={12} className="mr-1" />
                Bloqueada
            </Badge>
          )}
        </div>
      </div>

      <div className="flex justify-between items-end mt-4">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {task.hasBeenReproved && (
            <div className="flex items-center gap-1 text-orange-500" title="Esta tarefa foi reprovada no teste e requer correção.">
              <AlertTriangle size={14} />
            </div>
          )}
          {(task.commentsCount ?? 0) > 0 && (
            <div className="flex items-center gap-1" title={`${task.commentsCount} comentários`}>
              <MessageSquare size={14} />
              {task.commentsCount}
            </div>
          )}
          {(task.links?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1" title={`${task.links!.length} ${task.links!.length > 1 ? 'links' : 'link'}`}>
                  <Link2 size={14} />
                  <span>{task.links!.length}</span>
              </div>
          )}
           {(totalTime > 0 || isTimerActiveForThisTask) && (
              <div className="flex items-center gap-1 font-mono" title={`Tempo total: ${formatDuration(totalTime)}`}>
                  <Clock size={14} />
                  <span>{isTimerActiveForThisTask ? formatDuration(totalTime + runningTime) : formatDuration(totalTime)}</span>
              </div>
           )}
        </div>
        <div className="flex items-center gap-1">
           {isTimerActiveForThisTask ? (
                <button
                    onClick={handlePauseClick}
                    disabled={isBusy}
                    title="Pausar contador"
                    className="flex items-center p-1.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                    <Pause size={14} />
                </button>
            ) : (
                <button
                    onClick={handlePlayClick}
                    disabled={isBusy || isAnotherTimerActive}
                    title={isAnotherTimerActive ? "Você já tem um timer ativo em outra tarefa." : "Iniciar contador"}
                    className="flex items-center p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100"
                >
                    <Play size={14} />
                </button>
            )}
            {task.assignee && <Avatar user={task.assignee} size="sm" />}
        </div>
      </div>
       {timerError && <p className="text-xs text-red-500 mt-2 text-right">{timerError}</p>}
       
    </motion.div>
  );
};

export default TaskCard;
