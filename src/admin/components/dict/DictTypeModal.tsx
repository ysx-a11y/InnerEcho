import React from 'react';
import { Database } from 'lucide-react';
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

interface DictTypeModalProps {
  isOpen: boolean;
  typeEditing: {
    code: string;
    name: string;
    description: string;
    remark: string;
    isEdit: boolean;
  };
  onChange: (patch: Partial<DictTypeModalProps['typeEditing']>) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}

export const DictTypeModal: React.FC<DictTypeModalProps> = ({
  isOpen,
  typeEditing,
  onChange,
  onClose,
  onSave,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-4 gap-3">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <Database className="size-4 text-primary" />
            <span>新增字典大类</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            配置字典类型编码、名称、业务描述与备注信息。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              字典类型编码 (code, 英文唯一键) *
            </label>
            <Input
              placeholder="例如 user_role, audit_level"
              value={typeEditing.code}
              onChange={(e) => onChange({ code: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">字典类型名称 (name) *</label>
            <Input
              placeholder="例如 用户角色字典"
              value={typeEditing.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">业务定位描述 (description)</label>
            <Input
              placeholder="说明该字典服务于哪些核心业务"
              value={typeEditing.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">系统备注 (remark)</label>
            <Input
              placeholder="内部维护提示或约束"
              value={typeEditing.remark}
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
            确认保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DictTypeModal;

