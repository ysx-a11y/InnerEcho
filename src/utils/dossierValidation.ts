import type { ZodIssueContract } from '../../shared/apiContracts';

/**
 * 服务端 chapter1 等字段 → 用户可读标签。
 *
 * 存在意义：/api/analyze-dossier 的入参校验失败（HTTP 400）过去被当成
 * "网络/服务端异常"笼统提示，导致"年龄必须为纯数字"这类可修复的问题被
 * 掩盖成静默不保存。这里把字段级原因还原成人话。
 */
const FIELD_LABELS: Record<string, string> = {
  nickname: '昵称',
  gender: '性别',
  age: '年龄',
  occupation: '职业',
  personaTrait: '人设形象',
  surfaceTrait: '表性特征',
  innerDesire: '内在渴望',
  maritalStatus: '婚姻状态',
  hasBoyfriend: '感情状态',
  avatarUrl: '照片',
  avatarUrls: '照片',
  chapter1: '第一章基础信息',
  chapter2: '第二章边界自白',
  chapter3: '第三章密室法则',
  selectedBankIds: '所选题库',
  selectedShadowTags: '暗影标签',
  depthRating: '深度评级',
};

/** 从 zod issue 的 path 中取出字段标签；取最后一个非数字段（跳过数组下标）。 */
export function fieldLabelFromPath(path?: Array<string | number>): string | null {
  if (!Array.isArray(path) || path.length === 0) return null;
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const segment = path[i];
    if (typeof segment === 'number') continue;
    return FIELD_LABELS[segment] ?? null;
  }
  return null;
}

/**
 * 把服务端 400 的校验结果转成用户可读的提示。
 * 明确告知"本次卷宗尚未保存"，避免用户以为报告已入库。
 */
export function describeValidationFailure(
  issues?: ZodIssueContract[],
  fallbackMessage?: string
): string {
  const issue = issues?.[0];
  const label = issue ? fieldLabelFromPath(issue.path) : null;
  const reason = issue?.message || fallbackMessage || '入参校验失败';
  const prefix = label ? `${label}：` : '';
  return `提交信息未通过服务端校验（${prefix}${reason}）。本次卷宗尚未保存，请修正后重试。`;
}
