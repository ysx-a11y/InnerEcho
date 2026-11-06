import React from 'react';
import { Button, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { RefreshCw } from 'lucide-react';

export interface AdminWorkbenchShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 标准化管理端工作台外壳组件（基于 Mantine）。
 * 
 * 统一各 Tab 页面的头部标题、操作按钮、刷新按钮以及主内容区结构，
 * 避免每个页面从零手写布局与标题样式。
 */
export const AdminWorkbenchShell: React.FC<AdminWorkbenchShellProps> = ({
  title,
  description,
  icon,
  loading = false,
  onRefresh,
  actions,
  children,
}) => {
  return (
    <Stack gap="lg" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* 统一页面头部 */}
      <Paper
        p="md"
        radius="lg"
        withBorder
        style={{
          background: 'rgba(25, 20, 35, 0.65)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            {icon && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(255, 112, 166, 0.12)',
                  color: '#ff70a6',
                }}
              >
                {icon}
              </div>
            )}
            <div>
              <Title order={3} style={{ fontSize: '1.25rem', color: '#f3edf7', fontWeight: 700 }}>
                {title}
              </Title>
              {description && (
                <Text size="xs" c="dimmed" mt={2}>
                  {description}
                </Text>
              )}
            </div>
          </Group>

          <Group gap="xs" align="center">
            {actions}
            {onRefresh && (
              <Button
                variant="default"
                size="xs"
                radius="md"
                onClick={() => void onRefresh()}
                disabled={loading}
                leftSection={
                  loading ? (
                    <Loader size={12} color="dimmed" />
                  ) : (
                    <RefreshCw size={13} />
                  )
                }
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}
              >
                刷新
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* 主体工作区 */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    </Stack>
  );
};

