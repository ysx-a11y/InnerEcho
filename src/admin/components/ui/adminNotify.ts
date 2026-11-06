import { notifications } from '@mantine/notifications';

/**
 * 全局管理端操作通知助手（基于 Mantine Notifications）。
 * 
 * 在任何工作台组件中直接调用，无需在组件内声明 useState<ToastMessage[]>，
 * 彻底消灭重复模板代码。
 */
export const adminNotify = {
  success: (message: string, title = '操作成功') => {
    notifications.show({
      title,
      message,
      color: 'teal',
      autoClose: 3000,
      withBorder: true,
    });
  },
  error: (message: string, title = '操作失败') => {
    notifications.show({
      title,
      message,
      color: 'red',
      autoClose: 4500,
      withBorder: true,
    });
  },
  info: (message: string, title = '提示') => {
    notifications.show({
      title,
      message,
      color: 'blue',
      autoClose: 3000,
      withBorder: true,
    });
  },
};

