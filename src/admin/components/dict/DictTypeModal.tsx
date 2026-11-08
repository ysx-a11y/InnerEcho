import React from 'react';
import { Database, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
            <Database className="size-4 text-primary" />
            <span>新增字典大类</span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3.5 space-y-3 text-xs">
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
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={onSave}>
              确认保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DictTypeModal;

