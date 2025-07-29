import { useState } from 'react';
import { startTimer, stopTimer } from '../services/firestoreService';
import { Timestamp } from '@firebase/firestore';

// --- FORMATTERS ---

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds < 0 || !totalSeconds) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');
};

export const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    if (seconds < 5) return 'agora mesmo';

    let interval = seconds / 31536000;
    if (interval > 1) {
      return `há ${Math.floor(interval)} anos`;
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return `há ${Math.floor(interval)} meses`;
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return `há ${Math.floor(interval)} dias`;
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return `há ${Math.floor(interval)} horas`;
    }
    interval = seconds / 60;
    if (interval > 1) {
      return `há ${Math.floor(interval)} minutos`;
    }
    return `há ${Math.floor(seconds)} segundos`;
};


// --- HOOKS ---

export const useTimeTracking = () => {
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async (taskId: string, projectId: string) => {
        setError(null);
        setIsBusy(true);
        try {
            await startTimer(taskId, projectId);
        } catch (err: any) {
            console.error("Failed to start timer:", err);
            setError(err.message || "Não foi possível iniciar o contador.");
        } finally {
            setIsBusy(false);
        }
    };

    const handleStop = async () => {
        setError(null);
        setIsBusy(true);
        try {
            await stopTimer();
        } catch (err: any) {
            console.error("Failed to stop timer:", err);
            setError(err.message || "Não foi possível parar o contador.");
        } finally {
            setIsBusy(false);
        }
    };

    return { handleStart, handleStop, isBusy, error, setError };
};
