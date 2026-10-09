import { useEffect, useState, useRef, useCallback } from 'react';
import { DownloadTask } from '../types';
import { fetchActiveTasks, cancelDownload } from '../services/api';

export function useWebSocket(onTaskFinished?: () => void) {
  const [activeTasks, setActiveTasks] = useState<Record<string, DownloadTask>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const loadInitialTasks = useCallback(async () => {
    try {
      const tasks = await fetchActiveTasks();
      const taskMap: Record<string, DownloadTask> = {};
      tasks.forEach((t) => {
        taskMap[t.task_id] = t;
      });
      setActiveTasks(taskMap);
    } catch (e) {
      console.error('Failed to load initial tasks:', e);
    }
  }, []);

  useEffect(() => {
    loadInitialTasks();
  }, [loadInitialTasks]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '5173' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[WS] Connected to backend');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'task_added') {
          const task: DownloadTask = msg.task;
          setActiveTasks((prev) => ({ ...prev, [task.task_id]: task }));
        } else if (msg.type === 'task_progress') {
          const updated: DownloadTask = msg.data;
          setActiveTasks((prev) => ({
            ...prev,
            [updated.task_id]: { ...prev[updated.task_id], ...updated }
          }));
        } else if (msg.type === 'task_status_change') {
          setActiveTasks((prev) => {
            const current = prev[msg.task_id];
            if (!current) return prev;
            return {
              ...prev,
              [msg.task_id]: { ...current, status: msg.status }
            };
          });
        } else if (msg.type === 'task_completed') {
          const completedTask: DownloadTask = msg.task;
          setActiveTasks((prev) => {
            const next = { ...prev };
            delete next[completedTask.task_id];
            return next;
          });
          if (onTaskFinished) onTaskFinished();
        } else if (msg.type === 'task_cancelled') {
          setActiveTasks((prev) => {
            const next = { ...prev };
            delete next[msg.task_id];
            return next;
          });
          if (onTaskFinished) onTaskFinished();
        } else if (msg.type === 'task_failed') {
          setActiveTasks((prev) => {
            const current = prev[msg.task_id];
            if (!current) return prev;
            return {
              ...prev,
              [msg.task_id]: { ...current, status: 'failed', error_message: msg.error }
            };
          });
          if (onTaskFinished) onTaskFinished();
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[WS] Disconnected, scheduling reconnect...');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [onTaskFinished]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const handleCancel = async (taskId: string) => {
    await cancelDownload(taskId);
    setActiveTasks((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  return {
    isConnected,
    activeTasks: Object.values(activeTasks),
    cancelTask: handleCancel,
    refreshTasks: loadInitialTasks
  };
}
