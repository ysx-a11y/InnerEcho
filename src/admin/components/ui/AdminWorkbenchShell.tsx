import React from 'react';

export interface AdminWorkbenchShellProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 标准化管理端工作台外壳组件（高密度纯净容器，移除多余占位横幅卡片，聚焦核心内容）
 */
export const AdminWorkbenchShell: React.FC<AdminWorkbenchShellProps> = ({
  actions,
  children,
}) => {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
      {actions && (
        <div className="flex items-center justify-end gap-2">
          {actions}
        </div>
      )}
      <div className="w-full">{children}</div>
    </div>
  );
};
export default AdminWorkbenchShell;
