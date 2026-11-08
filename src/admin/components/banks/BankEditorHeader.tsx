import React from 'react';
import {
  Check,
  Copy,
  Download,
  Globe,
  Loader2,
  Lock,
  Save,
  Trash2,
} from 'lucide-react';
import type { AdminBankDetail } from '../../adminTypes';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface BankEditorHeaderProps {
  bank: AdminBankDetail;
  isDirty: boolean;
  saving: boolean;
  onExportJson: () => void;
  onCloneBank: () => void | Promise<void>;
  onAudit?: (action: 'approve' | 'reject') => void | Promise<void>;
  onTogglePublish: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

/**
 * 题库编辑器紧凑头部（移除冗余横幅与审核流，聚焦高效编辑、版本存盘与上下架）
 */
export const BankEditorHeader: React.FC<BankEditorHeaderProps> = ({
  bank: currentBank,
  isDirty,
  saving,
  onExportJson: handleExportJson,
  onCloneBank: handleCloneBank,
  onTogglePublish: handleTogglePublish,
  onSave: handleSave,
  onDelete: handleDeleteBank,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-border/80 bg-card">
    {/* 题库基本标识 */}
    <div className="space-y-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold tracking-tight text-foreground truncate">
          {currentBank.title || '未命名题库'}
        </h2>
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground px-1.5 py-0">
          {currentBank.id}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {currentBank.isBuiltin ? (
          <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
            <Lock className="size-2.5" /> 核心预设（只读）
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            自建扩展题库
          </Badge>
        )}

        {currentBank.isPublished ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-[10px] px-1.5 py-0"
          >
            <Check className="size-2.5" /> 已上架 · 公开答题
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground text-[10px] px-1.5 py-0">
            未上架 · 仅后台调试
          </Badge>
        )}

        {isDirty && (
          <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0">
            有未保存修改
          </Badge>
        )}
      </div>
    </div>

    {/* 操作按钮区 */}
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJson}
        title="导出为标准 JSON 文件"
        className="h-7 text-xs gap-1.5"
      >
        <Download className="size-3" />
        <span>导出 JSON</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCloneBank}
        disabled={saving}
        title="以此题库为蓝本克隆副本"
        className="h-7 text-xs gap-1.5"
      >
        <Copy className="size-3" />
        <span>复制副本</span>
      </Button>

      {/* 非内置预设支持快捷上下架切换 */}
      {!currentBank.isBuiltin && (
        <Button
          variant={currentBank.isPublished ? 'outline' : 'default'}
          size="sm"
          onClick={handleTogglePublish}
          disabled={saving}
          className="h-7 text-xs gap-1.5"
        >
          <Globe className="size-3" />
          <span>{currentBank.isPublished ? '下架为草稿' : '发布上线'}</span>
        </Button>
      )}

      {/* 保存修改按钮（内置预设只读保护） */}
      {!currentBank.isBuiltin && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="h-7 text-xs gap-1.5"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          <span>保存修改</span>
        </Button>
      )}

      {/* 物理删除按钮 */}
      {!currentBank.isBuiltin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteBank}
          disabled={saving}
          title="物理永久删除该题库"
          className="size-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  </div>
);
