import React from 'react';
import { Sparkles, ChevronLeft, Layers, Download, Maximize2 } from 'lucide-react';
import { LuxuryButton } from '../ui/button';

interface ResultActionHeaderProps {
  onExit?: () => void;
  onOpenCardStudio: () => void;
  onExportFullReport: () => void;
  isExportingFull: boolean;
  onOpenFullscreen: () => void;
  accentColor?: string;
}

export const ResultActionHeader: React.FC<ResultActionHeaderProps> = ({
  onExit,
  onOpenCardStudio,
  onExportFullReport,
  isExportingFull,
  onOpenFullscreen,
  accentColor = '#ff70a6',
}) => {
  return (
    <div className="w-full max-w-[640px] flex items-center justify-between mb-2.5 flex-wrap gap-2 box-border">
      <div className="flex items-center gap-2 shrink-0">
        <span className="icon-badge">
          <Sparkles size={13} strokeWidth={1.5} stroke={accentColor} className="animate-icon-pulse" />
        </span>
        <span className="text-sm font-bold text-[var(--text-secondary)] whitespace-nowrap">
          镜界自白 · 深度自白诊断卷宗
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {onExit && (
          <LuxuryButton
            onClick={onExit}
            variant="secondary"
            size="sm"
            className="text-xs h-8 px-2.5 rounded-lg"
          >
            <ChevronLeft size={13} />
            <span>返回主页</span>
          </LuxuryButton>
        )}
        <LuxuryButton
          onClick={onOpenCardStudio}
          variant="glow"
          size="sm"
          className="text-xs h-8 px-3 rounded-lg"
        >
          <Layers size={13} />
          <span>3D 实体卡工坊</span>
        </LuxuryButton>
        <LuxuryButton
          onClick={onExportFullReport}
          disabled={isExportingFull}
          variant="secondary"
          size="sm"
          className="text-xs h-8 px-2.5 rounded-lg"
        >
          <Download size={13} strokeWidth={1.75} />
          <span>{isExportingFull ? '生成中...' : '保存长图'}</span>
        </LuxuryButton>
        <LuxuryButton
          onClick={onOpenFullscreen}
          variant="secondary"
          size="sm"
          className="text-xs h-8 px-2.5 rounded-lg"
        >
          <Maximize2 size={13} strokeWidth={1.75} stroke={accentColor} />
          <span>全屏阅读</span>
        </LuxuryButton>
      </div>
    </div>
  );
};

