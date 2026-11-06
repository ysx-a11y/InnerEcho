/**
 * 用户自建题库的前端 API helper。
 * 类型与后端 server/types.ts 的 UserBankSummary / UserBankRecord 保持一致。
 */
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from './api.js';
import type { QuestionDefinition, QuestionBankMetadata } from '../types/quizEngine.js';
import type {
  UserBankRecordContract,
  UserBankSummaryContract,
} from '../../shared/apiContracts';

export type UserBankSummaryDTO = UserBankSummaryContract;
export type UserBankRecordDTO = UserBankRecordContract<QuestionDefinition>;

interface ApiBankResponse {
  success: boolean;
  message?: string;
  bank?: UserBankRecordDTO;
  banks?: UserBankSummaryDTO[];
}

/** 列出当前登录用户的所有题库（草稿 + 已发布）。 */
export async function fetchUserBanks(
  onUnauthorized?: () => void
): Promise<UserBankSummaryDTO[]> {
  const { data } = await apiGet<ApiBankResponse>('/api/banks', { onUnauthorized });
  return data.banks ?? [];
}

/** 获取单个题库的完整记录（含 questions）。 */
export async function fetchUserBankById(
  id: string,
  onUnauthorized?: () => void
): Promise<UserBankRecordDTO | null> {
  const { data } = await apiGet<ApiBankResponse>(`/api/banks/${encodeURIComponent(id)}`, { onUnauthorized });
  return data.bank ?? null;
}

/** 创建新题库（默认草稿态）。返回完整记录。 */
export async function createUserBank(input: {
  title: string;
  subtitle?: string;
  description?: string;
  category?: 'scientific' | 'direct' | 'scenario' | 'preference';
  badgeColor?: string;
  estimatedMinutes?: number;
  questions?: QuestionDefinition[];
  isPublished?: boolean;
}, onUnauthorized?: () => void): Promise<UserBankRecordDTO> {
  const { data } = await apiPost<ApiBankResponse>('/api/banks', input, { onUnauthorized });
  if (!data.bank) throw new ApiError('创建题库失败：响应缺少 bank 字段', 500, data);
  return data.bank;
}

/** 更新题库（部分更新）。 */
export async function updateUserBank(
  id: string,
  patch: Partial<{
    title: string;
    subtitle: string;
    description: string;
    category: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor: string | null;
    estimatedMinutes: number | null;
    questions: QuestionDefinition[];
    isPublished: boolean;
  }>,
  onUnauthorized?: () => void
): Promise<UserBankRecordDTO> {
  const { data } = await apiPut<ApiBankResponse>(`/api/banks/${encodeURIComponent(id)}`, patch, { onUnauthorized });
  if (!data.bank) throw new ApiError('更新题库失败：响应缺少 bank 字段', 500, data);
  return data.bank;
}

/** 删除题库。 */
export async function deleteUserBank(
  id: string,
  onUnauthorized?: () => void
): Promise<void> {
  await apiDelete<ApiBankResponse>(`/api/banks/${encodeURIComponent(id)}`, undefined, { onUnauthorized });
}

/** 列出所有已通过审核并公开上线的社区自建题库（公开端点，无需登录）。 */
export async function fetchPublicApprovedBanks(): Promise<UserBankSummaryDTO[]> {
  const { data } = await apiGet<ApiBankResponse>('/api/banks/public');
  return data.banks ?? [];
}

/** 将 UserBankSummary 转换为题库选择卡片用的元数据格式。 */
export function summaryToMetadata(summary: UserBankSummaryDTO): QuestionBankMetadata {
  return {
    id: summary.id,
    title: summary.title,
    subtitle: summary.subtitle,
    description: summary.description,
    category: summary.category,
    badge: '社区共创',
    badgeColor: summary.badgeColor ?? '#9333ea',
    estimatedMinutes: summary.estimatedMinutes ?? undefined,
    // 用户题库没有 dimensions 概念（不评分维度），保持空数组
    dimensions: [],
  };
}

