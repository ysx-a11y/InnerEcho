import React from 'react';
import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { Plus } from 'lucide-react';
import type { PromptVariableContract } from '../../adminTypes';

interface PromptVariableBarProps {
  variables: PromptVariableContract[];
  onSelectVariable: (placeholder: string) => void;
}

const NS_COLOR: Record<string, string> = {
  user: 'pink',
  dossier: 'violet',
  pace: 'orange',
  interrogate: 'red',
};

export const PromptVariableBar: React.FC<PromptVariableBarProps> = ({
  variables,
  onSelectVariable,
}) => {
  if (variables.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed" fw={600}>
          动态变量芯片 (点击直接插入到当前光标处)
        </Text>
        <Text size="xs" c="dimmed">
          包含防注入护栏，运行时自动隔离
        </Text>
      </Group>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          maxHeight: '130px',
          overflowY: 'auto',
          padding: '0.4rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {variables.map((v) => (
          <Tooltip
            key={v.id}
            label={`${v.label}：${v.description || '无详细说明'} (示例: ${v.mockValue})`}
            position="top"
            withArrow
          >
            <Badge
              variant="outline"
              color={NS_COLOR[v.namespace] || 'blue'}
              size="sm"
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                textTransform: 'none',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onClick={() => onSelectVariable(`{{${v.variableKey}}}`)}
            >
              <Plus size={10} />
              {`{{${v.variableKey}}}`}
            </Badge>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

