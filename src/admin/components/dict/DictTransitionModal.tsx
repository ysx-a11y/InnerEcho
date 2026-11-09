import React from 'react';
import { GitFork } from 'lucide-react';
import type { SysDictItem } from '../../adminTypes';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

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
  const validItems = items.filter((it) => it.value !== '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-4 gap-3">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <GitFork className="size-4 text-primary" />
            <span>新增状态机流转规则</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            配置起始状态、目标状态、触发动作与所需执行角色。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">起始状态 (From) *</label>
              <Select
                value={transitionEditing.fromValue || undefined}
                onValueChange={(val) => onChange({ fromValue: val })}
              >
                <SelectTrigger size="sm" className="bg-background font-mono">
                  <SelectValue placeholder="选择起始状态" />
                </SelectTrigger>
                <SelectContent>
                  {validItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label} ({it.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">目标状态 (To) *</label>
              <Select
                value={transitionEditing.toValue || undefined}
                onValueChange={(val) => onChange({ toValue: val })}
              >
                <SelectTrigger size="sm" className="bg-background font-mono">
                  <SelectValue placeholder="选择目标状态" />
                </SelectTrigger>
                <SelectContent>
                  {validItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label} ({it.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Select
              value={transitionEditing.requiredRole}
              onValueChange={(val) =>
                onChange({ requiredRole: val as 'user' | 'admin' | 'system' })
              }
            >
              <SelectTrigger size="sm" className="bg-background font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理员 (admin)</SelectItem>
                <SelectItem value="user">普通用户 (user)</SelectItem>
                <SelectItem value="system">系统内部 (system)</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
        <DialogFooter className="pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" onClick={onSave}>
            保存流转规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DictTransitionModal;

