import React, { useState } from 'react';
import { Modal, Select, TextInput, Button, Group, Text, Alert, Paper, Code } from '@mantine/core';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import type { PromptVersionContract } from '../../adminTypes';
import { formatTime } from '../../adminApi';

interface PromptRollbackModalProps {
  opened: boolean;
  templateName: string;
  versions: PromptVersionContract[];
  currentVersionId: string | null;
  onClose: () => void;
  onRollback: (data: { targetVersionId: string; adminNotes: string; remark: string }) => Promise<void>;
}

export const PromptRollbackModal: React.FC<PromptRollbackModalProps> = ({
  opened,
  templateName,
  versions,
  currentVersionId,
  onClose,
  onRollback,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;

  const versionOptions = versions.map((v) => ({
    value: v.id,
    label: `v${v.versionNum} · ${v.changeSummary || '未记录改动'} (${formatTime(v.createdAt)})${
      v.id === currentVersionId ? ' [当前生效]' : ''
    }`,
  }));

  const handleConfirm = async () => {
    if (!selectedVersionId) {
      setError('请选择要回滚到的目标版本');
      return;
    }
    if (selectedVersionId === currentVersionId) {
      setError('目标版本已经是当前生效版本，无需回滚');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onRollback({
        targetVersionId: selectedVersionId,
        adminNotes: adminNotes.trim(),
        remark: remark.trim() || '版本回滚操作',
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '回滚执行失败');
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
          <RotateCcw size={18} color="#eab308" />
          <Text fw={700}>版本瞬时回滚 · {templateName}</Text>
        </Group>
      }
      centered
      size="lg"
    >
      <Text size="sm" c="dimmed" mb="md">
        选择历史快照版本。确认回滚后，系统将瞬时切换当前生效提示词为该快照内容，无需停机或重新发版。
      </Text>

      {error && (
        <Alert icon={<AlertTriangle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <Select
        label="选择目标历史版本"
        placeholder="选择要回滚的版本快照"
        data={versionOptions}
        value={selectedVersionId}
        onChange={setSelectedVersionId}
        required
        mb="md"
      />

      {selectedVersion && (
        <Paper p="sm" withBorder mb="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <Text size="xs" fw={700} c="pink" mb={4}>
            快照详情预览 (v{selectedVersion.versionNum})：
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            提交人: {selectedVersion.createdBy} | 时间: {formatTime(selectedVersion.createdAt)}
          </Text>
          <Text size="xs" mb="xs">
            <strong>改动说明:</strong> {selectedVersion.changeSummary}
          </Text>
          <Code block style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '11px' }}>
            {selectedVersion.systemPrompt.slice(0, 300)}...
          </Code>
        </Paper>
      )}

      <TextInput
        label="回滚原因备忘 (Admin Notes)"
        placeholder="如：因线上v3版本个别字段格式异常，临时回滚至v2"
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.currentTarget.value)}
        mb="lg"
      />

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          color="yellow"
          onClick={handleConfirm}
          loading={loading}
          disabled={!selectedVersionId || selectedVersionId === currentVersionId}
        >
          确认回滚至该版本
        </Button>
      </Group>
    </Modal>
  );
};

