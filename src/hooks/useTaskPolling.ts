import { useState, useEffect, useRef } from "react";
import { getTaskStatus } from "@/lib/api";
import type { BatchTask } from "@/lib/types";

export function useTaskPolling(taskId: string | null) {
  const [task, setTask] = useState<BatchTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        setIsLoading(true);
        const status = await getTaskStatus(taskId);
        setTask(status);
        setError(null);

        if (
          status.status === "completed" ||
          status.status === "failed" ||
          status.status === "cancelled"
        ) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to fetch task"));
      } finally {
        setIsLoading(false);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId]);

  return { task, isLoading, error };
}