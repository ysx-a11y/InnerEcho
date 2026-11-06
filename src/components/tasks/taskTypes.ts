import type { MediaAttachment } from '../../types/quizEngine';

export type TaskLoadStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
export type TaskCategory = 'subconscious' | 'dream' | 'shadow' | 'persona';

export interface UserTaskInstance {
  id: string;
  acceptedAt: string;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  requireAudio?: boolean;
  status: 'available' | 'accepted' | 'completed';
  activeTaskInstance: UserTaskInstance | null;
}

export interface CompletedTask {
  id: string;
  taskId: string;
  title: string;
  textContent: string;
  attachments: MediaAttachment[];
  acceptedAt: string;
  completedAt: string;
}

export interface TaskListResponse {
  success: boolean;
  tasks: TaskInfo[];
  completedCount: number;
  totalAcceptedCount: number;
  completedHistory: CompletedTask[];
}

export interface TaskActionResult {
  ok: boolean;
  message?: string;
}
export type {
  SpecialPriceLeaderboardItem,
  SpecialPriceMyStatus,
  SpecialPriceLeaderboardResponse,
} from '../../../shared/apiContracts';

