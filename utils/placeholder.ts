import { useState } from 'react';
import { startTimer, stopTimer } from '../services/firestoreService';

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