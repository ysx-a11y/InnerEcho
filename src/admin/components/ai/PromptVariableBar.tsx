import React from 'react';
import { Plus, Braces } from 'lucide-react';
import type { PromptVariableContract } from '../../adminTypes';
import { Badge } from '../ui/badge';

interface PromptVariableBarProps {
  variables: PromptVariableContract[];
  onSelectVariable: (placeholder: string) => void;
}

export const PromptVariableBar: React.FC<PromptVariableBarProps> = ({
  variables,
  onSelectVariable,
}) => {
  if (variables.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-muted/20 border border-border/60 overflow-hidden text-xs">
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground shrink-0 pr-1.5 border-r border-border/60">
        <Braces className="size-3 text-primary" />
        <span>插桩变量</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
        {variables.map((v) => (
          <Badge
            key={v.id}
            variant="outline"
            className="cursor-pointer select-none font-mono text-[10px] gap-0.5 h-5 px-1.5 hover:bg-primary/10 hover:border-primary transition-all text-foreground shrink-0 bg-background"
            onClick={() => onSelectVariable(`{{${v.variableKey}}}`)}
            title={`${v.label}：${v.description || '无说明'} (示例: ${v.mockValue})`}
          >
            <Plus className="size-2 text-primary" />
            <span>{`{{${v.variableKey}}}`}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};
