import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';

export type ManualMovementQueueItem = {
  id: string; // client operation id
  type: "ARRIVAL" | "DEPARTURE";
  studentId: string;
  guardianId?: string;
  occurredAt: string;
  studentName: string;
  guardianName?: string;
  status: "PENDING" | "REJECTED";
  errorMessage?: string;
};

export function useManualMovementQueue() {
  const [queue, setQueue] = useState<ManualMovementQueueItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('manual-movement-queue');
    if (saved) {
      try {
        setQueue(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse movement queue", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('manual-movement-queue', JSON.stringify(queue));
  }, [queue]);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || queue.length === 0) return;

    const currentQueue = [...queue];
    let hasChanges = false;

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status === 'REJECTED') continue; // User must manually clear or retry these

      try {
        if (item.type === 'ARRIVAL') {
          await apiClient.post('/api/v1/attendance/arrival/manual', {
            studentId: item.studentId,
            operationId: item.id,
            occurredAt: item.occurredAt
          });
        } else {
          await apiClient.post('/api/v1/movement/departure/manual', {
            studentId: item.studentId,
            guardianId: item.guardianId,
            operationId: item.id,
            occurredAt: item.occurredAt
          });
        }

        // Success (either fresh or idempotent retry matched)
        currentQueue.splice(i, 1);
        i--;
        hasChanges = true;
      } catch (err: any) {
        if (err instanceof ApiError) {
          if (err.status >= 400 && err.status < 500) {
            // Rejection (e.g., unauthorized guardian, cross-tenant, or DUPLICATE 409 caused by DIFFERENT operation)
            currentQueue[i].status = 'REJECTED';
            currentQueue[i].errorMessage = err.message;
            hasChanges = true;
          }
        }
        // If it's a network error, keep it PENDING and skip the rest of the queue
        if (!navigator.onLine) break;
      }
    }

    if (hasChanges) {
      setQueue([...currentQueue]);
    }
  }, [queue]);

  useEffect(() => {
    window.addEventListener('online', flushQueue);
    // Periodically try to flush just in case event is missed
    const interval = setInterval(() => flushQueue(), 30000);
    return () => {
      window.removeEventListener('online', flushQueue);
      clearInterval(interval);
    };
  }, [flushQueue]);

  const removeQueueItem = (id: string) => {
    setQueue(q => q.filter(item => item.id !== id));
  };

  const retryItem = (id: string) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, status: 'PENDING', errorMessage: undefined } : item));
    setTimeout(() => flushQueue(), 100);
  };

  const recordManualAction = async (
    type: "ARRIVAL" | "DEPARTURE", 
    studentId: string, 
    studentName: string,
    guardianId?: string,
    guardianName?: string
  ): Promise<{ syncStatus: "SYNCED" | "QUEUED", result?: any }> => {
    const occurredAt = new Date().toISOString();
    const operationId = crypto.randomUUID();
    
    try {
      if (type === 'ARRIVAL') {
        const res = await apiClient.post('/api/v1/attendance/arrival/manual', {
          studentId,
          operationId,
          occurredAt
        });
        return { syncStatus: "SYNCED", result: res };
      } else {
        const res = await apiClient.post('/api/v1/movement/departure/manual', {
          studentId,
          guardianId,
          operationId,
          occurredAt
        });
        return { syncStatus: "SYNCED", result: res };
      }
    } catch (err: any) {
      // Throw API validation errors directly so the user sees them immediately if online
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        throw err;
      }

      // Network error (or 500 server error) -> Queue it offline
      const newItem: ManualMovementQueueItem = {
        id: operationId,
        type,
        studentId,
        studentName,
        guardianId,
        guardianName,
        occurredAt,
        status: 'PENDING'
      };
      
      setQueue(q => [...q, newItem]);
      return { syncStatus: "QUEUED" };
    }
  };

  return {
    queue,
    recordManualAction,
    removeQueueItem,
    retryItem,
    flushQueue
  };
}
