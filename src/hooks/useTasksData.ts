import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionUser } from '../../shared/apiContracts';
import type { MediaAttachment } from '../types/quizEngine';
import type {
  CompletedTask,
  TaskActionResult,
  TaskCategory,
  TaskInfo,
  TaskListResponse,
  TaskLoadStatus,
} from '../components/tasks/taskTypes';
import { ApiError, apiGet, apiPost } from '../utils/api';

type TaskFetchResult = 'success' | 'error' | 'aborted';

interface UseTasksDataOptions {
  user: SessionUser | null | undefined;
  onSessionExpired: () => void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return (error.payload as { message?: string })?.message ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

/** Owns task server state and mutations; page navigation and forms stay in TasksView. */
export function useTasksData({ user, onSessionExpired }: UseTasksDataOptions) {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalAcceptedCount, setTotalAcceptedCount] = useState(0);
  const [completedHistory, setCompletedHistory] = useState<CompletedTask[]>([]);
  const [status, setStatus] = useState<TaskLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [abandoningId, setAbandoningId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fetchControllerRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async (): Promise<TaskFetchResult> => {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    setError(null);
    setStatus((current) => current === 'ready' || current === 'refreshing' ? 'refreshing' : 'loading');

    try {
      const { data } = await apiGet<TaskListResponse>('/api/tasks', {
        signal: controller.signal,
        onUnauthorized: onSessionExpired,
      });
      if (fetchControllerRef.current !== controller) return 'aborted';
      if (!data.success) throw new Error('获取数据失败');

      setTasks(data.tasks);
      setCompletedCount(data.completedCount);
      setTotalAcceptedCount(data.totalAcceptedCount);
      setCompletedHistory(data.completedHistory);
      setStatus('ready');
      return 'success';
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') return 'aborted';
      if (fetchControllerRef.current !== controller) return 'aborted';
      console.error('Failed to fetch tasks:', fetchError);
      setError(getApiErrorMessage(fetchError, '加载任务列表失败'));
      setStatus('error');
      return 'error';
    } finally {
      clearTimeout(timeoutId);
    }
  }, [onSessionExpired]);

  const refreshAfterMutation = useCallback(async () => {
    if (await fetchTasks() === 'error') {
      setError('操作成功，但列表刷新失败，请点击重试');
    }
  }, [fetchTasks]);

  const acceptTask = useCallback(async (taskId: string): Promise<TaskActionResult> => {
    if (!user) return { ok: false, message: '请先登录' };
    setAcceptingId(taskId);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        `/api/tasks/${taskId}/accept`,
        {},
        { onUnauthorized: onSessionExpired },
      );
      if (!data.success) return { ok: false, message: data.message || '接取任务失败' };
      await refreshAfterMutation();
      return { ok: true };
    } catch (actionError) {
      console.error('Accept task error:', actionError);
      return { ok: false, message: getApiErrorMessage(actionError, '连接失败，请稍后再试') };
    } finally {
      setAcceptingId(null);
    }
  }, [onSessionExpired, refreshAfterMutation, user]);

  const abandonTask = useCallback(async (taskId: string): Promise<TaskActionResult> => {
    if (!user) return { ok: false, message: '请先登录' };
    setAbandoningId(taskId);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        `/api/tasks/${taskId}/abandon`,
        {},
        { onUnauthorized: onSessionExpired },
      );
      if (!data.success) return { ok: false, message: data.message || '放弃任务失败' };
      await refreshAfterMutation();
      return { ok: true };
    } catch (actionError) {
      console.error('Abandon task error:', actionError);
      return { ok: false, message: getApiErrorMessage(actionError, '连接失败，请稍后再试') };
    } finally {
      setAbandoningId(null);
    }
  }, [onSessionExpired, refreshAfterMutation, user]);

  const completeTask = useCallback(async (
    taskId: string,
    textContent: string,
    attachments: MediaAttachment[],
  ): Promise<TaskActionResult> => {
    if (!user) return { ok: false, message: '请先登录' };
    setSubmittingId(taskId);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        `/api/tasks/${taskId}/complete`,
        { textContent, attachments },
        { onUnauthorized: onSessionExpired },
      );
      if (!data.success) return { ok: false, message: data.message || '完成任务失败' };
      await refreshAfterMutation();
      return { ok: true };
    } catch (actionError) {
      console.error('Complete task error:', actionError);
      return { ok: false, message: getApiErrorMessage(actionError, '连接失败，请稍后再试') };
    } finally {
      setSubmittingId(null);
    }
  }, [onSessionExpired, refreshAfterMutation, user]);

  const createTask = useCallback(async (
    title: string,
    description: string,
    category: TaskCategory,
  ): Promise<TaskActionResult> => {
    if (!user) return { ok: false, message: '请先登录' };
    setPublishing(true);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        '/api/tasks',
        { title, description, category },
        { onUnauthorized: onSessionExpired },
      );
      if (!data.success) return { ok: false, message: data.message || '发布任务失败' };
      await refreshAfterMutation();
      return { ok: true };
    } catch (actionError) {
      console.error('Publish task error:', actionError);
      return { ok: false, message: getApiErrorMessage(actionError, '连接异常，请稍后再试') };
    } finally {
      setPublishing(false);
    }
  }, [onSessionExpired, refreshAfterMutation, user]);

  useEffect(() => {
    fetchControllerRef.current?.abort();
    setTasks([]);
    setCompletedCount(0);
    setTotalAcceptedCount(0);
    setCompletedHistory([]);
    setStatus('idle');
    setError(null);
    void fetchTasks();
    return () => fetchControllerRef.current?.abort();
  }, [fetchTasks]);

  return {
    tasks,
    completedCount,
    totalAcceptedCount,
    completedHistory,
    status,
    error,
    acceptingId,
    submittingId,
    abandoningId,
    publishing,
    fetchTasks,
    acceptTask,
    abandonTask,
    completeTask,
    createTask,
  };
}
