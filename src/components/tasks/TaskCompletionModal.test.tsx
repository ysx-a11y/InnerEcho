// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskCompletionModal } from './TaskCompletionModal';

vi.mock('../MediaUploader', () => ({
  MediaUploader: () => <div>媒体上传区域</div>,
}));

const task = {
  id: 'task-1',
  title: '观察情绪',
  description: '记录今天最明显的一次情绪变化',
  category: 'subconscious' as const,
  status: 'accepted' as const,
  activeTaskInstance: { id: 'instance-1', acceptedAt: '2026-08-13T08:00:00Z' },
};

const level = { label: 'L1 · 日常', color: '#ff70a6' };
const category = {
  label: '日常',
  color: 'rgba(255, 112, 166, 0.05)',
  border: 'rgba(255, 112, 166, 0.15)',
  textColor: '#ff70a6',
  icon: <span aria-hidden="true">◇</span>,
};

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('TaskCompletionModal accessibility', () => {
  it('exposes dialog semantics, focuses the form, and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <TaskCompletionModal
        task={task}
        text=""
        attachments={[]}
        error={null}
        submitting={false}
        level={level}
        category={category}
        onTextChange={() => {}}
        onAttachmentsChange={() => {}}
        onClose={onClose}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '观察情绪' });
    const textarea = screen.getByLabelText('成果记录（写下文字，可配合录音/上传）：');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(textarea);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard focus inside and restores focus and scrolling on unmount', () => {
    const previousFocus = document.createElement('button');
    previousFocus.textContent = '打开任务提交';
    document.body.appendChild(previousFocus);
    previousFocus.focus();
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <TaskCompletionModal
        task={task}
        text=""
        attachments={[]}
        error={null}
        submitting={false}
        level={level}
        category={category}
        onTextChange={() => {}}
        onAttachmentsChange={() => {}}
        onClose={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getByRole('button', { name: '关闭任务提交窗口' });
    const submitButton = screen.getByRole('button', { name: '提交任务' });

    submitButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(submitButton);

    unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.activeElement).toBe(previousFocus);
    previousFocus.remove();
  });

  it('renders requireAudio badge when task requires audio recording', () => {
    const audioTask = { ...task, requireAudio: true };
    render(
      <TaskCompletionModal
        task={audioTask}
        text=""
        attachments={[]}
        error={null}
        submitting={false}
        level={level}
        category={category}
        onTextChange={() => {}}
        onAttachmentsChange={() => {}}
        onClose={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    expect(screen.getByText('🎙️ 必录语音成果')).toBeTruthy();
    expect(screen.getByText('⚠️ 需录制语音')).toBeTruthy();
  });

  it('triggers onAbandon callback when user clicks abandon button', () => {
    const onAbandon = vi.fn();
    render(
      <TaskCompletionModal
        task={task}
        text=""
        attachments={[]}
        error={null}
        submitting={false}
        level={level}
        category={category}
        onTextChange={() => {}}
        onAttachmentsChange={() => {}}
        onClose={() => {}}
        onSubmit={(event) => event.preventDefault()}
        onAbandon={onAbandon}
      />,
    );

    const abandonButton = screen.getByRole('button', { name: '放弃任务' });
    fireEvent.click(abandonButton);
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });
});
