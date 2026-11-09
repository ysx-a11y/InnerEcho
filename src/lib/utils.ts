import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 客户端全局 class 合并帮助函数。
 * 组合 clsx 条件判断与 tailwind-merge 规则冲突处理。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

