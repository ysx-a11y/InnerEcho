/**
 * 全局管理端操作通知助手（纯原生轻量事件总线，零第三方臃肿依赖）。
 * 
 * 在任何工作台组件中直接调用：
 * adminNotify.success('操作成功');
 * adminNotify.error('执行失败');
 */

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const adminNotify = {
  subscribe(fn: ToastListener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  show(item: Omit<ToastItem, 'id'>) {
    const toast: ToastItem = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item,
    };
    listeners.forEach((fn) => fn(toast));
  },
  success: (message: string, title = '操作成功') => {
    adminNotify.show({ type: 'success', title, message });
  },
  error: (message: string, title = '操作失败') => {
    adminNotify.show({ type: 'error', title, message });
  },
  info: (message: string, title = '提示') => {
    adminNotify.show({ type: 'info', title, message });
  },
};

export default adminNotify;
