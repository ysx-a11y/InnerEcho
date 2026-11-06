/**
 * 年龄字段的唯一归一化 / 校验入口。
 *
 * 背景：服务端 `analyzeDossierSchema` 对 chapter1.age 的约束是
 * `z.string().regex(/^\d*$/, '年龄必须为纯数字')`，而历史上曾出现把区间文案
 * （如 "23-28岁"）直接写进 chapter1.age 的入口，导致 /api/analyze-dossier
 * 返回 400、卷宗静默不入库。任何写入 chapter1.age 的地方都必须经过
 * normalizeAge()，不要把 UI 展示文案直接当成数据提交。
 */

/** 年龄可选范围，与服务端宽松的纯数字校验保持一致（服务端不限制区间）。 */
export const MIN_AGE = 18;
export const MAX_AGE = 70;

/**
 * 归一化为纯数字字符串，最多 2 位；返回 '' 表示未填写。
 *
 * 截断到 2 位同时兼容历史脏数据：
 *   '23-28岁' -> '2328' -> '23'
 *   '2328'    -> '2328' -> '23'
 *   '25岁'    -> '25'   -> '25'
 *   ''        -> ''
 */
export function normalizeAge(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 2);
}

/**
 * 校验年龄。年龄是可选字段，未填写视为合法（与服务端 `.optional()` 一致）。
 * @returns 错误文案；合法时返回 null。
 */
export function validateAge(value?: string | null): string | null {
  const age = normalizeAge(value);
  if (!age) return null;
  const numeric = Number(age);
  if (numeric < MIN_AGE || numeric > MAX_AGE) {
    return `年龄需在 ${MIN_AGE}-${MAX_AGE} 岁之间`;
  }
  return null;
}
