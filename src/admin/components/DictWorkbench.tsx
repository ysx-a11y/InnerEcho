import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Table,
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  ActionIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  Sliders,
  Database,
  ArrowRight,
  Plus,
  Edit2,
  CheckCircle2,
  Shield,
  Layers,
  BookOpen,
  RefreshCw,
  GitFork,
} from 'lucide-react';
import type { SysDictType, SysDictItem, SysStateTransition } from '../adminTypes';
import { dictApi } from '../adminApi';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';
import { DictBadge } from './ui/DictBadge';
import { adminNotify } from './ui/adminNotify';

const BADGE_COLOR_OPTIONS = [
  { value: 'teal', label: '青翠绿 (teal)' },
  { value: 'blue', label: '天空蓝 (blue)' },
  { value: 'yellow', label: '琥珀黄 (yellow)' },
  { value: 'red', label: '警示红 (red)' },
  { value: 'pink', label: '深魅粉 (pink)' },
  { value: 'violet', label: '幽邃紫 (violet)' },
  { value: 'indigo', label: '沉稳靛 (indigo)' },
  { value: 'gray', label: '素雅灰 (gray)' },
];

const BADGE_VARIANT_OPTIONS = [
  { value: 'light', label: '轻盈浅底 (light)' },
  { value: 'filled', label: '实心强调 (filled)' },
  { value: 'outline', label: '边框极简 (outline)' },
];

