/**
 * 昵称校验：最少 2 个字符，且不允许 aa / 11 这类全重复字符名称，
 * 避免管理后台与用户列表中重复度过高。
 * 返回错误文案；合法时返回 null。
 */
export function validateNickname(nickname: string): string | null {
  const name = (nickname ?? '').trim();
  if (name.length < 2) return '名称或昵称至少需要 2 个字符';
  if (new Set(Array.from(name)).size < 2) return '名称或昵称不能使用 aa、11 这类重复字符';
  return null;
}
