import React, { useState } from 'react';
import { Modal, Stack, Group, Text, Button, Textarea, TextInput, Box } from '@mantine/core';
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { DictBadge } from './DictBadge';

export interface StateTransitionModalProps {
  opened: boolean;
  onClose: () => void;
  dictCode: string;
  fromValue: string;
  toValue: string;
  actionName: string;
  title?: string;
  targetName?: string;
  onConfirm: (data: { adminNotes?: string; remark?: string }) => Promise<void> | void;
}

export const StateTransitionModal: React.FC<StateTransitionModalProps> = ({
  opened,
  onClose,
  dictCode,
  fromValue,
  toValue,
  actionName,
  title = '状态流转与审核核准',
  targetName,
  onConfirm,
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm({
        adminNotes: adminNotes.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      setAdminNotes('');
      setRemark('');
      onClose();
    } catch (err: any) {
      setError(err?.message || '状态流转失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ShieldCheck size={18} color="#ff70a6" />
          <Text fw={700} size="sm" c="#fff">
            {title}
          </Text>
        </Group>
      }
      centered
      radius="md"
      overlayProps={{ backgroundOpacity: 0.75, blur: 5 }}
      styles={{
        content: {
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.95) 0%, rgba(16, 8, 22, 0.98) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          color: '#fff',
        },
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      }}
    >
      <Stack gap="md" mt="xs">
        {targetName && (
          <Text size="xs" c="dimmed">
            目标对象：<Text span fw={600} c="#fff">{targetName}</Text>
          </Text>
        )}

        {/* 状态流转指示卡 */}
        <Box
          p="sm"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Group justify="center" align="center" gap="md">
            <div>
              <Text size="xs" c="dimmed" mb={4} ta="center">
                当前状态
              </Text>
              <DictBadge dictCode={dictCode} value={fromValue} size="md" />
            </div>

            <Group gap={4} c="#ff70a6">
              <ArrowRight size={18} />
              <Text size="xs" fw={700}>
                {actionName}
              </Text>
            </Group>

            <div>
              <Text size="xs" c="dimmed" mb={4} ta="center">
                目标状态
              </Text>
              <DictBadge dictCode={dictCode} value={toValue} size="md" />
            </div>
          </Group>
        </Box>

        {error && (
          <Group gap="xs" c="#f07178">
            <AlertCircle size={14} />
            <Text size="xs">{error}</Text>
          </Group>
        )}

        <Textarea
          label="管理员审核批注 (admin_notes)"
          description="记录本次人工审核原因、风控结论或整改意见（仅管理后台内部可见）"
          placeholder="例如：自白真实深刻，符合社区自白规范，予以通过。"
          minRows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          size="xs"
        />

        <TextInput
          label="业务备注 (remark)"
          description="系统或对外业务说明（可选）"
          placeholder="例如：人工初审"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          size="xs"
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" size="xs" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            size="xs"
            color="pink"
            onClick={handleConfirm}
            loading={loading}
          >
            确认执行流转
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

