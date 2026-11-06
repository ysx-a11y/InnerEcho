import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpecialEvaluationResult, SpecialTaskResponse } from '../../shared/apiContracts';
import { ApiError, apiGet, apiPost } from '../utils/api';
import type {
  SpecialPriceLeaderboardItem,
  SpecialPriceMyStatus,
  SpecialPriceLeaderboardResponse,
} from '../components/tasks/taskTypes';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return (error.payload as { message?: string })?.message ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export type SpecialTaskType = 'price_tag' | 'betrothal_gift';

function getApiSlug(taskType: SpecialTaskType): string {
  return taskType === 'betrothal_gift' ? 'betrothal-gift' : 'price-tag';
}

export function useSpecialPriceTask(taskType: SpecialTaskType = 'price_tag') {
  const [evaluation, setEvaluation] = useState<SpecialEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiSlug = getApiSlug(taskType);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<SpecialPriceLeaderboardItem[]>([]);
  const [myLeaderboardStatus, setMyLeaderboardStatus] = useState<SpecialPriceMyStatus | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const fetchSpecialEvaluation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiGet<SpecialTaskResponse>(`/api/tasks/special/${apiSlug}`);
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
        setCountdown(data.evaluation.cooldownRemainingSeconds);
      } else {
        setEvaluation(null);
        setCountdown(0);
      }
    } catch (err) {
      console.warn(`Failed to fetch special task [${apiSlug}] evaluation:`, err);
    } finally {
      setLoading(false);
    }
  }, [apiSlug]);

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const { data } = await apiGet<SpecialPriceLeaderboardResponse>(`/api/tasks/special/${apiSlug}/leaderboard`);
      if (data.success) {
        setLeaderboard(data.top10 || []);
        setMyLeaderboardStatus(data.myStatus || null);
      } else {
        setLeaderboardError(data.message || '获取排行榜失败');
      }
    } catch (err) {
      setLeaderboardError(getApiErrorMessage(err, '获取排行榜失败'));
    } finally {
      setLeaderboardLoading(false);
    }
  }, [apiSlug]);

  useEffect(() => {
    fetchSpecialEvaluation();
  }, [fetchSpecialEvaluation]);

  // 倒计时计时器
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  const submitEvaluation = useCallback(
    async (price: number, selfEvaluation: string): Promise<{ ok: boolean; message?: string }> => {
      setSubmitting(true);
      setError(null);
      try {
        const { data } = await apiPost<SpecialTaskResponse>(`/api/tasks/special/${apiSlug}`, {
          price,
          selfEvaluation,
        });

        if (data.success && data.evaluation) {
          setEvaluation(data.evaluation);
          setCountdown(data.evaluation.cooldownRemainingSeconds);
          // 同步刷新排行榜
          void fetchLeaderboard();
          return { ok: true, message: data.message };
        }
        const msg = data.message || '提交失败，请稍后重试';
        setError(msg);
        return { ok: false, message: msg };
      } catch (err) {
        const msg = getApiErrorMessage(err, '连接失败，请稍后重试');
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setSubmitting(false);
      }
    },
    [apiSlug, fetchLeaderboard]
  );

  const vote = useCallback(
    async (evaluationId: string, voteType: 'up' | 'down') => {
      try {
        const { data } = await apiPost<{
          success: boolean;
          upvotes: number;
          downvotes: number;
          netScore: number;
          userVote: 'up' | 'down' | null;
        }>(`/api/tasks/special/${apiSlug}/vote`, {
          evaluationId,
          voteType,
        });

        if (data.success) {
          setLeaderboard((prev) =>
            prev.map((item) => {
              if (item.id === evaluationId) {
                return {
                  ...item,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                  netScore: data.netScore,
                  userVote: data.userVote,
                };
              }
              return item;
            })
          );
          setMyLeaderboardStatus((prev) => {
            if (prev && prev.id === evaluationId) {
              return {
                ...prev,
                upvotes: data.upvotes,
                downvotes: data.downvotes,
                netScore: data.netScore,
                userVote: data.userVote,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Voting failed:', err);
      }
    },
    [apiSlug]
  );

  return {
    evaluation,
    loading,
    submitting,
    error,
    countdown,
    canEdit: countdown === 0,
    submitEvaluation,
    refreshEvaluation: fetchSpecialEvaluation,
    leaderboard,
    myLeaderboardStatus,
    leaderboardLoading,
    leaderboardError,
    fetchLeaderboard,
    vote,
  };
}
