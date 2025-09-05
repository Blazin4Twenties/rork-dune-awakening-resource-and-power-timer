import { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'timer' | 'resource' | 'system' | 'error' | 'warning' | 'info';
  action: string;
  message: string;
  details?: any;
}

export interface PausedFunction {
  name: string;
  message: string;
  pausedAt: Date;
}

interface DebugState {
  enabled: boolean;
  pausedFunctions: Map<string, PausedFunction>;
  logs: LogEntry[];
}

const DEBUG_PASSWORD = 'Password123';
const MAX_LOGS = 500;

export const [DebugProvider, useDebug] = createContextHook(() => {
  const [debugState, setDebugState] = useState<DebugState>({
    enabled: false,
    pausedFunctions: new Map(),
    logs: [],
  });

  const addLog = useCallback((
    type: LogEntry['type'],
    action: string,
    message: string,
    details?: any
  ) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      action,
      message,
      details,
    };

    setDebugState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs].slice(0, MAX_LOGS),
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setDebugState(prev => ({
      ...prev,
      logs: [],
    }));
  }, []);

  const enableDebugMode = useCallback((password: string): boolean => {
    if (password === DEBUG_PASSWORD) {
      setDebugState(prev => ({
        ...prev,
        enabled: true,
      }));
      return true;
    }
    return false;
  }, []);

  const disableDebugMode = useCallback(() => {
    setDebugState(prev => ({
      ...prev,
      enabled: false,
      pausedFunctions: new Map(),
    }));
  }, []);

  const pauseFunction = useCallback((functionName: string, message: string) => {
    setDebugState(prev => {
      const newPaused = new Map(prev.pausedFunctions);
      newPaused.set(functionName, {
        name: functionName,
        message,
        pausedAt: new Date(),
      });
      
      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type: 'system',
        action: 'Function Paused',
        message: `${functionName} paused`,
        details: { message },
      };
      
      return {
        ...prev,
        pausedFunctions: newPaused,
        logs: [newLog, ...prev.logs].slice(0, MAX_LOGS),
      };
    });
  }, []);

  const resumeFunction = useCallback((functionName: string) => {
    setDebugState(prev => {
      const newPaused = new Map(prev.pausedFunctions);
      newPaused.delete(functionName);
      
      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type: 'system',
        action: 'Function Resumed',
        message: `${functionName} resumed`,
      };
      
      return {
        ...prev,
        pausedFunctions: newPaused,
        logs: [newLog, ...prev.logs].slice(0, MAX_LOGS),
      };
    });
  }, []);

  const isFunctionPaused = useCallback((functionName: string): boolean => {
    return debugState.pausedFunctions.has(functionName);
  }, [debugState.pausedFunctions]);

  const getPausedMessage = useCallback((functionName: string): string => {
    const paused = debugState.pausedFunctions.get(functionName);
    return paused?.message || 'This function is currently paused for maintenance';
  }, [debugState.pausedFunctions]);

  return useMemo(() => ({
    debugEnabled: debugState.enabled,
    logs: debugState.logs,
    pausedFunctions: debugState.pausedFunctions,
    addLog,
    clearLogs,
    enableDebugMode,
    disableDebugMode,
    pauseFunction,
    resumeFunction,
    isFunctionPaused,
    getPausedMessage,
  }), [
    debugState.enabled,
    debugState.logs,
    debugState.pausedFunctions,
    addLog,
    clearLogs,
    enableDebugMode,
    disableDebugMode,
    pauseFunction,
    resumeFunction,
    isFunctionPaused,
    getPausedMessage,
  ]);
});