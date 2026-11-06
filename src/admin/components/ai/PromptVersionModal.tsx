import React, { useState } from 'react';
import { Modal, Textarea, TextInput, Button, Group, Text, Alert } from '@mantine/core';
import { Sparkles, AlertCircle } from 'lucide-react';

interface PromptVersionModalProps {
  opened: boolean;
  templateName: string;
  onClose: () => void;
  onSubmit: (data: { changeSummary: string; remark: string; adminNotes: string }) => Promise<void>;
}

export const PromptVersionModal: React.FC<PromptVersionModalProps> = ({
  opened,
  templateName,
  onClose,
  onSubmit,
}) => {
  const [changeSummary, setChangeSummary] = useState('');
  const [remark, setRemark] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!changeSummary.trim()) {
      setError('请简要填写本次版本的变更摘要（例如：微调文学共鸣关键词、强化表里反差）');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        changeSummary: changeSummary.trim(),
        remark: remark.trim(),
        adminNotes: adminNotes.trim(),
      });
      setChangeSummary('');
      setRemark('');
      setAdminNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存快照失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Sparkles size={18} color="#ff70a6" />
          <Text fw={700}>固化保存为新版本快照 · {templateName}</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Text size="sm" c="dimmed" mb="md">
        新版本将以不可变快照的形式存盘并分配递增版本号。历史版本将完整保留，随时支持一键比对与回滚。
      </Text>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <TextInput
        label="本次版本改动摘要 (必填)"
        placeholder="如：强化主审官对第14题停留微信号的洞察逼问"
        required
        value={changeSummary}
        onChange={(e) => setChangeSummary(e.currentTarget.value)}
        mb="sm"
      />

      <TextInput
        label="业务备注 (Remark)"
        placeholder="如：根据2026年11月用户自白反馈调整"
        value={remark}
        onChange={(e) => setRemark(e.currentTarget.value)}
        mb="sm"
      />

      <Textarea
        label="管理员运营备忘 (Admin Notes)"
        placeholder="技术备忘或回滚参考说明..."
        minRows={2}
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.currentTarget.value)}
        mb="lg"
      />

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button
          color="pink"
          onClick={handleSave}
          loading={saving}
        >
          确认升版快照
        </Button>
      </Group>
    </Modal>
  );
};