export const DictWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('items');
  const [types, setTypes] = useState<SysDictType[]>([]);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('user_account_status');
  const [items, setItems] = useState<SysDictItem[]>([]);
  const [transitions, setTransitions] = useState<SysStateTransition[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit / Add Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<{
    value: string;
    label: string;
    badgeColor: string;
    badgeVariant: string;
    sortOrder: number;
    isDefault: number;
    isActive: number;
    remark: string;
  }>({
    value: '',
    label: '',
    badgeColor: 'teal',
    badgeVariant: 'light',
    sortOrder: 10,
    isDefault: 0,
    isActive: 1,
    remark: '',
  });

  // Edit / Add Transition Modal State
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionEditing, setTransitionEditing] = useState<{
    fromValue: string;
    toValue: string;
    actionName: string;
    requiredRole: 'user' | 'admin' | 'system';
    remark: string;
  }>({
    fromValue: '',
    toValue: '',
    actionName: '',
    requiredRole: 'admin',
    remark: '',
  });

  const loadTypes = useCallback(async () => {
    try {
      const res = await dictApi.listTypes();
      if (res.success && res.types.length > 0) {
        setTypes(res.types);
        if (!selectedTypeCode || !res.types.some((t) => t.code === selectedTypeCode)) {
          setSelectedTypeCode(res.types[0].code);
        }
      }
    } catch {
      adminNotify.error('加载字典大类失败');
    }
  }, [selectedTypeCode]);

  const loadData = useCallback(async () => {
    if (!selectedTypeCode) return;
    setLoading(true);
    try {
      const [itemsRes, transRes] = await Promise.all([
        dictApi.listItems(selectedTypeCode, true),
        dictApi.listTransitions(selectedTypeCode),
      ]);
      if (itemsRes.success) setItems(itemsRes.items);
      if (transRes.success) setTransitions(transRes.transitions);
    } catch {
      adminNotify.error('加载字典数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedTypeCode]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveItem = async () => {
    if (!itemEditing.value.trim() || !itemEditing.label.trim()) {
      adminNotify.error('枚举值和中文标签不能为空');
      return;
    }
    try {
      const res = await dictApi.upsertItem({
        typeCode: selectedTypeCode,
        value: itemEditing.value.trim(),
        label: itemEditing.label.trim(),
        badgeColor: itemEditing.badgeColor,
        badgeVariant: itemEditing.badgeVariant,
        sortOrder: itemEditing.sortOrder,
        isDefault: itemEditing.isDefault,
        isActive: itemEditing.isActive,
        remark: itemEditing.remark.trim() || undefined,
      });
      if (res.success) {
        adminNotify.success(`字典项「${res.item.label}」已保存生效`);
        setItemModalOpen(false);
        void loadData();
      }
    } catch (err: any) {
      adminNotify.error(err?.message || '保存字典项失败');
    }
  };

  const handleSaveTransition = async () => {
    if (!transitionEditing.fromValue || !transitionEditing.toValue || !transitionEditing.actionName.trim()) {
      adminNotify.error('流转源状态、目标状态与动作名不能为空');
      return;
    }
    try {
      const res = await dictApi.upsertTransition({
        typeCode: selectedTypeCode,
        fromValue: transitionEditing.fromValue,
        toValue: transitionEditing.toValue,
        actionName: transitionEditing.actionName.trim(),
        requiredRole: transitionEditing.requiredRole,
        isAllowed: 1,
        remark: transitionEditing.remark.trim() || undefined,
      });
      if (res.success) {
        adminNotify.success(`状态机动作「${res.transition.actionName}」已配置生效`);
        setTransitionModalOpen(false);
        void loadData();
      }
    } catch (err: any) {
      adminNotify.error(err?.message || '配置状态机流转失败');
    }
  };

  const currentType = types.find((t) => t.code === selectedTypeCode);

  return (
    <AdminWorkbenchShell
      title="系统数据字典与动态状态机引擎"
      description="统一管理全域业务枚举、渲染色彩徽章与有限状态机合法转移规则矩阵，彻底告别硬编码"
      icon={<Sliders size={22} color="#80f3ff" />}
      loading={loading}
      onRefresh={loadData}
    >
      {/* 字典大类切换胶囊栏 */}
      <Paper
        p="sm"
        radius="lg"
        withBorder
        style={{
          background: 'rgba(28, 14, 38, 0.75)',
          borderColor: 'rgba(255, 112, 166, 0.2)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="wrap">
            {types.map((t) => {
              const isSelected = t.code === selectedTypeCode;
              return (
                <Button
                  key={t.code}
                  size="xs"
                  variant={isSelected ? 'filled' : 'subtle'}
                  color={isSelected ? 'pink' : 'gray'}
                  radius="md"
                  onClick={() => setSelectedTypeCode(t.code)}
                  leftSection={<Database size={13} />}
                >
                  {t.name} ({t.code})
                </Button>
              );
            })}
          </Group>
        </Group>

        {currentType && (
          <Group gap="md" mt="xs" style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
            <Text size="xs" c="dimmed">
              业务定位：<Text span c="#80f3ff">{currentType.description || '无说明'}</Text>
            </Text>
            <Text size="xs" c="dimmed">
              系统备注：<Text span c="#ffd180">{currentType.remark || '无备注'}</Text>
            </Text>
          </Group>
        )}
      </Paper>

      {/* 主面板：字典项 & 状态机切换 */}
      <Tabs value={activeTab} onChange={setActiveTab} color="pink" variant="pills">
        <Tabs.List mb="md">
          <Tabs.Tab value="items" leftSection={<Layers size={14} />}>
            字典枚举与色彩徽章 ({items.length})
          </Tabs.Tab>
          <Tabs.Tab value="transitions" leftSection={<GitFork size={14} />}>
            有限状态机规则矩阵 ({transitions.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: 字典项列表 */}
        <Tabs.Panel value="items">
          <Paper
            p="md"
            radius="lg"
            withBorder
            style={{
              background: 'rgba(28, 14, 38, 0.7)',
              borderColor: 'rgba(255, 112, 166, 0.2)',
            }}
          >
            <Group justify="space-between" align="center" mb="md">
              <Text fw={700} size="sm" c="#fff">
                「{currentType?.name || selectedTypeCode}」包含的枚举项
              </Text>
              <Button
                size="xs"
                color="pink"
                leftSection={<Plus size={13} />}
                onClick={() => {
                  setItemEditing({
                    value: '',
                    label: '',
                    badgeColor: 'teal',
                    badgeVariant: 'light',
                    sortOrder: (items.length + 1) * 10,
                    isDefault: 0,
                    isActive: 1,
                    remark: '',
                  });
                  setItemModalOpen(true);
                }}
              >
                新增字典枚举项
              </Button>
            </Group>

            <Table verticalSpacing="sm" style={{ fontSize: '0.78rem' }}>
              <Table.Thead>
                <Table.Tr style={{ color: 'var(--admin-text-muted)' }}>
                  <Table.Th style={{ width: 80 }}>排序</Table.Th>
                  <Table.Th style={{ width: 140 }}>枚举值 (value)</Table.Th>
                  <Table.Th style={{ width: 140 }}>中文标签 (label)</Table.Th>
                  <Table.Th style={{ width: 130 }}>渲染徽章效果</Table.Th>
                  <Table.Th style={{ width: 100 }}>启用状态</Table.Th>
                  <Table.Th>业务说明与适用场景 (remark)</Table.Th>
                  <Table.Th style={{ width: 80, textAlign: 'right' }}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ fontFamily: 'monospace', color: '#ffb347' }}>
                      {item.sortOrder}
                    </Table.Td>
                    <Table.Td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#80f3ff' }}>
                      {item.value}
                    </Table.Td>
                    <Table.Td style={{ fontWeight: 600, color: '#fff' }}>
                      {item.label}
                    </Table.Td>
                    <Table.Td>
                      <DictBadge dictCode={item.typeCode} value={item.value} size="sm" />
                    </Table.Td>
                    <Table.Td>
                      {item.isActive ? (
                        <Badge size="xs" color="teal" variant="light">
                          启用中
                        </Badge>
                      ) : (
                        <Badge size="xs" color="gray" variant="outline">
                          已禁用
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td style={{ color: 'var(--admin-text-muted)' }}>
                      {item.remark || '无'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="pink"
                        onClick={() => {
                          setItemEditing({
                            value: item.value,
                            label: item.label,
                            badgeColor: item.badgeColor,
                            badgeVariant: item.badgeVariant,
                            sortOrder: item.sortOrder,
                            isDefault: item.isDefault,
                            isActive: item.isActive,
                            remark: item.remark || '',
                          });
                          setItemModalOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tab 2: 状态机流转规则矩阵 */}
        <Tabs.Panel value="transitions">
          <Paper
            p="md"
            radius="lg"
            withBorder
            style={{
              background: 'rgba(28, 14, 38, 0.7)',
              borderColor: 'rgba(255, 112, 166, 0.2)',
            }}
          >
            <Group justify="space-between" align="center" mb="md">
              <Text fw={700} size="sm" c="#fff">
                「{currentType?.name}」合法流转路径定义
              </Text>
              <Button
                size="xs"
                color="pink"
                leftSection={<Plus size={13} />}
                onClick={() => {
                  setTransitionEditing({
                    fromValue: items[0]?.value || '',
                    toValue: items[1]?.value || '',
                    actionName: '',
                    requiredRole: 'admin',
                    remark: '',
                  });
                  setTransitionModalOpen(true);
                }}
              >
                新增流转规则
              </Button>
            </Group>

            {transitions.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="xl">
                该字典大类尚未配置状态流转规则或非状态流实体。
              </Text>
            ) : (
              <Table verticalSpacing="sm" style={{ fontSize: '0.78rem' }}>
                <Table.Thead>
                  <Table.Tr style={{ color: 'var(--admin-text-muted)' }}>
                    <Table.Th style={{ width: 140 }}>当前状态 (from)</Table.Th>
                    <Table.Th style={{ width: 120 }}>流转动作 (action)</Table.Th>
                    <Table.Th style={{ width: 140 }}>目标状态 (to)</Table.Th>
                    <Table.Th style={{ width: 100 }}>所需权限</Table.Th>
                    <Table.Th style={{ width: 90 }}>阻断控制</Table.Th>
                    <Table.Th>业务前置约束与规则备注 (remark)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transitions.map((tr) => (
                    <Table.Tr key={tr.id}>
                      <Table.Td>
                        <DictBadge dictCode={tr.typeCode} value={tr.fromValue} size="sm" />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} c="#ff70a6">
                          <ArrowRight size={13} />
                          <Text fw={700} size="xs">
                            {tr.actionName}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <DictBadge dictCode={tr.typeCode} value={tr.toValue} size="sm" />
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" color="violet" variant="light">
                          {tr.requiredRole.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {tr.isAllowed ? (
                          <Badge size="xs" color="teal" variant="light">
                            允许流转
                          </Badge>
                        ) : (
                          <Badge size="xs" color="red" variant="filled">
                            已被阻断
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td style={{ color: 'var(--admin-text-muted)' }}>
                        {tr.remark || '无特定前置条件'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* 字典项编辑弹窗 */}
      <Modal
        opened={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={<Text fw={700}>编辑 / 新增字典项</Text>}
        centered
        radius="md"
      >
        <Stack gap="sm">
          <TextInput
            label="状态枚举值 (value, 英文唯一键)"
            placeholder="例如 active, pending, approved"
            value={itemEditing.value}
            onChange={(e) => setItemEditing({ ...itemEditing, value: e.target.value })}
            size="xs"
            required
          />
          <TextInput
            label="中文展示标签 (label)"
            placeholder="例如 正常活跃, 待审核"
            value={itemEditing.label}
            onChange={(e) => setItemEditing({ ...itemEditing, label: e.target.value })}
            size="xs"
            required
          />
          <Group grow>
            <Select
              label="Mantine 徽章配色"
              data={BADGE_COLOR_OPTIONS}
              value={itemEditing.badgeColor}
              onChange={(val) => setItemEditing({ ...itemEditing, badgeColor: val || 'teal' })}
              size="xs"
            />
            <Select
              label="徽章样式风格"
              data={BADGE_VARIANT_OPTIONS}
              value={itemEditing.badgeVariant}
              onChange={(val) => setItemEditing({ ...itemEditing, badgeVariant: val || 'light' })}
              size="xs"
            />
          </Group>
          <Group grow>
            <NumberInput
              label="排序权重 (越小越靠前)"
              value={itemEditing.sortOrder}
              onChange={(val) => setItemEditing({ ...itemEditing, sortOrder: Number(val) || 10 })}
              size="xs"
            />
            <Switch
              label="是否启用该项"
              checked={itemEditing.isActive === 1}
              onChange={(e) => setItemEditing({ ...itemEditing, isActive: e.currentTarget.checked ? 1 : 0 })}
              size="xs"
              mt={20}
            />
          </Group>
          <Textarea
            label="适用场景与业务含义备注 (remark)"
            placeholder="说明该状态在业务流程中的具体语义"
            value={itemEditing.remark}
            onChange={(e) => setItemEditing({ ...itemEditing, remark: e.target.value })}
            size="xs"
          />
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="default" size="xs" onClick={() => setItemModalOpen(false)}>
              取消
            </Button>
            <Button size="xs" color="pink" onClick={handleSaveItem}>
              保存字典项
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 状态流转编辑弹窗 */}
      <Modal
        opened={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        title={<Text fw={700}>配置状态机流转动作</Text>}
        centered
        radius="md"
      >
        <Stack gap="sm">
          <Group grow>
            <Select
              label="源状态 (from)"
              data={items.map((i) => ({ value: i.value, label: `${i.label} (${i.value})` }))}
              value={transitionEditing.fromValue}
              onChange={(val) => setTransitionEditing({ ...transitionEditing, fromValue: val || '' })}
              size="xs"
              required
            />
            <Select
              label="目标状态 (to)"
              data={items.map((i) => ({ value: i.value, label: `${i.label} (${i.value})` }))}
              value={transitionEditing.toValue}
              onChange={(val) => setTransitionEditing({ ...transitionEditing, toValue: val || '' })}
              size="xs"
              required
            />
          </Group>
          <TextInput
            label="动作名称 (actionName)"
            placeholder="例如 审核通过, 违规下架, 申诉公开"
            value={transitionEditing.actionName}
            onChange={(e) => setTransitionEditing({ ...transitionEditing, actionName: e.target.value })}
            size="xs"
            required
          />
          <Select
            label="触发权限角色 (requiredRole)"
            data={[
              { value: 'admin', label: '管理员权限 (admin)' },
              { value: 'user', label: '用户主动触发 (user)' },
              { value: 'system', label: '系统自动流转 (system)' },
            ]}
            value={transitionEditing.requiredRole}
            onChange={(val) => setTransitionEditing({ ...transitionEditing, requiredRole: (val as any) || 'admin' })}
            size="xs"
          />
          <Textarea
            label="流转约束与说明 (remark)"
            placeholder="例如 内容涉违规人工驳回，需记录批注"
            value={transitionEditing.remark}
            onChange={(e) => setTransitionEditing({ ...transitionEditing, remark: e.target.value })}
            size="xs"
          />
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="default" size="xs" onClick={() => setTransitionModalOpen(false)}>
              取消
            </Button>
            <Button size="xs" color="pink" onClick={handleSaveTransition}>
              保存流转规则
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminWorkbenchShell>
  );
};

