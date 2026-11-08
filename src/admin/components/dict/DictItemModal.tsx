import React from 'react';
import { Layers, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const BADGE_COLOR_OPTIONS = [
  { value: 'teal', label: '青翠绿 (teal)' },
  { value: 'blue', label: '天空蓝 (blue)' },
  { value: 'yellow', label: '琥珀黄 (yellow)' },
  { value: 'red', label: '警示红 (red)' },
  { value: 'pink', label: '深魅粉 (pink)' },
  { value: 'violet', label: '幽邃紫 (violet)' },
  { value: 'indigo', label: '沉稳靛 (indigo)' },
  { value: 'gray', label: '素雅灰 (gray)' },
];

export const BADGE_VARIANT_OPTIONS = [
  { value: 'light', label: '轻盈浅底 (light)' },
  { value: 'filled', label: '实心强调 (filled)' },
  { value: 'outline', label: '边框极简 (outline)' },
];

interface DictItemModalProps {
  isOpen: boolean;
  itemEditing: {
    value: string;
    label: string;
    badgeColor: string;
    badgeVariant: string;
    sortOrder: number;
    isDefault: number;
    isActive: number;
    remark: string;
    isEdit: boolean;
  };
  onChange: (patch: Partial<DictItemModalProps['itemEditing']>) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}

export const DictItemModal: React.FC<DictItemModalProps> = ({
  isOpen,
  itemEditing,
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
            <Layers className="size-4 text-primary" />
            <span>{itemEditing.isEdit ? '编辑字典项' : '新增字典项'}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3.5 space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">枚举键值 (value, 唯一键) *</label>
            <Input
              placeholder="例如 active, pending, approved"
              value={itemEditing.value}
              disabled={itemEditing.isEdit}
              onChange={(e) => onChange({ value: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">展示标签 (label) *</label>
            <Input
              placeholder="例如 正常活跃, 待审核"
              value={itemEditing.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">徽章配色</label>
              <select
                value={itemEditing.badgeColor}
                onChange={(e) => onChange({ badgeColor: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {BADGE_COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">风格变体</label>
              <select
                value={itemEditing.badgeVariant}
                onChange={(e) => onChange({ badgeVariant: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {BADGE_VARIANT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">排序权重 (数字升序)</label>
              <Input
                type="number"
                value={itemEditing.sortOrder}
                onChange={(e) => onChange({ sortOrder: parseInt(e.target.value, 10) || 0 })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-4 mt-6">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemEditing.isActive === 1}
                  onChange={(e) => onChange({ isActive: e.target.checked ? 1 : 0 })}
                />
                <span>启用中</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemEditing.isDefault === 1}
                  onChange={(e) => onChange({ isDefault: e.target.checked ? 1 : 0 })}
                />
                <span>默认项</span>
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">业务说明与备注 (remark)</label>
            <textarea
              rows={2}
              value={itemEditing.remark}
              onChange={(e) => onChange({ remark: e.target.value })}
              placeholder="说明该枚举值在哪些业务模块适用…"
              className="flex w-full rounded-md border border-input bg-background p-2 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={onSave}>
              保存字典项
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DictItemModal;

