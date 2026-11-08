import React from 'react';
import { GitFork, X } from 'lucide-react';
import type { SysDictItem } from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface DictTransitionModalProps {
  isOpen: boolean;
  items: SysDictItem[];
  transitionEditing: {
    fromValue: string;
    toValue: string;
    actionName: string;
    requiredRole: 'user' | 'admin' | 'system';
    remark: string;
  };
  onChange: (patch: Partial<DictTransitionModalProps['transitionEditing']>) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}

export const DictTransitionModal: React.FC<DictTransitionModalProps> = ({
  isOpen,
  items,
  transitionEditing,
  onChange,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md shadow-xl border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <GitFork className="size-4 text-primary" />
            <span>新增状态机流转规则</span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3.5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">起始状态 (From) *</label>
              <select
                value={transitionEditing.fromValue}
                onChange={(e) => onChange({ fromValue: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
              >
                {items.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label} ({it.value})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">目标状态 (To) *</label>
              <select
                value={transitionEditing.toValue}
                onChange={(e) => onChange({ toValue: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
              >
                {items.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label} ({it.value})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">触发流转动作 (actionName) *</label>
            <Input
              placeholder="例如 approve, reject, freeze, restore"
              value={transitionEditing.actionName}
              onChange={(e) => onChange({ actionName: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">所需执行角色 (requiredRole)</label>
            <select
              value={transitionEditing.requiredRole}
              onChange={(e) => onChange({ requiredRole: e.target.value as any })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
            >
              <option value="admin">管理员 (admin)</option>
              <option value="user">普通用户 (user)</option>
              <option value="system">系统内部 (system)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">流转备注说明 (remark)</label>
            <Input
              placeholder="如：仅当符合实名条件或审核未通过时允许驳回"
              value={transitionEditing.remark}
              onChange={(e) => onChange({ remark: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={onSave}>
              保存流转规则
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DictTransitionModal;

