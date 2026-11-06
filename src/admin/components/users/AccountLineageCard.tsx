import React, { useState } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Select,
  Switch,
  Textarea,
  TextInput,
  Box,
  Divider,
} from '@mantine/core';
import { GitBranch, Shield, ShieldAlert, Check, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import type { AccountLineageSummary } from '../../adminTypes';
import { lineageApi, formatTime } from '../../adminApi';
import { DictBadge } from '../ui/DictBadge';
import { adminNotify } from '../ui/adminNotify';

interface LineageGenerationItem {
  id: string;
  email: string;
  generation: number;
  accountStatus: string;
  createdAt: string;
  deletedAt: string | null;
  adminNotes: string | null;
  remark: string | null;
}

interface AccountLineageCardProps {
  currentUserId: string;
  lineage: AccountLineageSummary | null;
  generations: LineageGenerationItem[];
  onLineageUpdated?: (updated: AccountLineageSummary) => void;
}

const RISK_LEVEL_OPTIONS = [
  { value: 'normal', label: '正常 (Normal)' },
  { value: 'low', label: '低风控 (Low)' },
  { value: 'medium', label: '中风控 (Medium)' },
  { value: 'high', label: '高危风控 (High)' },
  { value: 'blocked', label: '全域封禁 (Blocked)' },
];

export const AccountLineageCard: React.FC<AccountLineageCardProps> = ({
  currentUserId,
  lineage,
  generations,
  onLineageUpdated,
}) => {
  if (!lineage) {
    return (
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          background: 'rgba(25, 20, 35, 0.5)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <Group gap="xs" c="dimmed">
          <GitBranch size={16} />
          <Text size="xs">该用户暂无关联的根账号血缘记录（独立匿名或未初始化）</Text>
        </Group>
      </Paper>
    );
  }

  const [riskLevel, setRiskLevel] = useState(lineage.riskLevel || 'normal');
  const [isBlocked, setIsBlocked] = useState(lineage.isBlocked === 1);
  const [adminNotes, setAdminNotes] = useState(lineage.adminNotes || '');
  const [remark, setRemark] = useState(lineage.remark || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRisk = async () => {
    setIsSaving(true);
    try {
      const res = await lineageApi.updateRisk(lineage.id, {
        riskLevel,
        isBlocked: isBlocked ? 1 : 0,
        adminNotes: adminNotes.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      if (res.success && res.lineage) {
        onLineageUpdated?.(res.lineage);
        adminNotify.success('账号血缘风控配置与运营批注已保存');
      }
    } catch (err: any) {
      adminNotify.error(err?.message || '更新血缘风控失败');
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskBadgeColor = (lvl: string) => {
    switch (lvl) {
      case 'normal':
        return 'teal';
      case 'low':
        return 'blue';
      case 'medium':
        return 'yellow';
      case 'high':
      case 'blocked':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{
        background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
        borderColor: isBlocked ? 'rgba(255, 77, 77, 0.4)' : 'rgba(255, 112, 166, 0.25)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Stack gap="sm">
        {/* 头部标题与血缘概览 */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <GitBranch size={16} color="#ff70a6" />
            <Text fw={700} size="sm" c="#fff">
              账号根血缘与世代族谱 (Account Lineage)
            </Text>
            <Badge size="xs" color={getRiskBadgeColor(riskLevel)} variant="light">
              风控: {riskLevel.toUpperCase()}
            </Badge>
            {isBlocked && (
              <Badge size="xs" color="red" variant="filled" leftSection={<ShieldAlert size={10} />}>
                根血缘已硬封禁
              </Badge>
            )}
          </Group>

          <Text size="xs" c="dimmed" ff="monospace">
            ID: {lineage.id}
          </Text>
        </Group>

        <Group gap="xl" wrap="wrap" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
          <div>
            <Text span c="dimmed">根凭据 (Root Key): </Text>
            <Text span fw={600} c="#80f3ff">{lineage.rootKey}</Text>
          </div>
          <div>
            <Text span c="dimmed">历经总世代数: </Text>
            <Text span fw={700} c="#ffb347">{lineage.totalGenerations} 代</Text>
          </div>
          <div>
            <Text span c="dimmed">首次创世时间: </Text>
            <Text span c="#fff">{formatTime(lineage.firstRegisteredAt)}</Text>
          </div>
          <div>
            <Text span c="dimmed">跨世代最后活跃: </Text>
            <Text span c="#fff">{formatTime(lineage.lastActiveAt)}</Text>
          </div>
        </Group>

        <Divider my={4} color="rgba(255, 255, 255, 0.08)" />

        {/* 跨世代族谱时间轴 */}
        <Box>
          <Text size="xs" fw={700} c="#ff70a6" mb={6}>
            世代重生脉络 ({generations.length} 世代)
          </Text>
          <Stack gap={6}>
            {generations.map((gen) => {
              const isCurrent = gen.id === currentUserId;
              return (
                <Paper
                  key={gen.id}
                  p="xs"
                  radius="sm"
                  withBorder
                  style={{
                    background: isCurrent ? 'rgba(255, 112, 166, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isCurrent ? 'rgba(255, 112, 166, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="xs">
                      <Badge size="xs" variant={isCurrent ? 'filled' : 'outline'} color={isCurrent ? 'pink' : 'gray'}>
                        第 {gen.generation} 代 {isCurrent ? '（当前查看）' : ''}
                      </Badge>
                      <DictBadge dictCode="user_account_status" value={gen.accountStatus} size="xs" />
                      <Text size="xs" c="#fff" ff="monospace">
                        ID: {gen.id}
                      </Text>
                    </Group>

                    <Group gap="md" style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                      <span>注册: {formatTime(gen.createdAt)}</span>
                      {gen.deletedAt && <span style={{ color: '#f07178' }}>注销: {formatTime(gen.deletedAt)}</span>}
                    </Group>
                  </Group>

                  {(gen.adminNotes || gen.remark) && (
                    <Text size="xs" c="dimmed" mt={4} pl={4} style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.15)' }}>
                      {gen.adminNotes ? `[批注] ${gen.adminNotes} ` : ''}
                      {gen.remark ? `[备注] ${gen.remark}` : ''}
                    </Text>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Box>

        <Divider my={4} color="rgba(255, 255, 255, 0.08)" />

        {/* 风控调控与运营批注编辑 */}
        <Group align="flex-start" grow wrap="wrap">
          <Stack gap="xs" style={{ minWidth: 200 }}>
            <Select
              label="全域风控等级"
              description="调控该血缘跨世代的风控评估等级"
              data={RISK_LEVEL_OPTIONS}
              value={riskLevel}
              onChange={(val) => setRiskLevel(val || 'normal')}
              size="xs"
            />

            <Switch
              label="根血缘硬封禁 (is_blocked)"
              description="封禁后，该邮箱所有世代（已注销、活跃或未来再注册）均被强制阻断"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.currentTarget.checked)}
              color="red"
              size="xs"
              mt={6}
            />
          </Stack>

          <Stack gap="xs" style={{ minWidth: 280 }}>
            <Textarea
              label="血缘私密运营批注 (admin_notes)"
              description="仅管理后台内部可见的风控与运营留痕记录"
              placeholder="例如：多次注销重建账号，存在异常刷题特征，保持密切风控关注。"
              minRows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              size="xs"
            />
            <TextInput
              label="业务备注 (remark)"
              placeholder="系统业务备忘"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              size="xs"
            />
          </Stack>
        </Group>

        <Group justify="flex-end" mt="xs">
          <Button
            size="xs"
            color="pink"
            onClick={handleSaveRisk}
            loading={isSaving}
            leftSection={<Check size={12} />}
          >
            保存血缘风控与批注
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

